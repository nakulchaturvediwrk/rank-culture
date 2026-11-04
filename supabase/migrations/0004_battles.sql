-- Rank Culture: skill leaderboards, live battles (1v1 / 4 / 6 / 10), showdowns,
-- fastest-finger events and knockout brackets.
-- All battle tables are server-only (RLS on, no policies, no grants); the browser
-- talks to them exclusively through the SECURITY DEFINER functions below.

create extension if not exists pg_cron;

-- ---------- Skills ----------
alter table public.questions add column if not exists skill text;
update public.questions q set skill = m.skill from (values
 ('practice',1,'Copywriting'),('practice',2,'Marketing metrics'),('practice',3,'Prioritisation'),
 ('growth',1,'Copywriting'),('growth',2,'Funnel analysis'),('growth',4,'Paid ads'),
 ('sql',1,'Data cleaning'),('sql',2,'SQL'),('sql',3,'Business analysis'),
 ('ops',1,'Logistics'),('ops',2,'Vendor management'),('ops',3,'Capacity planning'),
 ('product',1,'Product sense'),('product',2,'Prioritisation'),('product',3,'Product metrics'),
 ('sales',1,'Prospecting'),('sales',2,'Objection handling'),('sales',3,'Discovery'),
 ('design',1,'UX'),('design',2,'Accessibility'),('design',3,'Visual design'),
 ('code',1,'Backend'),('code',2,'Security'),('code',3,'Performance'),
 ('hr',1,'Hiring'),('hr',2,'Employee relations'),('hr',3,'Retention')
) as m(t, pos, skill) where q.tournament_id = m.t and q.position = m.pos;

create table public.skill_stats (
  user_id uuid not null references auth.users (id) on delete cascade,
  skill text not null,
  domain text not null,
  attempted int not null default 0,
  correct int not null default 0,
  score int generated always as ((round(1000.0 * (correct + 1) / (attempted + 2)))::int) stored,
  updated_at timestamptz not null default now(),
  primary key (user_id, skill)
);
alter table public.skill_stats enable row level security;
create policy "read own skill stats" on public.skill_stats for select to authenticated using (user_id = (select auth.uid()) and (select public.aal_ok()));
revoke insert, update, delete on public.skill_stats from anon, authenticated;
revoke all on public.skill_stats from anon;
create index skill_stats_board on public.skill_stats (skill, score desc) where attempted >= 3;

-- ---------- Question bank for battles (never readable from the browser) ----------
create table public.bank_questions (
  id bigint generated always as identity primary key,
  domain text not null,
  skill text not null,
  prompt text not null,
  context text,
  options jsonb not null,
  correct int not null,
  active boolean not null default true
);
alter table public.bank_questions enable row level security;
revoke all on public.bank_questions from anon, authenticated;
create index bank_questions_domain on public.bank_questions (domain) where active;

-- ---------- Ratings, battles, knockouts ----------
create table public.battle_ratings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  rating int not null default 1200,
  played int not null default 0,
  wins int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.knockouts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 60),
  domain text not null,
  scoring text not null default 'classic' check (scoring in ('classic', 'fff')),
  size int not null check (size in (4, 8, 16, 32)),
  bracket int,
  status text not null default 'open' check (status in ('open', 'running', 'finished', 'cancelled')),
  is_private boolean not null default false,
  code text unique,
  host uuid references auth.users (id) on delete set null,
  starts_at timestamptz not null,
  champion uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.battles (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('quick', 'showdown', 'knockout_match')),
  scoring text not null default 'classic' check (scoring in ('classic', 'fff')),
  domain text not null,
  size int not null check (size between 2 and 1000),
  status text not null default 'waiting' check (status in ('waiting', 'live', 'finished', 'cancelled')),
  title text,
  is_private boolean not null default false,
  code text unique,
  host uuid references auth.users (id) on delete set null,
  scheduled_at timestamptz,
  started_at timestamptz,
  q_ids bigint[] not null default '{}',
  q_seconds int not null default 20,
  gap_seconds int not null default 4,
  ranked boolean not null default false,
  knockout_id uuid references public.knockouts (id) on delete cascade,
  ko_round int,
  ko_slot int,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index battles_open on public.battles (kind, status, size, scoring, domain) where status = 'waiting';
create index battles_live on public.battles (status, started_at) where status = 'live';
create index battles_scheduled on public.battles (scheduled_at) where status = 'waiting' and scheduled_at is not null;
create index battles_knockout on public.battles (knockout_id);

create table public.battle_players (
  battle_id uuid not null references public.battles (id) on delete cascade,
  seat int not null,
  user_id uuid references auth.users (id) on delete cascade,
  bot_name text,
  bot_acc real,
  joined_at timestamptz not null default now(),
  place int,
  rating_before int,
  rating_after int,
  primary key (battle_id, seat),
  unique (battle_id, user_id),
  check ((user_id is null) <> (bot_name is null))
);
create index battle_players_user on public.battle_players (user_id);

create table public.battle_answers (
  battle_id uuid not null,
  seat int not null,
  q_index int not null,
  choice int not null,
  correct boolean not null,
  answered_at timestamptz not null default now(),
  primary key (battle_id, seat, q_index),
  foreign key (battle_id, seat) references public.battle_players (battle_id, seat) on delete cascade
);

create table public.knockout_entries (
  knockout_id uuid not null references public.knockouts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  seed int,
  joined_at timestamptz not null default now(),
  primary key (knockout_id, user_id)
);
create index knockout_entries_user on public.knockout_entries (user_id);

create table public.knockout_matches (
  knockout_id uuid not null references public.knockouts (id) on delete cascade,
  round int not null,
  slot int not null,
  p1 uuid references auth.users (id) on delete set null,
  p2 uuid references auth.users (id) on delete set null,
  battle_id uuid references public.battles (id) on delete set null,
  winner uuid references auth.users (id) on delete set null,
  starts_at timestamptz,
  primary key (knockout_id, round, slot)
);
create index knockout_matches_battle on public.knockout_matches (battle_id);

