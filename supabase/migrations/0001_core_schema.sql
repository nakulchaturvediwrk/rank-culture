-- Rank Culture core schema: accounts, ratings, tournaments, entries, jobs, applications.
-- Every table has row-level security. Scores and rank changes are written only by
-- SECURITY DEFINER functions, never directly by the browser.

-- ---------- Helpers ----------
-- True when the session meets the user's MFA level: aal2 if they enrolled a verified factor.
create or replace function public.aal_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified');
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end $$;

-- ---------- Profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) between 1 and 80),
  city text check (char_length(city) <= 60),
  stage text check (stage in ('college', 'grad_0_2', 'working_2_plus', 'switching')),
  field text check (field in ('marketing', 'data', 'product', 'sales', 'ops', 'design', 'tech', 'hr', 'finance')),
  skills text[] not null default '{}' check (cardinality(skills) <= 30),
  visibility text not null default 'recruiters' check (visibility in ('private', 'recruiters', 'public')),
  hide_college boolean not null default true,
  show_city boolean not null default true,
  open_to_work boolean not null default true,
  notify_reminders boolean not null default true,
  notify_weekly boolean not null default true,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
alter table public.profiles enable row level security;
create policy "read own profile" on public.profiles for select to authenticated using (id = (select auth.uid()) and (select public.aal_ok()));
create policy "update own profile" on public.profiles for update to authenticated using (id = (select auth.uid()) and (select public.aal_ok())) with check (id = (select auth.uid()));

-- New auth user → empty profile (name taken from sign-up metadata or Google).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), 80), ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- Ratings (one per field; written only by submit_entry) ----------
create table public.ratings (
  user_id uuid not null references auth.users (id) on delete cascade,
  field text not null,
  score int not null check (score between 0 and 1000),
  entries int not null default 0,
  history int[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, field)
);
alter table public.ratings enable row level security;
create policy "read own ratings" on public.ratings for select to authenticated using (user_id = (select auth.uid()) and (select public.aal_ok()));
create index ratings_field_score on public.ratings (field, score desc);

-- ---------- Tournaments ----------
create table public.tournaments (
  id text primary key,
  name text not null,
  cat text not null,
  blurb text,
  tasks text,
  prize text,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  duration_min int not null check (duration_min between 5 and 240),
  cap int not null default 5000,
  ranked boolean not null default true,
  sort int not null default 0
);
alter table public.tournaments enable row level security;
create policy "tournaments are public" on public.tournaments for select to anon, authenticated using (true);

create table public.questions (
  id bigint generated always as identity primary key,
  tournament_id text not null references public.tournaments (id) on delete cascade,
  position int not null,
  kind text not null check (kind in ('mcq', 'text')),
  label text not null,
  prompt text not null,
  context text,
  table_data jsonb,
  options jsonb,
  points int not null default 0,
  unique (tournament_id, position)
);
alter table public.questions enable row level security;
-- Questions are only readable once the tournament window has opened.
create policy "open questions readable" on public.questions for select to authenticated
  using (exists (select 1 from public.tournaments t where t.id = tournament_id and t.opens_at <= now()));

-- Answer keys: RLS on, no policies → unreadable from the browser.
create table public.answer_keys (
  question_id bigint primary key references public.questions (id) on delete cascade,
  correct int not null
);
alter table public.answer_keys enable row level security;
revoke all on public.answer_keys from anon, authenticated;

create table public.registrations (
  user_id uuid not null references auth.users (id) on delete cascade,
  tournament_id text not null references public.tournaments (id) on delete cascade,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  primary key (user_id, tournament_id)
);
alter table public.registrations enable row level security;
create policy "read own registrations" on public.registrations for select to authenticated using (user_id = (select auth.uid()) and (select public.aal_ok()));
create policy "register self" on public.registrations for insert to authenticated
  with check (user_id = (select auth.uid()) and started_at is null and (select public.aal_ok())
    and exists (select 1 from public.tournaments t where t.id = tournament_id and t.closes_at > now()));
create policy "unregister self" on public.registrations for delete to authenticated using (user_id = (select auth.uid()) and started_at is null and (select public.aal_ok()));
create index registrations_tournament on public.registrations (tournament_id);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tournament_id text not null references public.tournaments (id) on delete cascade,
  answers jsonb not null,
  task_scores jsonb not null default '[]',
  auto_points int not null,
  auto_max int not null,
  written_pending boolean not null default false,
  rating_before int,
  rating_after int,
  submitted_at timestamptz not null default now(),
  unique (user_id, tournament_id)
);
alter table public.entries enable row level security;
create policy "read own entries" on public.entries for select to authenticated using (user_id = (select auth.uid()) and (select public.aal_ok()));
create index entries_tournament_points on public.entries (tournament_id, auto_points desc);

