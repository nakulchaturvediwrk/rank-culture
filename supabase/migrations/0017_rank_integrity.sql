-- 0017: rank integrity fixes from the 11 Nov 2026 anti-cheat audit. Safe to re-run.
--
-- R1  Skill leaderboard farming: path_answer could be called again and again on one question
--     (the reply even contains the right answer), and every battle re-counted questions a player
--     had already seen and been shown the answer to. A fresh account reached 40/41 in SEO from a
--     single question. Now only the FIRST time a player meets a question counts towards skill stats,
--     and a practice question answered correctly can't be answered again.
-- R2  Elo farming with spare accounts: user-hosted (private) showdowns, Fastest Finger rooms and
--     knockouts were ranked whenever 2+ humans played. Private events are now never ranked.
-- R3  Elo farming in public matchmaking: two accounts queueing together on a quiet pack get paired.
--     Rating only moves against opponents you've met fewer than 3 times in ranked games in 24 hours.
-- R4  integrity_review: an admin-only view that flags inhumanly fast, accurate answering for review.

-- ---------------------------------------------------------------- R1
create table if not exists public.skill_seen (
  user_id uuid not null references auth.users on delete cascade,
  source text not null check (source in ('bank', 'path')),
  item_id bigint not null,
  first_at timestamptz not null default now(),
  primary key (user_id, source, item_id)
);
alter table public.skill_seen enable row level security;
revoke all on public.skill_seen from public, anon, authenticated;

-- Questions already met before this fix count as seen, so history can't be replayed either.
insert into public.skill_seen (user_id, source, item_id)
select distinct bp.user_id, 'bank', u.qid
  from public.battle_players bp join public.battles b on b.id = bp.battle_id
  cross join lateral unnest(b.q_ids) u(qid)
 where bp.user_id is not null and b.status = 'finished' and b.q_ids is not null
on conflict do nothing;
insert into public.skill_seen (user_id, source, item_id)
select user_id, 'path', item_id from public.path_attempts where kind = 'mcq'
on conflict do nothing;

create or replace function public.path_answer(p_item bigint, p_choice integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); i public.path_items; prev public.path_attempts; ok boolean; up boolean; lvl smallint; fresh int;
begin
  if uid is null or not public.aal_ok() then raise exception 'not signed in'; end if;
  select * into i from public.path_items where id = p_item and active and kind = 'mcq';
  if not found then raise exception 'question not found'; end if;
  if not exists (select 1 from public.user_paths where user_id = uid and field = i.domain) then raise exception 'this question is not on your path'; end if;
  if p_choice is null or p_choice < 0 or p_choice >= jsonb_array_length(i.options) then raise exception 'invalid choice'; end if;
  select * into prev from public.path_attempts where user_id = uid and item_id = i.id;
  if found and prev.correct then raise exception 'already answered'; end if;
  if found and prev.created_at > now() - interval '1 day' then raise exception 'try this one again tomorrow'; end if;
  ok := p_choice = i.correct;
  select level into lvl from public.user_paths where user_id = uid;
  insert into public.path_attempts (user_id, item_id, level, kind, correct) values (uid, i.id, least(lvl, 5), 'mcq', ok)
  on conflict (user_id, item_id) do update set correct = excluded.correct, level = excluded.level, created_at = now();
  insert into public.skill_seen (user_id, source, item_id) values (uid, 'path', i.id) on conflict do nothing;
  get diagnostics fresh = row_count;
  if fresh > 0 then
    insert into public.skill_stats (user_id, skill, domain, attempted, correct) values (uid, i.skill, i.domain, 1, case when ok then 1 else 0 end)
    on conflict (user_id, skill) do update set attempted = public.skill_stats.attempted + 1, correct = public.skill_stats.correct + excluded.correct, updated_at = now();
  end if;
  up := public._path_maybe_level_up(uid);
  return jsonb_build_object('correct', ok, 'answer', i.correct, 'explanation', i.explanation, 'leveled_up', up, 'state', public._path_progress(uid));
end $$;
revoke execute on function public.path_answer(bigint, integer) from public, anon;
grant execute on function public.path_answer(bigint, integer) to authenticated;

