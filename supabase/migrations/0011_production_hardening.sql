-- 0011 Production hardening (8 Nov 2026 audit)

-- 1. Tournament prompts stay hidden until YOUR timer starts.
--    Before: any signed-in user could read every prompt the moment a tournament opened,
--    study them for days, then start the clock. Now prompts unlock only after start_entry()
--    (or once the tournament has closed). Task titles for the detail page come from tournament_tasks().
drop policy if exists "open questions readable" on public.questions;
drop policy if exists "questions after my timer starts" on public.questions; -- safe to re-run
create policy "questions after my timer starts" on public.questions for select to authenticated using (
  (select public.aal_ok()) and (
    exists (select 1 from public.registrations r
             where r.tournament_id = questions.tournament_id and r.user_id = (select auth.uid()) and r.started_at is not null)
    or exists (select 1 from public.tournaments t where t.id = questions.tournament_id and t.closes_at <= now())
  ));
create index if not exists registrations_tournament_started_idx on public.registrations (tournament_id, user_id) where started_at is not null;

create or replace function public.tournament_tasks(p_tournament text)
returns table (label text, kind text, points int)
language sql stable security definer set search_path = '' as $$
  select q.label, q.kind, q.points
    from public.questions q join public.tournaments t on t.id = q.tournament_id
   where q.tournament_id = p_tournament and t.opens_at <= now()
   order by q.position;
$$;
revoke all on function public.tournament_tasks(text) from public, anon;
grant execute on function public.tournament_tasks(text) to authenticated;

-- 2. Remove the unused v1 leaderboard (leaderboard_v2 replaced it).
drop function if exists public.leaderboard(text, integer);

-- 3. Least-privilege table grants. RLS already blocked these, but grants are the second lock.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
revoke all on public.questions from anon;
revoke insert, update on public.applications from authenticated;          -- apply_to_job() is the only way in
revoke insert, update on public.registrations from authenticated;
grant insert (user_id, tournament_id) on public.registrations to authenticated; -- started_at is server-only

-- 4. Contact / support / waitlist messages (the contact form used to go nowhere).
create table if not exists public.contact_messages (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete cascade,
  topic text not null check (topic in ('candidate','dispute','employer','college','investor','press','pro-waitlist','other')),
  name text not null check (char_length(name) between 1 and 80),
  email text not null check (char_length(email) between 3 and 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  message text not null check (char_length(message) between 1 and 4000),
  handled boolean not null default false
);
alter table public.contact_messages enable row level security; -- no policies: server-only, read it in the dashboard
revoke all on public.contact_messages from anon, authenticated;
create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);
create index if not exists contact_messages_email_idx on public.contact_messages (lower(email), created_at);
create index if not exists contact_messages_user_idx on public.contact_messages (user_id);

create or replace function public.send_contact(p_topic text, p_name text, p_email text, p_message text)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); e text := lower(trim(coalesce(p_email, ''))); n text := trim(coalesce(p_name, '')); m text := trim(coalesce(p_message, ''));
begin
  if p_topic is null or p_topic not in ('candidate','dispute','employer','college','investor','press','pro-waitlist','other') then raise exception 'pick a topic'; end if;
  if char_length(n) < 1 or char_length(n) > 80 then raise exception 'enter your name'; end if;
  if char_length(e) > 254 or e !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'enter a valid email'; end if;
  if char_length(m) < 1 or char_length(m) > 4000 then raise exception 'message must be 1–4000 characters'; end if;
  if (select count(*) from public.contact_messages c where lower(c.email) = e and c.created_at > now() - interval '1 hour') >= 5
     or (uid is not null and (select count(*) from public.contact_messages c where c.user_id = uid and c.created_at > now() - interval '1 hour') >= 5)
    then raise exception 'too many messages — please try again in an hour'; end if;
  if (select count(*) from public.contact_messages c where c.created_at > now() - interval '1 hour') >= 300
    then raise exception 'we are getting a lot of messages right now — please try again later'; end if;
  insert into public.contact_messages (user_id, topic, name, email, message) values (uid, p_topic, n, e, m);
end $$;
revoke all on function public.send_contact(text, text, text, text) from public;
grant execute on function public.send_contact(text, text, text, text) to anon, authenticated;

-- 5. Arena Elo can't be farmed with a second account in a private room:
--    private quick rooms are practice (unranked). Public matchmaking, scheduled events and knockouts stay ranked.
CREATE OR REPLACE FUNCTION public._battle_start(p_bid uuid, p_fill boolean)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
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
           where active and case when b.domain like 'pack:%' then pack = substr(b.domain, 6)
                                 else pack is null and (b.domain = 'mixed' or domain = b.domain) end
           order by random() limit nq) s);
  if cardinality(qids) < 3 then
    update public.battles set status = 'cancelled', finished_at = now() where id = b.id;
    return;
  end if;
  update public.battles set status = 'live', started_at = now() + interval '8 seconds', q_ids = qids,
         ranked = humans >= 2 and not (b.kind = 'quick' and b.is_private)
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
end $function$;
revoke all on function public._battle_start(uuid, boolean) from public, anon, authenticated;
