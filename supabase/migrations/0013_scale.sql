-- 0013 Scale: the public pages (homepage, public leaderboard, tournament list) are the busiest and
-- the same for every visitor, so they read a cache refreshed every minute instead of scanning
-- every rating on each page view. Signed-in leaderboards stay live so "you" is always exact.

create index if not exists battle_ratings_board on public.battle_ratings (rating desc) where played > 0;

create table if not exists public.public_cache (
  key text primary key,
  payload jsonb not null,
  refreshed_at timestamptz not null default now()
);
alter table public.public_cache enable row level security; -- server-only
revoke all on public.public_cache from anon, authenticated;

-- Live versions (unchanged logic), used by the refresher and by signed-in users.
do $$ begin  -- re-runnable
  if to_regprocedure('public._site_stats_live()') is null then alter function public.site_stats() rename to _site_stats_live; end if;
  if to_regprocedure('public._tournament_counts_live()') is null then alter function public.tournament_counts() rename to _tournament_counts_live; end if;
  if to_regprocedure('public._leaderboard_live(text, text, text, integer)') is null then alter function public.leaderboard_v2(text, text, text, integer) rename to _leaderboard_live; end if;
end $$;
revoke all on function public._site_stats_live(), public._tournament_counts_live(), public._leaderboard_live(text, text, text, integer) from public, anon, authenticated;

create or replace function public.refresh_public_cache() returns void
language plpgsql security definer set search_path = '' as $$
declare k text; f text;
begin
  perform set_config('request.jwt.claims', '', true); -- compute as an anonymous visitor
  insert into public.public_cache (key, payload, refreshed_at) values ('site_stats', public._site_stats_live(), now())
    on conflict (key) do update set payload = excluded.payload, refreshed_at = excluded.refreshed_at;
  insert into public.public_cache (key, payload, refreshed_at)
    values ('tournament_counts', coalesce((select jsonb_agg(to_jsonb(t)) from public._tournament_counts_live() t), '[]'), now())
    on conflict (key) do update set payload = excluded.payload, refreshed_at = excluded.refreshed_at;
  for k, f in select x, y from (values ('overall', ''), ('arena', ''), ('domain', 'marketing'), ('domain', 'data'), ('domain', 'product'), ('domain', 'sales'),
                                       ('domain', 'ops'), ('domain', 'design'), ('domain', 'tech'), ('domain', 'hr'), ('domain', 'finance')) v(x, y) loop
    insert into public.public_cache (key, payload, refreshed_at)
      values ('lb:' || k || ':' || f, coalesce((select jsonb_agg(to_jsonb(l) order by l.place) from public._leaderboard_live(k, nullif(f, ''), null, 100) l), '[]'), now())
      on conflict (key) do update set payload = excluded.payload, refreshed_at = excluded.refreshed_at;
  end loop;
end $$;
revoke all on function public.refresh_public_cache() from public, anon, authenticated;

create or replace function public.site_stats() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((select payload from public.public_cache where key = 'site_stats' and refreshed_at > now() - interval '5 minutes'),
                  public._site_stats_live());
$$;

create or replace function public.tournament_counts() returns table (tournament_id text, players bigint)
language plpgsql stable security definer set search_path = '' as $$
declare c jsonb;
begin
  select payload into c from public.public_cache where key = 'tournament_counts' and refreshed_at > now() - interval '5 minutes';
  if c is null then return query select * from public._tournament_counts_live(); return; end if;
  return query select x->>'tournament_id', (x->>'players')::bigint from jsonb_array_elements(c) x;
end $$;

create or replace function public.leaderboard_v2(p_kind text, p_key text default null, p_city text default null, p_limit int default 50)
returns table (place bigint, name text, city text, score integer, detail text, is_me boolean, total bigint)
language plpgsql stable security definer set search_path = '' as $$
declare c jsonb;
begin
  if auth.uid() is null and nullif(trim(coalesce(p_city, '')), '') is null and p_kind in ('overall', 'arena', 'domain') then
    select payload into c from public.public_cache
     where key = 'lb:' || p_kind || ':' || case when p_kind = 'domain' then coalesce(p_key, '') else '' end
       and refreshed_at > now() - interval '5 minutes';
    if c is not null then
      return query select (x->>'place')::bigint, x->>'name', x->>'city', (x->>'score')::int, x->>'detail', false, (x->>'total')::bigint
        from jsonb_array_elements(c) x where (x->>'place')::bigint <= least(greatest(coalesce(p_limit, 50), 1), 100);
      return;
    end if;
  end if;
  return query select * from public._leaderboard_live(p_kind, p_key, p_city, p_limit);
end $$;

revoke all on function public.site_stats(), public.tournament_counts(), public.leaderboard_v2(text, text, text, integer) from public;
grant execute on function public.site_stats(), public.tournament_counts(), public.leaderboard_v2(text, text, text, integer) to anon, authenticated;

select cron.schedule('rc-cache', '* * * * *', 'select public.refresh_public_cache()');
select public.refresh_public_cache();