do $$ declare t text; begin
  foreach t in array array['battle_ratings','knockouts','battles','battle_players','battle_answers','knockout_entries','knockout_matches'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ---------- Helpers ----------
create or replace function public.display_name(p uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select nullif(trim(split_part(trim(pr.full_name), ' ', 1)
           || case when split_part(trim(pr.full_name), ' ', 2) <> '' then ' ' || left(split_part(trim(pr.full_name), ' ', 2), 1) || '.' else '' end), '')
         from public.profiles pr where pr.id = p), 'Player');
$$;

create or replace function public.valid_domain(d text) returns boolean
language sql immutable set search_path = '' as $$
  select d in ('mixed', 'marketing', 'data', 'product', 'sales', 'ops', 'design', 'tech', 'hr');
$$;

create or replace function public.new_code() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare c text;
begin
  loop
    c := substr(translate(upper(encode(extensions.gen_random_bytes(8), 'base64')), '+/=0O1I', ''), 1, 6);
    exit when char_length(c) = 6
      and not exists (select 1 from public.battles where code = c)
      and not exists (select 1 from public.knockouts where code = c);
  end loop;
  return c;
end $$;

create or replace function public.bump_skill(p_user uuid, p_skill text, p_domain text, p_attempted int, p_correct int) returns void
language sql security definer set search_path = '' as $$
  insert into public.skill_stats (user_id, skill, domain, attempted, correct)
  values (p_user, p_skill, p_domain, p_attempted, p_correct)
  on conflict (user_id, skill) do update set attempted = public.skill_stats.attempted + excluded.attempted,
    correct = public.skill_stats.correct + excluded.correct, domain = excluded.domain, updated_at = now();
$$;