-- ---------------------------------------------------------------- R1 + R3 (battle finish)
create or replace function public._battle_finish(p_bid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare b public.battles; n int;
begin
  select * into b from public.battles where id = p_bid;
  if b.status <> 'live' then return; end if;
  with s as (select * from public._battle_scores(b.id, 'infinity')),
       ans as (select ba.seat, count(*) as answered from public.battle_answers ba where ba.battle_id = b.id group by ba.seat),
       rk as (select s.seat, rank() over (order by s.score desc, s.time_ms asc, coalesce(ans.answered, 0) desc) as pl
              from s left join ans on ans.seat = s.seat)
  update public.battle_players bp set place = rk.pl from rk where bp.battle_id = b.id and bp.seat = rk.seat;

  -- Skill stats: only questions this player is meeting for the first time.
  with fresh as (
    insert into public.skill_seen (user_id, source, item_id)
    select distinct bp.user_id, 'bank', u.qid
      from public.battle_players bp cross join lateral unnest(b.q_ids) u(qid)
     where bp.battle_id = b.id and bp.user_id is not null
    on conflict do nothing
    returning user_id, item_id
  )
  insert into public.skill_stats (user_id, skill, domain, attempted, correct)
  select bp.user_id, q.skill, max(q.domain), count(*), count(*) filter (where ba.correct)
  from public.battle_players bp
  cross join lateral unnest(b.q_ids) with ordinality as u(qid, ord)
  join fresh f on f.user_id = bp.user_id and f.item_id = u.qid
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
    met as (  -- ranked games each pair already played together in the last 24 hours
      select h1.user_id u1, h2.user_id u2,
             (select count(*) from public.battle_players x join public.battle_players y on y.battle_id = x.battle_id
                join public.battles bb on bb.id = x.battle_id
               where x.user_id = h1.user_id and y.user_id = h2.user_id and bb.id <> b.id
                 and bb.ranked and bb.status = 'finished' and bb.finished_at > now() - interval '24 hours') as games
        from h h1 join h h2 on h1.user_id <> h2.user_id
    ),
    d as (select h1.user_id, h1.rating,
            coalesce(round(32.0 / (n - 1) * sum(case when m.games < 3 then
              (case when h1.place < h2.place then 1 when h1.place = h2.place then 0.5 else 0 end)
              - 1 / (1 + power(10, (h2.rating - h1.rating) / 400.0)) else 0 end))::int, 0) as delta
          from h h1 join h h2 on h1.user_id <> h2.user_id
          join met m on m.u1 = h1.user_id and m.u2 = h2.user_id
          group by h1.user_id, h1.rating)
    update public.battle_players bp set rating_before = d.rating, rating_after = d.rating + d.delta
    from d where bp.battle_id = b.id and bp.user_id = d.user_id;
    update public.battle_ratings br set rating = bp.rating_after, played = br.played + 1, wins = br.wins + (bp.place = 1)::int, updated_at = now()
    from public.battle_players bp where bp.battle_id = b.id and bp.user_id = br.user_id;
  end if;
  update public.battles set status = 'finished', finished_at = now() where id = b.id;
end $$;
revoke execute on function public._battle_finish(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- R2 (private events never ranked)
create or replace function public._battle_start(p_bid uuid, p_fill boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  b public.battles; humans int; seats int; target int; i int; k int; nq int; qids bigint[];
  bots text[] := array['Nova','Atlas','Echo','Orbit','Pixel','Quartz','Rocket','Sable','Tango','Vega','Willow','Zen'];
  r record; ws timestamptz; opts int; priv boolean;
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
           where active and case when b.domain like 'pack:%' then pack = substr(b.domain, 6)
                                 else pack is null and (b.domain = 'mixed' or domain = b.domain) end
           order by random() limit nq) s);
  if cardinality(qids) < 3 then
    update public.battles set status = 'cancelled', finished_at = now() where id = b.id;
    return;
  end if;
  priv := b.is_private or coalesce((select k2.is_private from public.knockouts k2 where k2.id = b.knockout_id), false);
  update public.battles set status = 'live', started_at = now() + interval '8 seconds', q_ids = qids,
         ranked = humans >= 2 and not priv
  where id = b.id returning * into b;
  for r in select seat, bot_acc from public.battle_players where battle_id = b.id and user_id is null loop
    for k in 0 .. cardinality(qids) - 1 loop
      continue when random() < 0.08;
      ws := b.started_at + make_interval(secs => k * (b.q_seconds + b.gap_seconds));
      select jsonb_array_length(options), correct into opts, i from public.bank_questions where id = qids[k + 1];
      insert into public.battle_answers (battle_id, seat, q_index, choice, correct, answered_at)
      select b.id, r.seat, k, c, c = i, ws + make_interval(secs => 1.5 + random() * (b.q_seconds - 3))
      from (select case when random() < r.bot_acc then i else (i + 1 + floor(random() * (opts - 1))::int) % opts end as c) x;
    end loop;
  end loop;
end $$;
revoke execute on function public._battle_start(uuid, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------- R4 (review queue, admin only)
-- Read it in the Supabase SQL editor or Table Editor: select * from public.integrity_review;
create or replace view public.integrity_review with (security_invoker = true) as
with battle_speed as (
  select bp.user_id,
         count(*) as answers,
         round(avg(ba.correct::int) * 100) as accuracy_pct,
         round(percentile_cont(0.5) within group (order by extract(epoch from
           ba.answered_at - (b.started_at + make_interval(secs => ba.q_index * (b.q_seconds + b.gap_seconds))))) * 1000) as median_ms
    from public.battle_answers ba
    join public.battles b on b.id = ba.battle_id
    join public.battle_players bp on bp.battle_id = ba.battle_id and bp.seat = ba.seat
   where bp.user_id is not null and b.finished_at > now() - interval '30 days'
   group by bp.user_id
),
tournament_speed as (
  select e.user_id, e.tournament_id,
         round(100.0 * e.auto_points / nullif(e.auto_max, 0)) as score_pct,
         round(extract(epoch from e.submitted_at - r.started_at)) as seconds_taken
    from public.entries e join public.registrations r on r.user_id = e.user_id and r.tournament_id = e.tournament_id
   where e.submitted_at > now() - interval '60 days'
)
select 'battle' as kind, s.user_id, p.full_name, u.email, null::text as tournament,
       format('%s answers, %s%% right, median %s ms', s.answers, s.accuracy_pct, s.median_ms) as detail
  from battle_speed s join public.profiles p on p.id = s.user_id join auth.users u on u.id = s.user_id
 where s.answers >= 10 and s.accuracy_pct >= 90 and s.median_ms < 2500
union all
select 'tournament', t.user_id, p.full_name, u.email, t.tournament_id,
       format('%s%% in %s s', t.score_pct, t.seconds_taken)
  from tournament_speed t join public.profiles p on p.id = t.user_id join auth.users u on u.id = t.user_id
 where t.score_pct = 100 and t.seconds_taken < 60;
revoke all on public.integrity_review from public, anon, authenticated;
