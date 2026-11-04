-- Company-style practice packs: original questions that follow a company's publicly described
-- test format. Battles use domain = 'pack:<id>' to draw only from that pack.
create table public.packs (
  id text primary key,
  company text not null,
  name text not null,
  blurb text not null,
  sections text not null,
  source_url text,
  sort int not null default 0,
  active boolean not null default true
);
alter table public.packs enable row level security;
revoke all on public.packs from anon, authenticated;

alter table public.bank_questions add column pack text references public.packs (id);
create index bank_questions_pack on public.bank_questions (pack) where active;

create or replace function public.valid_domain(d text) returns boolean
language sql stable security definer set search_path = '' as $$
  select d in ('mixed', 'marketing', 'data', 'product', 'sales', 'ops', 'design', 'tech', 'hr')
      or exists (select 1 from public.packs p where p.active and 'pack:' || p.id = d);
$$;

create or replace function public.packs_list() returns table (id text, company text, name text, blurb text, sections text, source_url text, questions bigint)
language sql stable security definer set search_path = '' as $$
  select p.id, p.company, p.name, p.blurb, p.sections, p.source_url, (select count(*) from public.bank_questions q where q.pack = p.id and q.active)
  from public.packs p where p.active order by p.sort;
$$;

-- Same as before, except the question pool: packs draw from their own questions; domains never include pack questions.
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
           where active and case when b.domain like 'pack:%' then pack = substr(b.domain, 6)
                                 else pack is null and (b.domain = 'mixed' or domain = b.domain) end
           order by random() limit nq) s);
  if cardinality(qids) < 3 then
    update public.battles set status = 'cancelled', finished_at = now() where id = b.id;
    return;
  end if;
  update public.battles set status = 'live', started_at = now() + interval '8 seconds', q_ids = qids, ranked = humans >= 2
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

revoke execute on function public.valid_domain(text), public._battle_start(uuid, boolean) from public, anon, authenticated;
revoke execute on function public.packs_list() from public;
grant execute on function public.packs_list() to anon, authenticated;