-- ---------- Jobs & applications ----------
create table public.jobs (
  id text primary key,
  role text not null,
  company text not null,
  city text not null,
  salary text not null,
  min_rank int not null,
  cat text not null,
  type text not null,
  fast_track boolean not null default false,
  about text,
  duties text[] not null default '{}',
  hiring_from text references public.tournaments (id),
  active boolean not null default true
);
alter table public.jobs enable row level security;
create policy "jobs are public" on public.jobs for select to anon, authenticated using (active);
create index jobs_hiring_from on public.jobs (hiring_from);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id text not null references public.jobs (id) on delete cascade,
  note text check (char_length(note) <= 500),
  fast_track boolean not null default false,
  rating_at_apply int,
  status text not null default 'applied' check (status in ('applied', 'review', 'interview', 'offer', 'closed')),
  created_at timestamptz not null default now(),
  unique (user_id, job_id)
);
alter table public.applications enable row level security;
create policy "read own applications" on public.applications for select to authenticated using (user_id = (select auth.uid()) and (select public.aal_ok()));
create policy "withdraw own application" on public.applications for delete to authenticated using (user_id = (select auth.uid()) and status = 'applied' and (select public.aal_ok()));
create index applications_job on public.applications (job_id);

-- ---------- RPCs ----------
create or replace function public.tournament_counts()
returns table (tournament_id text, players bigint)
language sql stable security definer set search_path = '' as $$
  select r.tournament_id, count(*) from public.registrations r group by r.tournament_id;
$$;

-- Marks the start of an attempt (server time) and returns the deadline.
create or replace function public.start_entry(p_tournament text)
returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); t public.tournaments; reg public.registrations;
begin
  if uid is null or not public.aal_ok() then raise exception 'not authenticated'; end if;
  select * into t from public.tournaments where id = p_tournament;
  if not found then raise exception 'unknown tournament'; end if;
  if now() < t.opens_at or now() >= t.closes_at then raise exception 'tournament is not live'; end if;
  if exists (select 1 from public.entries where user_id = uid and tournament_id = p_tournament) then raise exception 'already submitted'; end if;
  insert into public.registrations (user_id, tournament_id, started_at) values (uid, p_tournament, now())
    on conflict (user_id, tournament_id) do update set started_at = coalesce(public.registrations.started_at, now())
    returning * into reg;
  return least(reg.started_at + make_interval(mins => t.duration_min), t.closes_at);
end $$;

-- Scores an attempt on the server, updates the rating and records the entry.
create or replace function public.submit_entry(p_tournament text, p_answers jsonb)
returns public.entries
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); t public.tournaments; reg public.registrations; q record;
  pts int := 0; mx int := 0; has_text boolean := false; scores jsonb := '[]'; a jsonb; got int;
  before int; after int; perf int; e public.entries;
