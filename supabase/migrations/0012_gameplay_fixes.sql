-- 0012 Gameplay fixes found by supabase/tests/gameplay.test.mjs (8 Nov 2026)

-- 1. Tournament caps are real. The page showed "N spots left" but nothing stopped entry #N+1.
--    Applies to registering and to starting (start_entry registers on the fly). People already
--    registered can always start or resume.

create or replace function public._registration_cap() returns trigger
language plpgsql security definer set search_path = '' as $$
declare c int;
begin
  if exists (select 1 from public.registrations r where r.user_id = new.user_id and r.tournament_id = new.tournament_id) then return new; end if;
  perform pg_advisory_xact_lock(hashtext('rc-reg:' || new.tournament_id));
  select cap into c from public.tournaments where id = new.tournament_id;
  if c is not null and (select count(*) from public.registrations r where r.tournament_id = new.tournament_id) >= c then
    raise exception 'this tournament is full';
  end if;
  return new;
end $$;
revoke all on function public._registration_cap() from public, anon, authenticated;
drop trigger if exists registration_cap on public.registrations;
create trigger registration_cap before insert on public.registrations for each row execute function public._registration_cap();

-- 2. A no-show can't win a knockout match on seat order. Ties on points and time now go to whoever answered more.
create or replace function public._battle_finish(p_bid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare b public.battles; n int;
begin
  select * into b from public.battles where id = p_bid;
  if b.status <> 'live' then return; end if;
  with s as (select * from public._battle_scores(b.id, 'infinity')),
       ans as (select ba.seat, count(*) as answered from public.battle_answers ba where ba.battle_id = b.id group by ba.seat),
       rk as (select s.seat, rank() over (order by s.score desc, s.time_ms asc, coalesce(ans.answered, 0) desc) as pl
              from s left join ans on ans.seat = s.seat)
  update public.battle_players bp set place = rk.pl from rk where bp.battle_id = b.id and bp.seat = rk.seat;

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
revoke all on function public._battle_finish(uuid) from public, anon, authenticated;

-- 3. While a question is open, the live scoreboard only counts earlier questions, so nobody learns
--    from a rival's jump in points that they've already got this one right.
create or replace function public.battle_state(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); b public.battles; me int; host boolean; n int; e numeric; idx int; within numeric; upto timestamptz;
  q public.bank_questions; res jsonb; players jsonb; question jsonb := null; reveal jsonb := null; my_choice int; cnt int; humans int;
begin
  if uid is null or not public.aal_ok() then raise exception 'not authenticated'; end if;
  select * into b from public.battles where id = p_id;
  if not found then raise exception 'battle not found'; end if;
  -- Only take the row lock when the battle actually needs to move on; hundreds of players poll this every second.
  if (b.status = 'waiting' and (b.scheduled_at <= now() or (b.kind = 'quick' and b.created_at < now() - interval '15 minutes')))
     or (b.status = 'live' and public._battle_end(b) <= now()) then
    perform public._battle_tick(p_id);
    select * into b from public.battles where id = p_id;
  end if;
  select seat into me from public.battle_players where battle_id = b.id and user_id = uid;
  host := coalesce(b.host = uid, false);
  if b.is_private and me is null and not host then raise exception 'this room needs an invite code'; end if;
  n := cardinality(b.q_ids);
  select count(*), count(*) filter (where user_id is not null) into cnt, humans from public.battle_players where battle_id = b.id;

  upto := now();
  if b.status = 'live' and now() >= b.started_at then
    e := extract(epoch from now() - b.started_at);
    idx := floor(e / (b.q_seconds + b.gap_seconds));
    within := e - idx * (b.q_seconds + b.gap_seconds);
    if idx < n and within < b.q_seconds then upto := b.started_at + make_interval(secs => idx * (b.q_seconds + b.gap_seconds)); end if;
  end if;

  with s as (select * from public._battle_scores(b.id, upto)),
  p as (select bp.seat, case when bp.user_id is null then bp.bot_name else public.display_name(bp.user_id) end as name,
               bp.user_id is null as bot, bp.seat = me as is_me, coalesce(s.score, 0) as score, coalesce(s.correct, 0) as correct, coalesce(s.time_ms, 0) as time_ms,
               bp.place, bp.rating_after - bp.rating_before as delta
        from public.battle_players bp left join s on s.seat = bp.seat where bp.battle_id = b.id),
  r as (select p.*, rank() over (order by score desc, time_ms asc) as live_place from p)
  select coalesce(jsonb_agg(jsonb_build_object('seat', seat, 'name', name, 'bot', bot, 'me', is_me, 'score', score, 'correct', correct,
           'place', coalesce(place, live_place), 'delta', delta) order by coalesce(place, live_place), seat), '[]')
  into players from r where live_place <= 25 or is_me;

  if b.status = 'live' and now() >= b.started_at and idx < n then
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

  res := jsonb_build_object(
    'id', b.id, 'kind', b.kind, 'scoring', b.scoring, 'domain', b.domain, 'size', b.size, 'status', b.status, 'title', b.title,
    'is_private', b.is_private, 'code', case when me is not null or host then b.code end, 'host', host,
    'scheduled_at', b.scheduled_at, 'started_at', b.started_at, 'created_at', b.created_at, 'ends_at', case when b.started_at is not null then public._battle_end(b) end,
    'q_seconds', b.q_seconds, 'n_q', n, 'ranked', b.ranked, 'knockout_id', b.knockout_id,
    'now', now(), 'me', me, 'count', cnt, 'humans', humans, 'players', players, 'question', question, 'reveal', reveal);
  return res;
end $$;
revoke all on function public.battle_state(uuid) from public, anon;
grant execute on function public.battle_state(uuid) to authenticated;