-- Tournaments now also feed skill stats.
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
  if now() > least(reg.started_at + make_interval(mins => t.duration_min), t.closes_at) + interval '2 minutes' then raise exception 'time is up'; end if;
  if exists (select 1 from public.entries where user_id = uid and tournament_id = p_tournament) then raise exception 'already submitted'; end if;

  for q in select qq.id, qq.kind, qq.label, qq.points, qq.skill, k.correct from public.questions qq left join public.answer_keys k on k.question_id = qq.id
           where qq.tournament_id = p_tournament order by qq.position loop
    a := p_answers -> q.id::text;
    if q.kind = 'mcq' then
      got := case when a is not null and jsonb_typeof(a) = 'number' and (a #>> '{}')::numeric = q.correct then q.points else 0 end;
      pts := pts + got; mx := mx + q.points;
      scores := scores || jsonb_build_object('label', q.label, 'points', got, 'max', q.points);
      if q.skill is not null then perform public.bump_skill(uid, q.skill, t.cat, 1, (got > 0)::int); end if;
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
    if before is null then after := perf;
    else after := greatest(0, least(1000, before + round((perf - before) * 0.35)::int)); end if;
    insert into public.ratings (user_id, field, score, entries, history) values (uid, t.cat, after, 1, array[after])
      on conflict (user_id, field) do update set score = after, entries = public.ratings.entries + 1,
        history = (public.ratings.history || after)[greatest(1, cardinality(public.ratings.history) - 10):], updated_at = now();
  end if;

  insert into public.entries (user_id, tournament_id, answers, task_scores, auto_points, auto_max, written_pending, rating_before, rating_after)
  values (uid, p_tournament, p_answers, scores, pts, mx, has_text, before, after) returning * into e;
  return e;
end $$;

-- ---------- Battle engine ----------
create or replace function public._battle_end(b public.battles) returns timestamptz
language sql immutable set search_path = '' as $$
  select b.started_at + make_interval(secs => cardinality(b.q_ids) * (b.q_seconds + b.gap_seconds));
$$;

-- Live scores. Only answers already made by p_upto count (bot answers are pre-timed).
create or replace function public._battle_scores(p_bid uuid, p_upto timestamptz)
returns table (seat int, score int, correct int, time_ms bigint)
language sql stable security definer set search_path = '' as $$
  with b as (select * from public.battles where id = p_bid),
  a as (
    select ba.seat, ba.q_index, ba.correct, ba.answered_at, b.scoring, b.q_seconds,
      greatest(0, extract(epoch from (ba.answered_at - (b.started_at + make_interval(secs => ba.q_index * (b.q_seconds + b.gap_seconds))))) * 1000) as el_ms
    from public.battle_answers ba cross join b
    where ba.battle_id = p_bid and ba.answered_at <= p_upto),
  f as (select q_index, min(answered_at) as first_at from a where correct group by q_index),
  pts as (
    select a.seat, a.correct,
      case when not a.correct then 0
           when a.scoring = 'fff' then case when a.answered_at = f.first_at then 100 else 0 end
           else 100 + greatest(0, floor(100 * (1 - a.el_ms / (a.q_seconds * 1000.0))))::int end as p,
      case when a.correct then a.el_ms else 0 end as t
    from a left join f on f.q_index = a.q_index)
  select bp.seat, coalesce(sum(pts.p), 0)::int, (count(*) filter (where pts.correct))::int, coalesce(sum(pts.t), 0)::bigint
  from public.battle_players bp left join pts on pts.seat = bp.seat
  where bp.battle_id = p_bid group by bp.seat;
$$;

create or replace function public._battle_start(p_bid uuid, p_fill boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  b public.battles; humans int; seats int; target int; i int; k int; nq int; qids bigint[];
  bots text[] := array['Nova','Atlas','Echo','Orbit','Pixel','Quartz','Rocket','Sable','Tango','Vega','Willow','Zen'];
  r record; ws timestamptz; opts int;
begin
  select * into b from public.battles where id = p_bid;
  if b.status <> 'waiting' then return; end if;
  select count(*) filter (where user_id is not null), count(*) into humans, seats from public.battle_players where battle_id = b.id;
  if p_fill then
    target := case when b.kind = 'quick' then b.size when seats < 4 then least(b.size, 4) else seats end;
    for i in 1 .. greatest(0, target - seats) loop
      insert into public.battle_players (battle_id, seat, bot_name, bot_acc)
      values (b.id, seats + i, 'Bot ' || bots[1 + ((seats + i - 1) % array_length(bots, 1))], 0.4 + random() * 0.4);
    end loop;
  end if;
  nq := case when b.kind = 'knockout_match' then 5 when b.kind = 'showdown' then 10 when b.scoring = 'fff' then 10 when b.size = 2 then 7 else 8 end;
  qids := (select coalesce(array_agg(id), '{}') from (select id from public.bank_questions
           where active and (b.domain = 'mixed' or domain = b.domain) order by random() limit nq) s);
  if cardinality(qids) < 3 then
    update public.battles set status = 'cancelled', finished_at = now() where id = b.id;
    return;
  end if;
  update public.battles set status = 'live', started_at = now() + interval '8 seconds', q_ids = qids, ranked = humans >= 2
  where id = b.id returning * into b;
  -- Practice bots: answer times and choices are fixed now and only become visible once their time passes.
  for r in select seat, bot_acc from public.battle_players where battle_id = b.id and user_id is null loop
    for k in 0 .. cardinality(qids) - 1 loop
      continue when random() < 0.08; -- bots occasionally run out of time
      ws := b.started_at + make_interval(secs => k * (b.q_seconds + b.gap_seconds));
      select jsonb_array_length(options) , correct into opts, i from public.bank_questions where id = qids[k + 1];
      insert into public.battle_answers (battle_id, seat, q_index, choice, correct, answered_at)
      select b.id, r.seat, k, c, c = i, ws + make_interval(secs => 1.5 + random() * (b.q_seconds - 3))
      from (select case when random() < r.bot_acc then i else (i + 1 + floor(random() * (opts - 1))::int) % opts end as c) x;
    end loop;
  end loop;
end $$;

create or replace function public._battle_finish(p_bid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare b public.battles; n int;
begin
  select * into b from public.battles where id = p_bid;
  if b.status <> 'live' then return; end if;
  with s as (select * from public._battle_scores(b.id, 'infinity')),
       rk as (select s.seat, rank() over (order by s.score desc, s.time_ms asc) as pl from s)
  update public.battle_players bp set place = rk.pl from rk where bp.battle_id = b.id and bp.seat = rk.seat;

  -- Skill stats: every question shown counts as attempted.
  insert into public.skill_stats (user_id, skill, domain, attempted, correct)
  select bp.user_id, q.skill, max(q.domain), count(*), count(*) filter (where ba.correct)
  from public.battle_players bp
  cross join lateral unnest(b.q_ids) with ordinality as u(qid, ord)
  join public.bank_questions q on q.id = u.qid
  left join public.battle_answers ba on ba.battle_id = b.id and ba.seat = bp.seat and ba.q_index = u.ord - 1
  where bp.battle_id = b.id and bp.user_id is not null
  group by bp.user_id, q.skill
  on conflict (user_id, skill) do update set attempted = public.skill_stats.attempted + excluded.attempted,
    correct = public.skill_stats.correct + excluded.correct, domain = excluded.domain, updated_at = now();

  -- Arena rating: multi-player Elo between humans only.
  if b.ranked then
    insert into public.battle_ratings (user_id) select user_id from public.battle_players where battle_id = b.id and user_id is not null on conflict do nothing;
    select count(*) into n from public.battle_players where battle_id = b.id and user_id is not null;
    with h as (select bp.user_id, bp.place, br.rating from public.battle_players bp join public.battle_ratings br on br.user_id = bp.user_id where bp.battle_id = b.id),
    d as (select h1.user_id, h1.rating,
            round(32.0 / (n - 1) * sum((case when h1.place < h2.place then 1 when h1.place = h2.place then 0.5 else 0 end)
              - 1 / (1 + power(10, (h2.rating - h1.rating) / 400.0))))::int as delta
          from h h1 join h h2 on h1.user_id <> h2.user_id group by h1.user_id, h1.rating)
    update public.battle_players bp set rating_before = d.rating, rating_after = d.rating + d.delta
    from d where bp.battle_id = b.id and bp.user_id = d.user_id;
    update public.battle_ratings br set rating = bp.rating_after, played = br.played + 1, wins = br.wins + (bp.place = 1)::int, updated_at = now()
    from public.battle_players bp where bp.battle_id = b.id and bp.user_id = br.user_id;
  end if;
  update public.battles set status = 'finished', finished_at = now() where id = b.id;
end $$;

-- Lazy state machine: called by players' polling and by cron.
create or replace function public._battle_tick(p_bid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare b public.battles; humans int;
begin
  select * into b from public.battles where id = p_bid for update;
  if not found then return; end if;
  if b.status = 'waiting' then
    if b.scheduled_at is not null and now() >= b.scheduled_at then
      select count(*) into humans from public.battle_players where battle_id = b.id and user_id is not null;
      if humans = 0 then update public.battles set status = 'cancelled', finished_at = now() where id = b.id;
      else perform public._battle_start(b.id, b.kind <> 'knockout_match'); end if;
    elsif b.kind = 'quick' and (b.created_at < now() - interval '15 minutes'
          or not exists (select 1 from public.battle_players where battle_id = b.id and user_id is not null)) then
      update public.battles set status = 'cancelled', finished_at = now() where id = b.id;
    end if;
  elsif b.status = 'live' and now() >= public._battle_end(b) then
    perform public._battle_finish(b.id);
  end if;
end $$;

-- ---------- Knockouts ----------
create or replace function public._ko_make_match(p_k public.knockouts, p_round int, p_slot int, p_1 uuid, p_2 uuid, p_at timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
declare bid uuid; rounds int := round(log(2, p_k.bracket))::int; label text;
begin
  if p_1 is null or p_2 is null then
    insert into public.knockout_matches (knockout_id, round, slot, p1, p2, winner, starts_at)
    values (p_k.id, p_round, p_slot, p_1, p_2, coalesce(p_1, p_2), p_at) on conflict do nothing;
    return;
  end if;
  label := case rounds - p_round when 0 then 'Final' when 1 then 'Semi-final' when 2 then 'Quarter-final' else 'Round ' || p_round end;
  insert into public.battles (kind, scoring, domain, size, title, is_private, host, scheduled_at, knockout_id, ko_round, ko_slot, q_seconds)
  values ('knockout_match', p_k.scoring, p_k.domain, 2, p_k.title || ' · ' || label, p_k.is_private, p_k.host, p_at, p_k.id, p_round, p_slot,
          case when p_k.scoring = 'fff' then 15 else 20 end)
  returning id into bid;
  insert into public.battle_players (battle_id, seat, user_id) values (bid, 1, p_1), (bid, 2, p_2);
  insert into public.knockout_matches (knockout_id, round, slot, p1, p2, battle_id, starts_at)
  values (p_k.id, p_round, p_slot, p_1, p_2, bid, p_at) on conflict do nothing;
end $$;

create or replace function public._ko_tick(p_kid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare k public.knockouts; n int; s int; j int; r int; rounds int; m record; st text; w uuid; w1 uuid; w2 uuid; f1 boolean; f2 boolean; p1 uuid; p2 uuid;
begin
  select * into k from public.knockouts where id = p_kid for update;
  if not found then return; end if;
  if k.status = 'open' and now() >= k.starts_at then
    select count(*) into n from public.knockout_entries where knockout_id = k.id;
    if n < 2 then update public.knockouts set status = 'cancelled' where id = k.id; return; end if;
    s := 2; while s < n loop s := s * 2; end loop;
    with o as (select e.user_id, row_number() over (order by coalesce(br.rating, 1200) desc, e.joined_at) as sd
               from public.knockout_entries e left join public.battle_ratings br on br.user_id = e.user_id where e.knockout_id = k.id)
    update public.knockout_entries e set seed = o.sd from o where e.knockout_id = k.id and e.user_id = o.user_id;
    update public.knockouts set status = 'running', bracket = s where id = k.id returning * into k;
    for j in 1 .. s / 2 loop
      select user_id into p1 from public.knockout_entries where knockout_id = k.id and seed = j;
      select user_id into p2 from public.knockout_entries where knockout_id = k.id and seed = s + 1 - j;
      if not found then p2 := null; end if;
      perform public._ko_make_match(k, 1, j, p1, p2, greatest(now(), k.starts_at) + interval '45 seconds');
    end loop;
  end if;
  if k.status <> 'running' then return; end if;
  rounds := round(log(2, k.bracket))::int;
  for m in select * from public.knockout_matches where knockout_id = k.id and winner is null and battle_id is not null loop
    perform public._battle_tick(m.battle_id);
    select status into st from public.battles where id = m.battle_id;
    if st = 'finished' then
      select user_id into w from public.battle_players where battle_id = m.battle_id order by place, seat limit 1;
      update public.knockout_matches set winner = w where knockout_id = k.id and round = m.round and slot = m.slot;
    elsif st = 'cancelled' then
      update public.knockout_matches set winner = m.p1 where knockout_id = k.id and round = m.round and slot = m.slot;
    end if;
  end loop;
  for r in 1 .. rounds - 1 loop
    for j in 1 .. k.bracket / (1 << (r + 1)) loop
      continue when exists (select 1 from public.knockout_matches where knockout_id = k.id and round = r + 1 and slot = j);
      select winner, winner is not null into w1, f1 from public.knockout_matches where knockout_id = k.id and round = r and slot = 2 * j - 1;
      select winner, winner is not null into w2, f2 from public.knockout_matches where knockout_id = k.id and round = r and slot = 2 * j;
      if coalesce(f1, false) and coalesce(f2, false) then
        perform public._ko_make_match(k, r + 1, j, w1, w2, now() + interval '45 seconds');
      end if;
    end loop;
  end loop;
  select winner into w from public.knockout_matches where knockout_id = k.id and round = rounds and slot = 1;
  if w is not null then update public.knockouts set status = 'finished', champion = w where id = k.id; end if;
end $$;

-- ---------- Public RPCs: battles ----------
create or replace function public._seat(p_bid uuid, p_uid uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare s int; b public.battles; cnt int;
begin
  select * into b from public.battles where id = p_bid for update;
  if b.status <> 'waiting' then raise exception 'this battle has already started'; end if;
  select seat into s from public.battle_players where battle_id = b.id and user_id = p_uid;
  if found then return s; end if;
  select count(*), coalesce(max(seat), 0) + 1 into cnt, s from public.battle_players where battle_id = b.id;
  if cnt >= b.size then raise exception 'this battle is full'; end if;
  insert into public.battle_players (battle_id, seat, user_id) values (b.id, s, p_uid);
  if b.kind = 'quick' and cnt + 1 >= b.size then perform public._battle_start(b.id, false); end if;
  return s;
end $$;

create or replace function public.battle_quick(p_size int, p_scoring text, p_domain text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); bid uuid;
begin
  if uid is null or not public.aal_ok() then raise exception 'not authenticated'; end if;
  if p_size not in (2, 4, 6, 10) or p_scoring not in ('classic', 'fff') or not public.valid_domain(p_domain) then raise exception 'invalid battle settings'; end if;
  delete from public.battle_players bp using public.battles b
   where bp.battle_id = b.id and b.status = 'waiting' and b.kind = 'quick' and bp.user_id = uid;
  select b.id into bid from public.battles b
   where b.status = 'waiting' and b.kind = 'quick' and not b.is_private and b.size = p_size and b.scoring = p_scoring and b.domain = p_domain
     and (select count(*) from public.battle_players bp where bp.battle_id = b.id) < b.size
     and exists (select 1 from public.battle_players bp where bp.battle_id = b.id and bp.user_id is not null)
   order by b.created_at limit 1 for update skip locked;
  if bid is null then
    insert into public.battles (kind, scoring, domain, size, host, q_seconds, title)
    values ('quick', p_scoring, p_domain, p_size, uid, case when p_scoring = 'fff' then 15 else 20 end,
            case p_size when 2 then '1v1 Duel' else p_size || '-player battle' end)
    returning id into bid;
  end if;
  perform public._seat(bid, uid);
  return bid;
end $$;

create or replace function public.battle_room(p_size int, p_scoring text, p_domain text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); bid uuid;
begin
  if uid is null or not public.aal_ok() then raise exception 'not authenticated'; end if;
  if p_size not in (2, 4, 6, 10) or p_scoring not in ('classic', 'fff') or not public.valid_domain(p_domain) then raise exception 'invalid battle settings'; end if;
  if (select count(*) from public.battles where host = uid and status = 'waiting' and is_private) >= 5 then raise exception 'you already have 5 open rooms'; end if;
  insert into public.battles (kind, scoring, domain, size, host, is_private, code, q_seconds, title)
  values ('quick', p_scoring, p_domain, p_size, uid, true, public.new_code(), case when p_scoring = 'fff' then 15 else 20 end,
          'Private ' || case p_size when 2 then 'duel' else p_size || '-player room' end)
  returning id into bid;
  perform public._seat(bid, uid);
  return bid;
end $$;

create or replace function public.battle_join(p_id uuid default null, p_code text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); b public.battles;
begin
  if uid is null or not public.aal_ok() then raise exception 'not authenticated'; end if;
  if p_code is not null then select * into b from public.battles where code = upper(trim(p_code));
  else select * into b from public.battles where id = p_id; end if;
  if not found then raise exception 'no battle with that code'; end if;
  if b.kind = 'knockout_match' then raise exception 'knockout matches are assigned by the bracket'; end if;
  if b.is_private and (p_code is null or upper(trim(p_code)) <> b.code) and b.host is distinct from uid
     and not exists (select 1 from public.battle_players where battle_id = b.id and user_id = uid) then raise exception 'this room needs an invite code'; end if;
  if b.status = 'waiting' then perform public._seat(b.id, uid); end if;
  return b.id;
end $$;

create or replace function public.battle_leave(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not public.aal_ok() then raise exception 'not authenticated'; end if;
  delete from public.battle_players bp using public.battles b
   where bp.battle_id = b.id and b.id = p_id and b.status = 'waiting' and b.kind <> 'knockout_match' and bp.user_id = uid;
end $$;

create or replace function public.battle_start_now(p_id uuid, p_fill boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); b public.battles; cnt int;
begin
  if uid is null or not public.aal_ok() then raise exception 'not authenticated'; end if;
  select * into b from public.battles where id = p_id for update;
  if not found or b.status <> 'waiting' then return; end if;
  if b.kind <> 'quick' then raise exception 'scheduled events start on time'; end if;
  if not exists (select 1 from public.battle_players where battle_id = b.id and user_id = uid) then raise exception 'join the battle first'; end if;
  if b.host is distinct from uid and b.created_at > now() - interval '20 seconds' then raise exception 'give others a few seconds to join'; end if;
  select count(*) into cnt from public.battle_players where battle_id = b.id;
  if not p_fill and cnt < 2 then raise exception 'you need at least one opponent'; end if;
  perform public._battle_start(b.id, p_fill);
end $$;

create or replace function public.battle_answer(p_id uuid, p_q int, p_choice int) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); b public.battles; s int; ws timestamptz; key int; opts int;
begin
  if uid is null or not public.aal_ok() then raise exception 'not authenticated'; end if;
  select * into b from public.battles where id = p_id;
  if not found or b.status <> 'live' then raise exception 'battle is not live'; end if;
  select seat into s from public.battle_players where battle_id = b.id and user_id = uid;
  if s is null then raise exception 'you are not in this battle'; end if;
  if p_q is null or p_q < 0 or p_q >= cardinality(b.q_ids) then raise exception 'invalid question'; end if;
  ws := b.started_at + make_interval(secs => p_q * (b.q_seconds + b.gap_seconds));
  if now() < ws or now() > ws + make_interval(secs => b.q_seconds) + interval '750 milliseconds' then raise exception 'time is up for this question'; end if;
  select correct, jsonb_array_length(options) into key, opts from public.bank_questions where id = b.q_ids[p_q + 1];
  if p_choice is null or p_choice < 0 or p_choice >= opts then raise exception 'invalid choice'; end if;
  insert into public.battle_answers (battle_id, seat, q_index, choice, correct, answered_at)
  values (b.id, s, p_q, p_choice, p_choice = key, least(now(), ws + make_interval(secs => b.q_seconds)))
  on conflict do nothing;
  if not found then raise exception 'already answered'; end if;
end $$;

create or replace function public.battle_state(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); b public.battles; me int; host boolean; n int; e numeric; idx int; within numeric;
  q public.bank_questions; res jsonb; players jsonb; question jsonb := null; reveal jsonb := null; my_choice int; cnt int; humans int;
begin
  if uid is null or not public.aal_ok() then raise exception 'not authenticated'; end if;
  perform public._battle_tick(p_id);
  select * into b from public.battles where id = p_id;
  if not found then raise exception 'battle not found'; end if;
  select seat into me from public.battle_players where battle_id = b.id and user_id = uid;
  host := coalesce(b.host = uid, false);
  if b.is_private and me is null and not host then raise exception 'this room needs an invite code'; end if;
  n := cardinality(b.q_ids);
  select count(*), count(*) filter (where user_id is not null) into cnt, humans from public.battle_players where battle_id = b.id;

  with s as (select * from public._battle_scores(b.id, now())),
  p as (select bp.seat, case when bp.user_id is null then bp.bot_name else public.display_name(bp.user_id) end as name,
               bp.user_id is null as bot, bp.seat = me as is_me, coalesce(s.score, 0) as score, coalesce(s.correct, 0) as correct, coalesce(s.time_ms, 0) as time_ms,
               bp.place, bp.rating_after - bp.rating_before as delta
        from public.battle_players bp left join s on s.seat = bp.seat where bp.battle_id = b.id),
  r as (select p.*, rank() over (order by score desc, time_ms asc) as live_place from p)
  select coalesce(jsonb_agg(jsonb_build_object('seat', seat, 'name', name, 'bot', bot, 'me', is_me, 'score', score, 'correct', correct,
           'place', coalesce(place, live_place), 'delta', delta) order by coalesce(place, live_place), seat), '[]')
  into players from r where live_place <= 25 or is_me;

  if b.status = 'live' and now() >= b.started_at then
    e := extract(epoch from now() - b.started_at);
    idx := floor(e / (b.q_seconds + b.gap_seconds));
    within := e - idx * (b.q_seconds + b.gap_seconds);
    if idx < n then
      select * into q from public.bank_questions where id = b.q_ids[idx + 1];
      select choice into my_choice from public.battle_answers where battle_id = b.id and seat = me and q_index = idx;
      if within < b.q_seconds then
        if me is not null then
          question := jsonb_build_object('index', idx, 'prompt', q.prompt, 'context', q.context, 'options', q.options, 'skill', q.skill,
            'ends_at', b.started_at + make_interval(secs => idx * (b.q_seconds + b.gap_seconds) + b.q_seconds), 'my_choice', my_choice);
        else
          question := jsonb_build_object('index', idx, 'skill', q.skill,
            'ends_at', b.started_at + make_interval(secs => idx * (b.q_seconds + b.gap_seconds) + b.q_seconds));
        end if;
      else
        reveal := jsonb_build_object('index', idx, 'prompt', q.prompt, 'options', q.options, 'correct', q.correct, 'my_choice', my_choice,
          'first', (select case when bp.user_id is null then bp.bot_name else public.display_name(bp.user_id) end
                    from public.battle_answers ba join public.battle_players bp on bp.battle_id = ba.battle_id and bp.seat = ba.seat
                    where ba.battle_id = b.id and ba.q_index = idx and ba.correct order by ba.answered_at limit 1),
          'next_at', b.started_at + make_interval(secs => (idx + 1) * (b.q_seconds + b.gap_seconds)));
      end if;
    end if;
  end if;

  res := jsonb_build_object(
    'id', b.id, 'kind', b.kind, 'scoring', b.scoring, 'domain', b.domain, 'size', b.size, 'status', b.status, 'title', b.title,
    'is_private', b.is_private, 'code', case when me is not null or host then b.code end, 'host', host,
    'scheduled_at', b.scheduled_at, 'started_at', b.started_at, 'created_at', b.created_at, 'ends_at', case when b.started_at is not null then public._battle_end(b) end,
    'q_seconds', b.q_seconds, 'n_q', n, 'ranked', b.ranked, 'knockout_id', b.knockout_id,
    'now', now(), 'me', me, 'count', cnt, 'humans', humans, 'players', players, 'question', question, 'reveal', reveal);
  return res;
end $$;

create or replace function public.battle_hub() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not public.aal_ok() then raise exception 'not authenticated'; end if;
  return jsonb_build_object(
    'rating', (select to_jsonb(r) - 'user_id' from public.battle_ratings r where r.user_id = uid),
    'arena_place', (select count(*) + 1 from public.battle_ratings o where o.played > 0
                     and o.rating > (select rating from public.battle_ratings where user_id = uid)),
    'active', (select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'title', b.title, 'status', b.status, 'kind', b.kind)), '[]')
               from public.battles b join public.battle_players bp on bp.battle_id = b.id
               where bp.user_id = uid and b.status in ('waiting', 'live') and (b.kind = 'quick' or b.status = 'live'
                 or (b.kind = 'knockout_match' and b.scheduled_at < now() + interval '2 minutes'))),
    'events', (select coalesce(jsonb_agg(x order by x->>'starts_at'), '[]') from (
        select jsonb_build_object('type', case when b.scoring = 'fff' then 'fff' else 'showdown' end, 'id', b.id, 'title', b.title, 'domain', b.domain,
          'starts_at', b.scheduled_at, 'status', b.status, 'size', b.size, 'is_private', b.is_private, 'code', case when b.host = uid then b.code end,
          'count', (select count(*) from public.battle_players bp where bp.battle_id = b.id),
          'joined', exists (select 1 from public.battle_players bp where bp.battle_id = b.id and bp.user_id = uid)) as x
        from public.battles b
        where b.kind = 'showdown' and (b.status = 'live' or (b.status = 'waiting' and b.scheduled_at < now() + interval '8 days'))
          and (not b.is_private or b.host = uid or exists (select 1 from public.battle_players bp where bp.battle_id = b.id and bp.user_id = uid))
        union all
        select jsonb_build_object('type', 'knockout', 'id', k.id, 'title', k.title, 'domain', k.domain, 'starts_at', k.starts_at, 'status', k.status,
          'size', k.size, 'is_private', k.is_private, 'code', case when k.host = uid then k.code end,
          'count', (select count(*) from public.knockout_entries e where e.knockout_id = k.id),
          'joined', exists (select 1 from public.knockout_entries e where e.knockout_id = k.id and e.user_id = uid))
        from public.knockouts k
        where (k.status = 'running' or (k.status = 'open' and k.starts_at < now() + interval '8 days'))
          and (not k.is_private or k.host = uid or exists (select 1 from public.knockout_entries e where e.knockout_id = k.id and e.user_id = uid))
      ) ev),
    'recent', (select coalesce(jsonb_agg(x order by x->>'at' desc), '[]') from (
        select jsonb_build_object('id', b.id, 'title', b.title, 'scoring', b.scoring, 'domain', b.domain, 'at', b.finished_at, 'place', bp.place,
          'count', (select count(*) from public.battle_players o where o.battle_id = b.id), 'delta', bp.rating_after - bp.rating_before) as x
        from public.battles b join public.battle_players bp on bp.battle_id = b.id
        where bp.user_id = uid and b.status = 'finished' order by b.finished_at desc limit 10) rr)
  );
end $$;

create or replace function public.host_event(p_type text, p_domain text, p_starts_at timestamptz, p_size int, p_title text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c text; bid uuid; kid uuid; t text := trim(coalesce(p_title, ''));
begin
  if uid is null or not public.aal_ok() then raise exception 'not authenticated'; end if;
  if p_type not in ('showdown', 'fff', 'knockout') or not public.valid_domain(p_domain) then raise exception 'invalid event settings'; end if;
  if char_length(t) < 3 or char_length(t) > 60 then raise exception 'give the event a name (3–60 characters)'; end if;
  if p_starts_at < now() + interval '2 minutes' or p_starts_at > now() + interval '30 days' then raise exception 'pick a start time between 2 minutes and 30 days from now'; end if;
  if (select count(*) from public.battles where host = uid and kind = 'showdown' and status = 'waiting')
     + (select count(*) from public.knockouts where host = uid and status = 'open') >= 5 then raise exception 'you already host 5 upcoming events'; end if;
  c := public.new_code();
  if p_type = 'knockout' then
    if p_size not in (4, 8, 16, 32) then raise exception 'knockouts take 4, 8, 16 or 32 players'; end if;
    insert into public.knockouts (title, domain, size, is_private, code, host, starts_at) values (t, p_domain, p_size, true, c, uid, p_starts_at) returning id into kid;
    insert into public.knockout_entries (knockout_id, user_id) values (kid, uid);
    return jsonb_build_object('type', 'knockout', 'id', kid, 'code', c);
  end if;
  if p_size < 2 or p_size > 500 then raise exception 'events take 2 to 500 players'; end if;
  insert into public.battles (kind, scoring, domain, size, title, is_private, code, host, scheduled_at, q_seconds)
  values ('showdown', case when p_type = 'fff' then 'fff' else 'classic' end, p_domain, p_size, t, true, c, uid, p_starts_at, case when p_type = 'fff' then 15 else 20 end)
  returning id into bid;
  insert into public.battle_players (battle_id, seat, user_id) values (bid, 1, uid);
  return jsonb_build_object('type', p_type, 'id', bid, 'code', c);
end $$;

-- ---------- Public RPCs: knockouts ----------
create or replace function public.ko_join(p_id uuid default null, p_code text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); k public.knockouts;
begin
  if uid is null or not public.aal_ok() then raise exception 'not authenticated'; end if;
  if p_code is not null then select * into k from public.knockouts where code = upper(trim(p_code)) for update;
  else select * into k from public.knockouts where id = p_id for update; end if;
  if not found then raise exception 'no knockout with that code'; end if;
  if exists (select 1 from public.knockout_entries where knockout_id = k.id and user_id = uid) then return k.id; end if;
  if k.is_private and (p_code is null or upper(trim(p_code)) <> k.code) and k.host is distinct from uid then raise exception 'this knockout needs an invite code'; end if;
  if k.status <> 'open' or now() >= k.starts_at then raise exception 'entries are closed'; end if;
  if (select count(*) from public.knockout_entries where knockout_id = k.id) >= k.size then raise exception 'this bracket is full'; end if;
  insert into public.knockout_entries (knockout_id, user_id) values (k.id, uid);
  return k.id;
end $$;

create or replace function public.ko_leave(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not public.aal_ok() then raise exception 'not authenticated'; end if;
  delete from public.knockout_entries e using public.knockouts k
   where e.knockout_id = k.id and k.id = p_id and k.status = 'open' and e.user_id = uid;
end $$;

create or replace function public.ko_state(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); k public.knockouts; joined boolean;
begin
  if uid is null or not public.aal_ok() then raise exception 'not authenticated'; end if;
  perform public._ko_tick(p_id);
  select * into k from public.knockouts where id = p_id;
  if not found then raise exception 'knockout not found'; end if;
  joined := exists (select 1 from public.knockout_entries where knockout_id = k.id and user_id = uid);
  if k.is_private and not joined and k.host is distinct from uid then raise exception 'this knockout needs an invite code'; end if;
  return jsonb_build_object(
    'id', k.id, 'title', k.title, 'domain', k.domain, 'scoring', k.scoring, 'size', k.size, 'bracket', k.bracket, 'status', k.status,
    'is_private', k.is_private, 'code', case when joined or k.host = uid then k.code end, 'host', k.host = uid, 'starts_at', k.starts_at,
    'champion', case when k.champion is not null then public.display_name(k.champion) end, 'champion_me', k.champion = uid,
    'now', now(), 'joined', joined,
    'entries', (select coalesce(jsonb_agg(jsonb_build_object('name', public.display_name(e.user_id), 'me', e.user_id = uid, 'seed', e.seed) order by e.seed nulls last, e.joined_at), '[]')
                from public.knockout_entries e where e.knockout_id = k.id),
    'matches', (select coalesce(jsonb_agg(jsonb_build_object('round', m.round, 'slot', m.slot,
                  'p1', case when m.p1 is not null then public.display_name(m.p1) end, 'p2', case when m.p2 is not null then public.display_name(m.p2) end,
                  'me1', m.p1 = uid, 'me2', m.p2 = uid, 'winner', case when m.winner is null then null when m.winner = m.p1 then 1 else 2 end,
                  'battle_id', m.battle_id, 'battle_status', (select status from public.battles where id = m.battle_id), 'starts_at', m.starts_at,
                  'score1', (select score from public._battle_scores(m.battle_id, now()) where seat = 1),
                  'score2', (select score from public._battle_scores(m.battle_id, now()) where seat = 2)) order by m.round, m.slot), '[]')
                from public.knockout_matches m where m.knockout_id = k.id)
  );
end $$;

-- ---------- Leaderboards ----------
create or replace function public.leaderboard_v2(p_kind text, p_key text default null, p_city text default null, p_limit int default 50)
returns table (place bigint, name text, city text, score int, detail text, is_me boolean, total bigint)
language sql stable security definer set search_path = '' as $$
  with base as (
    select r.user_id, max(r.score) as sc, (array_agg(r.field order by r.score desc))[1] as dt
      from public.ratings r where p_kind = 'overall' group by r.user_id
    union all
    select r.user_id, r.score, r.entries || case when r.entries = 1 then ' tournament' else ' tournaments' end
      from public.ratings r where p_kind = 'domain' and r.field = p_key
    union all
    select s.user_id, s.score, s.correct || '/' || s.attempted || ' correct'
      from public.skill_stats s where p_kind = 'skill' and s.skill = p_key and s.attempted >= 3
    union all
    select b.user_id, b.rating, b.wins || ' wins · ' || b.played || ' played'
      from public.battle_ratings b where p_kind = 'arena' and b.played > 0
  ),
  j as (
    select base.user_id, base.sc, base.dt, pr.visibility, pr.full_name, pr.show_city, pr.city as pcity
    from base join public.profiles pr on pr.id = base.user_id
    where nullif(lower(trim(p_city)), '') is null or (pr.show_city and lower(trim(pr.city)) = lower(trim(p_city)))
  ),
  rk as (select j.*, rank() over (order by j.sc desc) as rnk, count(*) over () as tot from j)
  select rk.rnk,
         case when rk.user_id = auth.uid() then coalesce(rk.full_name, 'You') || ' (you)'
              when rk.visibility = 'public' then coalesce(rk.full_name, 'Competitor') else 'Hidden competitor' end,
         case when rk.visibility = 'public' and rk.show_city then rk.pcity end,
         rk.sc, rk.dt, coalesce(rk.user_id = auth.uid(), false), rk.tot
  from rk where rk.rnk <= least(greatest(coalesce(p_limit, 50), 1), 100) or rk.user_id = auth.uid()
  order by rk.rnk, (rk.user_id = auth.uid()) desc nulls last;
$$;

create or replace function public.skills_list() returns table (skill text, domain text)
language sql stable security definer set search_path = '' as $$
  select skill, min(domain) from (
    select skill, domain from public.bank_questions where active
    union all select q.skill, t.cat from public.questions q join public.tournaments t on t.id = q.tournament_id where q.skill is not null) s
  group by skill order by min(domain), skill;
$$;

-- ---------- Scheduler ----------
create or replace function public.tick_all() returns void
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in select id from public.knockouts where status = 'running' or (status = 'open' and starts_at <= now()) loop
    begin perform public._ko_tick(r.id); exception when others then raise warning 'ko tick % failed: %', r.id, sqlerrm; end;
  end loop;
  for r in select id from public.battles b
           where (b.status = 'waiting' and b.scheduled_at <= now())
              or (b.status = 'live' and public._battle_end(b) <= now())
              or (b.status = 'waiting' and b.kind = 'quick' and b.created_at < now() - interval '15 minutes') loop
    begin perform public._battle_tick(r.id); exception when others then raise warning 'battle tick % failed: %', r.id, sqlerrm; end;
  end loop;
end $$;

-- Keeps a week of public events on the calendar.
create or replace function public.schedule_events() returns void
language plpgsql security definer set search_path = '' as $$
declare d date; i int; doms text[] := array['marketing','data','product','sales','ops','design','tech','hr'];
  labels text[] := array['Marketing','Data','Product','Sales','Operations','Design','Tech','People Ops']; dom int; at timestamptz;
begin
  for i in 0 .. 7 loop
    d := (now() at time zone 'Asia/Kolkata')::date + i;
    dom := 1 + (extract(doy from d)::int % 8);
    at := (d + time '21:00') at time zone 'Asia/Kolkata';
    if at > now() and not exists (select 1 from public.battles where kind = 'showdown' and host is null and scheduled_at = at) then
      insert into public.battles (kind, scoring, domain, size, title, scheduled_at, q_seconds)
      values ('showdown', 'fff', doms[dom], 300, 'Fastest Finger · ' || labels[dom], at, 15);
    end if;
    if extract(isodow from d) = 6 then
      at := (d + time '20:00') at time zone 'Asia/Kolkata';
      if at > now() and not exists (select 1 from public.battles where kind = 'showdown' and host is null and scheduled_at = at) then
        insert into public.battles (kind, scoring, domain, size, title, scheduled_at) values ('showdown', 'classic', 'mixed', 500, 'Saturday Showdown · All fields', at);
      end if;
    end if;
    if extract(isodow from d) in (3, 7) then
      at := (d + time '19:00') at time zone 'Asia/Kolkata';
      if at > now() and not exists (select 1 from public.knockouts where host is null and starts_at = at) then
        insert into public.knockouts (title, domain, size, starts_at)
        values (case when extract(isodow from d) = 7 then 'Sunday Knockout Cup · ' || labels[dom] else 'Midweek Knockout · All fields' end,
                case when extract(isodow from d) = 7 then doms[dom] else 'mixed' end,
                case when extract(isodow from d) = 7 then 16 else 8 end, at);
      end if;
    end if;
  end loop;
end $$;

-- ---------- Permissions ----------
revoke execute on all functions in schema public from public, anon;
grant execute on function public.aal_ok(), public.tournament_counts(), public.leaderboard(text, int),
  public.leaderboard_v2(text, text, text, int), public.skills_list() to anon, authenticated;
grant execute on function public.start_entry(text), public.submit_entry(text, jsonb), public.my_standing(text),
  public.my_rank(text), public.apply_to_job(text, text), public.delete_my_account(),
  public.battle_quick(int, text, text), public.battle_room(int, text, text), public.battle_join(uuid, text), public.battle_leave(uuid),
  public.battle_start_now(uuid, boolean), public.battle_answer(uuid, int, int), public.battle_state(uuid), public.battle_hub(),
  public.host_event(text, text, timestamptz, int, text), public.ko_join(uuid, text), public.ko_leave(uuid), public.ko_state(uuid)
  to authenticated;
revoke execute on function public.handle_new_user(), public.touch_updated_at() from authenticated;
revoke execute on function public.display_name(uuid), public.valid_domain(text), public.new_code(), public.bump_skill(uuid, text, text, int, int),
  public._battle_end(public.battles), public._battle_scores(uuid, timestamptz), public._battle_start(uuid, boolean), public._battle_finish(uuid),
  public._battle_tick(uuid), public._ko_make_match(public.knockouts, int, int, uuid, uuid, timestamptz), public._ko_tick(uuid), public._seat(uuid, uuid),
  public.tick_all(), public.schedule_events() from authenticated;

select cron.schedule('rc-tick', '* * * * *', 'select public.tick_all()');
select cron.schedule('rc-schedule', '5 0 * * *', 'select public.schedule_events()');
