-- 0015 Feedback, the job-ready path and the weekly content pipeline (9 Nov 2026)
-- Safe to re-run.

create extension if not exists pg_net with schema extensions;

-- =====================================================================
-- 1. Feedback on anything: a tournament, a drill, a battle, a path set or the site.
-- =====================================================================
create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  target_kind text not null check (target_kind in ('tournament', 'drill', 'battle', 'path', 'site')),
  target_id text check (char_length(target_id) <= 80),
  rating smallint check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  page text check (char_length(page) <= 80),
  created_at timestamptz not null default now(),
  check (rating is not null or coalesce(char_length(trim(comment)), 0) > 0)
);
alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;
create index if not exists feedback_created on public.feedback (created_at desc);
create index if not exists feedback_target on public.feedback (target_kind, target_id);

create or replace function public.send_feedback(p_kind text, p_target text, p_rating int, p_comment text, p_page text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c text := nullif(trim(coalesce(p_comment, '')), '');
begin
  if p_kind not in ('tournament', 'drill', 'battle', 'path', 'site') then raise exception 'unknown feedback type'; end if;
  if p_rating is not null and (p_rating < 1 or p_rating > 5) then raise exception 'rating must be 1 to 5'; end if;
  if p_rating is null and c is null then raise exception 'add a rating or a comment'; end if;
  if char_length(c) > 1000 then raise exception 'feedback is too long (1000 characters max)'; end if;
  if uid is null and p_kind <> 'site' then raise exception 'sign in to rate this'; end if;
  if uid is not null and (select count(*) from public.feedback f where f.user_id = uid and f.created_at > now() - interval '1 hour') >= 20 then
    raise exception 'too many messages — try again in an hour';
  end if;
  if (select count(*) from public.feedback f where f.created_at > now() - interval '1 hour') >= 2000 then
    raise exception 'feedback is busy — try again shortly';
  end if;
  insert into public.feedback (user_id, target_kind, target_id, rating, comment, page)
  values (uid, p_kind, left(p_target, 80), p_rating, c, left(p_page, 80));
end $$;
revoke all on function public.send_feedback(text, text, int, text, text) from public;
grant execute on function public.send_feedback(text, text, int, text, text) to anon, authenticated;

-- =====================================================================
-- 2. The job-ready path: pick a field and 3–12 months, climb 5 levels.
--    1 Foundation · 2 Core · 3 Applied · 4 Advanced · 5 Interview-ready (6 = completed)
-- =====================================================================
create table if not exists public.path_items (
  id bigint generated always as identity primary key,
  domain text not null check (domain in ('marketing', 'data', 'product', 'sales', 'ops', 'design', 'tech', 'hr', 'finance')),
  skill text not null,
  level smallint not null check (level between 1 and 5),
  kind text not null check (kind in ('mcq', 'interview')),
  prompt text not null,
  context text,
  table_data jsonb,
  options jsonb,
  correct int,
  explanation text,
  model_answer text,
  rubric jsonb,          -- ["Uses a STAR structure", ...]
  key_points jsonb,      -- [{"label": "Mentions a metric", "words": ["metric", "kpi", "%"]}, ...]
  source text not null default 'generated',
  batch_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check ((kind = 'mcq' and jsonb_typeof(options) = 'array' and correct is not null and correct >= 0 and correct < jsonb_array_length(options))
      or (kind = 'interview' and model_answer is not null))
);
alter table public.path_items enable row level security;
revoke all on public.path_items from anon, authenticated;
create index if not exists path_items_pick on public.path_items (domain, level) where active;

create table if not exists public.user_paths (
  user_id uuid primary key references auth.users (id) on delete cascade,
  field text not null check (field in ('marketing', 'data', 'product', 'sales', 'ops', 'design', 'tech', 'hr', 'finance')),
  months smallint not null check (months between 3 and 12),
  started_at date not null default (now() at time zone 'Asia/Kolkata')::date,
  level smallint not null default 1 check (level between 1 and 6),
  level_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_paths enable row level security;
revoke all on public.user_paths from anon, authenticated;
grant select on public.user_paths to authenticated;
drop policy if exists "read own path" on public.user_paths;
create policy "read own path" on public.user_paths for select to authenticated using (user_id = (select auth.uid()) and (select public.aal_ok()));

create table if not exists public.path_attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id bigint not null references public.path_items (id) on delete cascade,
  level smallint not null,
  kind text not null,
  correct boolean,
  self_score smallint check (self_score between 0 and 4),
  answer_text text check (char_length(answer_text) <= 4000),
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
alter table public.path_attempts enable row level security;
revoke all on public.path_attempts from anon, authenticated;
create index if not exists path_attempts_user_level on public.path_attempts (user_id, level, created_at desc);

-- Starter pool: the battle bank becomes "Core" practice until the weekly job fills every level.
insert into public.path_items (domain, skill, level, kind, prompt, context, options, correct, source)
select b.domain, b.skill, 2, 'mcq', b.prompt, b.context, b.options, b.correct, 'bank:' || b.id
  from public.bank_questions b
 where b.active and b.pack is null and b.domain in ('marketing', 'data', 'product', 'sales', 'ops', 'design', 'tech', 'hr', 'finance')
   and not exists (select 1 from public.path_items p where p.source = 'bank:' || b.id);

-- Rules for leaving a level (shown to the student on the path page).
create or replace function public._path_rules(p_level int)
returns table (min_mcq int, min_acc numeric, min_interview int)
language sql immutable as $$
  select case when p_level <= 2 then 15 when p_level <= 4 then 12 else 8 end,
         0.8::numeric,
         case when p_level <= 2 then 0 when p_level = 3 then 1 else 2 end;
$$;

create or replace function public._path_progress(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare p public.user_paths; r record; mcq_done int; acc numeric; iv_ok int; left_mcq int; left_iv int;
        weeks int; week_no int; per_level numeric; expected int; done_week int;
begin
  select * into p from public.user_paths where user_id = p_user;
  if not found then return null; end if;
  select * into r from public._path_rules(least(p.level, 5));
  select count(*) into mcq_done from public.path_attempts a where a.user_id = p_user and a.level = p.level and a.kind = 'mcq';
  select coalesce(avg(case when x.correct then 1.0 else 0 end), 0) into acc
    from (select a.correct from public.path_attempts a where a.user_id = p_user and a.level = p.level and a.kind = 'mcq'
          order by a.created_at desc limit 20) x;
  select count(*) into iv_ok from public.path_attempts a where a.user_id = p_user and a.level = p.level and a.kind = 'interview' and a.self_score >= 3;
  select count(*) filter (where i.kind = 'mcq'), count(*) filter (where i.kind = 'interview') into left_mcq, left_iv
    from public.path_items i where i.active and i.domain = p.field and i.level = p.level
     and not exists (select 1 from public.path_attempts a where a.user_id = p_user and a.item_id = i.id);
  weeks := greatest(4, round(p.months * 52.0 / 12));
  week_no := least(weeks, greatest(1, ((now() at time zone 'Asia/Kolkata')::date - p.started_at) / 7 + 1));
  per_level := weeks / 5.0;
  expected := least(5, 1 + floor((week_no - 1) / per_level)::int);
  select count(*) into done_week from public.path_attempts a
   where a.user_id = p_user and a.created_at >= date_trunc('week', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
  return jsonb_build_object(
    'field', p.field, 'months', p.months, 'started_at', p.started_at, 'level', p.level,
    'weeks', weeks, 'week', week_no, 'expected_level', expected,
    'status', case when p.level >= 6 then 'done' when p.level > expected then 'ahead' when p.level = expected then 'on_track' else 'behind' end,
    'weekly_target', ceil((r.min_mcq + r.min_interview * 2) / greatest(per_level, 1))::int + case when p.level < expected then 10 else 0 end,
    'done_this_week', done_week,
    'mcq_done', mcq_done, 'mcq_needed', r.min_mcq, 'accuracy', round(acc * 100), 'accuracy_needed', round(r.min_acc * 100),
    'interview_ok', iv_ok, 'interview_needed', r.min_interview,
    'left_mcq', left_mcq, 'left_interview', left_iv);
end $$;
revoke all on function public._path_progress(uuid) from public, anon, authenticated;

create or replace function public._path_maybe_level_up(p_user uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare s jsonb;
begin
  s := public._path_progress(p_user);
  if s is null or (s->>'level')::int >= 6 then return false; end if;
  if (s->>'mcq_done')::int >= (s->>'mcq_needed')::int and (s->>'accuracy')::int >= (s->>'accuracy_needed')::int
     and (s->>'interview_ok')::int >= (s->>'interview_needed')::int then
    update public.user_paths set level = level + 1, level_started_at = now(), updated_at = now() where user_id = p_user;
    return true;
  end if;
  return false;
end $$;
revoke all on function public._path_maybe_level_up(uuid) from public, anon, authenticated;

create or replace function public.set_path(p_field text, p_months int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not public.aal_ok() then raise exception 'not signed in'; end if;
  if p_field not in ('marketing', 'data', 'product', 'sales', 'ops', 'design', 'tech', 'hr', 'finance') then raise exception 'pick a field'; end if;
  if p_months is null or p_months < 3 or p_months > 12 then raise exception 'pick 3 to 12 months'; end if;
  insert into public.user_paths (user_id, field, months) values (uid, p_field, p_months)
  on conflict (user_id) do update set
    months = excluded.months,
    started_at = case when public.user_paths.field <> excluded.field then excluded.started_at else public.user_paths.started_at end,
    level = case when public.user_paths.field <> excluded.field then 1 else public.user_paths.level end,
    level_started_at = case when public.user_paths.field <> excluded.field then now() else public.user_paths.level_started_at end,
    field = excluded.field, updated_at = now();
  return public._path_progress(uid);
end $$;
revoke all on function public.set_path(text, int) from public, anon;
grant execute on function public.set_path(text, int) to authenticated;

create or replace function public.path_state()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.aal_ok() then raise exception 'not signed in'; end if;
  return public._path_progress(auth.uid());
end $$;
revoke all on function public.path_state() from public, anon;
grant execute on function public.path_state() to authenticated;

-- A practice set at your level: new questions first, then ones you got wrong, then a lower level if the pool runs dry.
create or replace function public.path_next(p_count int default 10)
returns table (id bigint, kind text, skill text, level smallint, prompt text, context text, table_data jsonb, options jsonb, rubric jsonb)
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); p public.user_paths; lim int := least(greatest(coalesce(p_count, 10), 1), 20); iv int;
begin
  if uid is null or not public.aal_ok() then raise exception 'not signed in'; end if;
  select * into p from public.user_paths where user_id = uid;
  if not found then raise exception 'set your goal first'; end if;
  iv := case when p.level <= 2 then 1 when p.level <= 4 then 2 else 4 end;
  return query
  -- Until a level is stocked, borrow from the nearest stocked level above it.
  with lvl as (select greatest(least(p.level, 5), coalesce((select min(x.level) from public.path_items x where x.active and x.domain = p.field), 1))::smallint as l),
  pool as (
    select i.*, (a.item_id is null) as fresh, coalesce(a.correct, true) = false as missed,
           abs(i.level - (select l from lvl)) as dist
      from public.path_items i
      left join public.path_attempts a on a.user_id = uid and a.item_id = i.id
     where i.active and i.domain = p.field and i.level <= (select l from lvl)
       and (a.item_id is null or (a.kind = 'mcq' and a.correct = false and a.created_at < now() - interval '1 day'))
  ),
  ranked as (
    select pool.*, row_number() over (partition by pool.kind order by pool.dist, pool.fresh desc, random()) as rn from pool
  )
  select r.id, r.kind, r.skill, r.level, r.prompt, r.context, r.table_data, r.options, case when r.kind = 'interview' then r.rubric end
    from ranked r
   where (r.kind = 'interview' and r.rn <= iv) or (r.kind = 'mcq' and r.rn <= lim - least(iv, (select count(*) from pool where pool.kind = 'interview'))::int)
   order by r.kind = 'interview', random();
end $$;
revoke all on function public.path_next(int) from public, anon;
grant execute on function public.path_next(int) to authenticated;

create or replace function public.path_answer(p_item bigint, p_choice int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); i public.path_items; ok boolean; up boolean; lvl smallint;
begin
  if uid is null or not public.aal_ok() then raise exception 'not signed in'; end if;
  select * into i from public.path_items where id = p_item and active and kind = 'mcq';
  if not found then raise exception 'question not found'; end if;
  if not exists (select 1 from public.user_paths where user_id = uid and field = i.domain) then raise exception 'this question is not on your path'; end if;
  ok := p_choice = i.correct;
  select level into lvl from public.user_paths where user_id = uid;
  insert into public.path_attempts (user_id, item_id, level, kind, correct) values (uid, i.id, least(lvl, 5), 'mcq', ok)
  on conflict (user_id, item_id) do update set correct = excluded.correct, level = excluded.level, created_at = now();
  insert into public.skill_stats (user_id, skill, domain, attempted, correct) values (uid, i.skill, i.domain, 1, case when ok then 1 else 0 end)
  on conflict (user_id, skill) do update set attempted = public.skill_stats.attempted + 1, correct = public.skill_stats.correct + excluded.correct;
  up := public._path_maybe_level_up(uid);
  return jsonb_build_object('correct', ok, 'answer', i.correct, 'explanation', i.explanation, 'leveled_up', up, 'state', public._path_progress(uid));
end $$;
revoke all on function public.path_answer(bigint, int) from public, anon;
grant execute on function public.path_answer(bigint, int) to authenticated;

-- Interview items: save the answer, reveal the model answer and rubric. Scoring comes after (self-check).
create or replace function public.path_reveal(p_item bigint, p_answer text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); i public.path_items; lvl smallint; a text := trim(coalesce(p_answer, ''));
begin
  if uid is null or not public.aal_ok() then raise exception 'not signed in'; end if;
  select * into i from public.path_items where id = p_item and active and kind = 'interview';
  if not found then raise exception 'question not found'; end if;
  if not exists (select 1 from public.user_paths where user_id = uid and field = i.domain) then raise exception 'this question is not on your path'; end if;
  if char_length(a) < 40 then raise exception 'write at least a few sentences first (40+ characters)'; end if;
  select level into lvl from public.user_paths where user_id = uid;
  insert into public.path_attempts (user_id, item_id, level, kind, answer_text) values (uid, i.id, least(lvl, 5), 'interview', left(a, 4000))
  on conflict (user_id, item_id) do update set answer_text = excluded.answer_text, self_score = null, level = excluded.level, created_at = now();
  return jsonb_build_object('model_answer', i.model_answer, 'rubric', coalesce(i.rubric, '[]'), 'key_points', coalesce(i.key_points, '[]'), 'explanation', i.explanation);
end $$;
revoke all on function public.path_reveal(bigint, text) from public, anon;
grant execute on function public.path_reveal(bigint, text) to authenticated;

create or replace function public.path_self_score(p_item bigint, p_score int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); up boolean;
begin
  if uid is null or not public.aal_ok() then raise exception 'not signed in'; end if;
  if p_score is null or p_score < 0 or p_score > 4 then raise exception 'score must be 0 to 4'; end if;
  update public.path_attempts set self_score = p_score where user_id = uid and item_id = p_item and kind = 'interview' and answer_text is not null;
  if not found then raise exception 'answer the question first'; end if;
  up := public._path_maybe_level_up(uid);
  return jsonb_build_object('leveled_up', up, 'state', public._path_progress(uid));
end $$;
revoke all on function public.path_self_score(bigint, int) from public, anon;
grant execute on function public.path_self_score(bigint, int) to authenticated;

-- =====================================================================
-- 3. Weekly content batches: drafts → Sunday email → approve / hold → publish.
--    Drafts live only inside the batch, so nothing unpublished can leak into the app.
-- =====================================================================
create table if not exists public.content_batches (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'held', 'published', 'failed')),
  token_hash text not null,
  payload jsonb not null,
  summary text,
  email_html text,
  email_images jsonb,
  email_sent_at timestamptz,
  email_error text,
  decided_at timestamptz,
  published_at timestamptz,
  publish_error text,
  created_at timestamptz not null default now()
);
alter table public.content_batches enable row level security;
revoke all on public.content_batches from anon, authenticated;

-- Basic shape checks so a malformed batch never reaches students.
create or replace function public._check_batch(p jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare t jsonb; q jsonb; i jsonb; total int;
begin
  if jsonb_typeof(p->'tournaments') <> 'array' or jsonb_typeof(p->'path_items') <> 'array' then raise exception 'payload needs tournaments[] and path_items[]'; end if;
  for t in select * from jsonb_array_elements(p->'tournaments') loop
    if coalesce(t->>'id', '') !~ '^[a-z0-9-]{3,40}$' then raise exception 'bad tournament id %', t->>'id'; end if;
    if (t->>'closes_at')::timestamptz <= (t->>'opens_at')::timestamptz then raise exception '% closes before it opens', t->>'id'; end if;
    total := 0;
    for q in select * from jsonb_array_elements(t->'questions') loop
      if q->>'kind' = 'mcq' then
        if jsonb_array_length(q->'options') < 2 or (q->>'correct')::int < 0 or (q->>'correct')::int >= jsonb_array_length(q->'options') then
          raise exception '% has a question with a bad answer key', t->>'id'; end if;
        total := total + (q->>'points')::int;
      end if;
    end loop;
    if total <> 1000 then raise exception '% scored questions add up to % (need 1000)', t->>'id', total; end if;
  end loop;
  for i in select * from jsonb_array_elements(p->'path_items') loop
    if (i->>'level')::int not between 1 and 5 then raise exception 'path item with bad level'; end if;
    if i->>'kind' = 'mcq' and ((i->>'correct')::int < 0 or (i->>'correct')::int >= jsonb_array_length(i->'options')) then
      raise exception 'path item with a bad answer key'; end if;
    if i->>'kind' = 'interview' and coalesce(i->>'model_answer', '') = '' then raise exception 'interview item without a model answer'; end if;
  end loop;
end $$;

-- Called by the weekly job (service role / SQL only). Returns the one-time review token.
create or replace function public.stage_batch(p_week date, p_payload jsonb, p_summary text default null)
returns table (batch_id uuid, token text)
language plpgsql security definer set search_path = '' as $$
declare tok text := encode(extensions.gen_random_bytes(24), 'hex'); bid uuid;
begin
  perform public._check_batch(p_payload);
  update public.content_batches set status = 'held', decided_at = now()
   where week_start = p_week and status in ('draft', 'approved');          -- a re-run replaces the earlier draft
  insert into public.content_batches (week_start, token_hash, payload, summary)
  values (p_week, encode(extensions.digest(tok, 'sha256'), 'hex'), p_payload, p_summary) returning id into bid;
  return query select bid, tok;
end $$;
revoke all on function public.stage_batch(date, jsonb, text) from public, anon, authenticated;

create or replace function public.set_batch_email(p_batch uuid, p_html text, p_images jsonb default '[]')
returns void language sql security definer set search_path = '' as $$
  update public.content_batches set email_html = p_html, email_images = p_images where id = p_batch;
$$;
revoke all on function public.set_batch_email(uuid, text, jsonb) from public, anon, authenticated;

create or replace function public._batch_ok(p_batch uuid, p_token text)
returns public.content_batches language sql stable security definer set search_path = '' as $$
  select * from public.content_batches b
   where b.id = p_batch and b.token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
     and b.created_at > now() - interval '21 days';
$$;
revoke all on function public._batch_ok(uuid, text) from public, anon, authenticated;

-- The review page (link in the Sunday email). Anyone with the link can view; it expires after 21 days.
create or replace function public.review_batch(p_batch uuid, p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare b public.content_batches;
begin
  b := public._batch_ok(p_batch, p_token);
  if b.id is null then raise exception 'this review link is invalid or has expired'; end if;
  return jsonb_build_object('id', b.id, 'week_start', b.week_start, 'status', b.status, 'summary', b.summary,
    'payload', b.payload, 'created_at', b.created_at, 'decided_at', b.decided_at, 'published_at', b.published_at, 'publish_error', b.publish_error);
end $$;
revoke all on function public.review_batch(uuid, text) from public;
grant execute on function public.review_batch(uuid, text) to anon, authenticated;

create or replace function public._publish_batch(p_batch uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare b public.content_batches; t jsonb; q jsonb; pos int; qid bigint;
begin
  select * into b from public.content_batches where id = p_batch for update;
  if b.status in ('published', 'held') then return; end if;
  perform public._check_batch(b.payload);
  for t in select * from jsonb_array_elements(b.payload->'tournaments') loop
    insert into public.tournaments (id, name, cat, blurb, tasks, prize, opens_at, closes_at, duration_min, cap, ranked, sort)
    values (t->>'id', t->>'name', t->>'cat', t->>'blurb', t->>'tasks', t->>'prize', (t->>'opens_at')::timestamptz, (t->>'closes_at')::timestamptz,
            coalesce((t->>'duration_min')::int, 45), coalesce((t->>'cap')::int, 5000), coalesce((t->>'ranked')::boolean, true), coalesce((t->>'sort')::int, 50));
    pos := 0;
    for q in select * from jsonb_array_elements(t->'questions') loop
      pos := pos + 1;
      insert into public.questions (tournament_id, position, kind, label, prompt, context, table_data, options, points, skill)
      values (t->>'id', pos, q->>'kind', q->>'label', q->>'prompt', q->>'context', q->'table_data', q->'options',
              coalesce((q->>'points')::int, 0), q->>'skill') returning id into qid;
      if q->>'kind' = 'mcq' then insert into public.answer_keys (question_id, correct) values (qid, (q->>'correct')::int); end if;
    end loop;
  end loop;
  insert into public.path_items (domain, skill, level, kind, prompt, context, table_data, options, correct, explanation, model_answer, rubric, key_points, batch_id)
  select i->>'domain', i->>'skill', (i->>'level')::smallint, i->>'kind', i->>'prompt', i->>'context', i->'table_data', i->'options',
         (i->>'correct')::int, i->>'explanation', i->>'model_answer', i->'rubric', i->'key_points', b.id
    from jsonb_array_elements(b.payload->'path_items') i;
  update public.content_batches set status = 'published', published_at = now(), publish_error = null where id = b.id;
end $$;
revoke all on function public._publish_batch(uuid) from public, anon, authenticated;

create or replace function public.decide_batch(p_batch uuid, p_token text, p_action text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare b public.content_batches;
begin
  b := public._batch_ok(p_batch, p_token);
  if b.id is null then raise exception 'this review link is invalid or has expired'; end if;
  if b.status = 'published' then raise exception 'already published'; end if;
  if p_action = 'approve' then
    update public.content_batches set status = 'approved', decided_at = now() where id = b.id;
    begin
      perform public._publish_batch(b.id);
    exception when others then
      update public.content_batches set status = 'failed', publish_error = sqlerrm where id = b.id;
    end;
  elsif p_action = 'hold' then
    update public.content_batches set status = 'held', decided_at = now() where id = b.id;
  elsif p_action = 'release' then
    update public.content_batches set status = 'draft', decided_at = now() where id = b.id;
  else raise exception 'unknown action';
  end if;
  return public.review_batch(b.id, p_token);
end $$;
revoke all on function public.decide_batch(uuid, text, text) from public;
grant execute on function public.decide_batch(uuid, text, text) to anon, authenticated;

-- Monday 10:00 IST: publish anything not held.
create or replace function public.publish_due_batches()
returns int language plpgsql security definer set search_path = '' as $$
declare r record; c int := 0;
begin
  for r in select id from public.content_batches where status in ('draft', 'approved') and week_start <= (now() at time zone 'Asia/Kolkata')::date + 1 loop
    begin
      perform public._publish_batch(r.id); c := c + 1;
    exception when others then
      update public.content_batches set status = 'failed', publish_error = sqlerrm where id = r.id;
    end;
  end loop;
  return c;
end $$;
revoke all on function public.publish_due_batches() from public, anon, authenticated;

-- Sunday 18:00 IST: email the review to the founder via Resend. The API key lives in Supabase Vault as 'resend_api_key'.
create or replace function public.send_review_emails()
returns int language plpgsql security definer set search_path = '' as $$
declare r record; k text; c int := 0;
begin
  select decrypted_secret into k from vault.decrypted_secrets where name = 'resend_api_key';
  for r in select * from public.content_batches where status = 'draft' and email_html is not null and email_sent_at is null loop
    if k is null then
      update public.content_batches set email_error = 'no resend_api_key in Vault' where id = r.id; continue;
    end if;
    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Authorization', 'Bearer ' || k, 'Content-Type', 'application/json'),
      body := jsonb_build_object(
        'from', 'Rank Culture <noreply@rankculture.in>',
        'to', jsonb_build_array('rank1@rankculture.in'),
        'subject', 'Approve next week''s tournaments — week of ' || to_char(r.week_start, 'DD Mon YYYY'),
        'html', r.email_html,
        'attachments', coalesce(r.email_images, '[]'::jsonb)),
      timeout_milliseconds := 20000);
    update public.content_batches set email_sent_at = now(), email_error = null where id = r.id;
    c := c + 1;
  end loop;
  return c;
end $$;
revoke all on function public.send_review_emails() from public, anon, authenticated;

do $$ begin
  perform cron.unschedule(jobid) from cron.job where jobname in ('rc-review-email', 'rc-weekly-publish');
  perform cron.schedule('rc-review-email', '30 12 * * 0', 'select public.send_review_emails()');   -- Sun 18:00 IST
  perform cron.schedule('rc-weekly-publish', '30 4 * * 1', 'select public.publish_due_batches()'); -- Mon 10:00 IST
end $$;