begin
  if uid is null or not public.aal_ok() then raise exception 'not authenticated'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or pg_column_size(p_answers) > 32000 then raise exception 'invalid answers'; end if;
  select * into t from public.tournaments where id = p_tournament;
  if not found then raise exception 'unknown tournament'; end if;
  select * into reg from public.registrations where user_id = uid and tournament_id = p_tournament;
  if reg.started_at is null then raise exception 'attempt not started'; end if;
  -- 2 minutes of grace for slow connections
  if now() > least(reg.started_at + make_interval(mins => t.duration_min), t.closes_at) + interval '2 minutes' then raise exception 'time is up'; end if;
  if exists (select 1 from public.entries where user_id = uid and tournament_id = p_tournament) then raise exception 'already submitted'; end if;

  for q in select qq.id, qq.kind, qq.label, qq.points, k.correct from public.questions qq left join public.answer_keys k on k.question_id = qq.id
           where qq.tournament_id = p_tournament order by qq.position loop
    a := p_answers -> q.id::text;
    if q.kind = 'mcq' then
      got := case when a is not null and jsonb_typeof(a) = 'number' and (a #>> '{}')::numeric = q.correct then q.points else 0 end;
      pts := pts + got; mx := mx + q.points;
      scores := scores || jsonb_build_object('label', q.label, 'points', got, 'max', q.points);
    else
      if a is not null and (jsonb_typeof(a) <> 'string' or char_length(a #>> '{}') > 4000) then raise exception 'answer too long'; end if;
      has_text := has_text or (a is not null and char_length(trim(a #>> '{}')) > 0);
      scores := scores || jsonb_build_object('label', q.label, 'points', null, 'max', null, 'pending', true);
    end if;
  end loop;
  if mx = 0 then raise exception 'tournament has no scored tasks'; end if;

  if t.ranked then
    select score into before from public.ratings where user_id = uid and field = t.cat;
    perf := round(1000.0 * pts / mx);
    if before is null then after := perf; -- first tournament in a field sets the starting rank
    else after := greatest(0, least(1000, before + round((perf - before) * 0.35)::int)); end if;
    insert into public.ratings (user_id, field, score, entries, history) values (uid, t.cat, after, 1, array[after])
      on conflict (user_id, field) do update set score = after, entries = public.ratings.entries + 1,
        history = (public.ratings.history || after)[greatest(1, cardinality(public.ratings.history) - 10):], updated_at = now();
  end if;

  insert into public.entries (user_id, tournament_id, answers, task_scores, auto_points, auto_max, written_pending, rating_before, rating_after)
  values (uid, p_tournament, p_answers, scores, pts, mx, has_text, before, after) returning * into e;
  return e;
end $$;

-- Caller's position in a tournament (by auto-scored points).
create or replace function public.my_standing(p_tournament text)
returns table (place bigint, total bigint)
language sql stable security definer set search_path = '' as $$
  select (select count(*) + 1 from public.entries o where o.tournament_id = p_tournament and o.auto_points > e.auto_points),
         (select count(*) from public.entries o where o.tournament_id = p_tournament)
  from public.entries e where e.user_id = auth.uid() and e.tournament_id = p_tournament and public.aal_ok();
$$;

-- Caller's national position in a field.
create or replace function public.my_rank(p_field text)
returns table (place bigint, total bigint, score int)
language sql stable security definer set search_path = '' as $$
  select (select count(*) + 1 from public.ratings o where o.field = p_field and o.score > r.score),
         (select count(*) from public.ratings o where o.field = p_field), r.score
  from public.ratings r where r.user_id = auth.uid() and r.field = p_field and public.aal_ok();
$$;

-- Public leaderboard: only people who chose "Everyone" visibility.
create or replace function public.leaderboard(p_field text default null, p_limit int default 50)
returns table (full_name text, city text, field text, score int)
language sql stable security definer set search_path = '' as $$
  select p.full_name, case when p.show_city then p.city end, r.field, r.score
  from public.ratings r join public.profiles p on p.id = r.user_id
  where p.visibility = 'public' and (p_field is null or r.field = p_field)
  order by r.score desc limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

create or replace function public.apply_to_job(p_job text, p_note text default null)
returns public.applications
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); j public.jobs; s int; a public.applications;
begin
  if uid is null or not public.aal_ok() then raise exception 'not authenticated'; end if;
  if p_note is not null and char_length(p_note) > 500 then raise exception 'note too long'; end if;
  select * into j from public.jobs where id = p_job and active;
  if not found then raise exception 'unknown job'; end if;
  select score into s from public.ratings where user_id = uid and field = j.cat;
  insert into public.applications (user_id, job_id, note, fast_track, rating_at_apply)
  values (uid, p_job, nullif(trim(p_note), ''), j.fast_track and coalesce(s, 0) >= j.min_rank, s)
  on conflict (user_id, job_id) do nothing returning * into a;
  if a.id is null then raise exception 'already applied'; end if;
  return a;
end $$;

create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.aal_ok() then raise exception 'not authenticated'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- Lock down function execution: nothing for anon except the public lists.
revoke execute on all functions in schema public from public, anon;
grant execute on function public.aal_ok(), public.tournament_counts(), public.leaderboard(text, int) to anon, authenticated;
grant execute on function public.start_entry(text), public.submit_entry(text, jsonb), public.my_standing(text),
  public.my_rank(text), public.apply_to_job(text, text), public.delete_my_account() to authenticated;
revoke execute on function public.handle_new_user(), public.touch_updated_at() from authenticated;
alter default privileges in schema public revoke execute on functions from public, anon;

-- Browser roles cannot write to server-owned tables at all (belt and braces on top of RLS).
revoke insert, update, delete on public.ratings, public.entries, public.tournaments, public.questions, public.jobs from anon, authenticated;
revoke insert, delete on public.profiles from anon, authenticated;
revoke all on public.profiles, public.ratings, public.registrations, public.entries, public.applications from anon;
-- Profiles: only user-editable columns can be updated.
revoke update on public.profiles from authenticated;
grant update (full_name, city, stage, field, skills, visibility, hide_college, show_city, open_to_work, notify_reminders, notify_weekly, onboarded) on public.profiles to authenticated;
