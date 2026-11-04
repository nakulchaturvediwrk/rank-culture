-- Public, aggregate-only platform numbers for the homepage, and prize copy that promises only what exists.
CREATE OR REPLACE FUNCTION public.site_stats()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'ranked', (select count(distinct user_id) from (select user_id from public.ratings union select user_id from public.battle_ratings where played > 0) u),
    'played', (select count(*) from public.entries) + (select count(*) from public.battle_players bp join public.battles b on b.id = bp.battle_id where b.status = 'finished' and bp.user_id is not null),
    'questions', (select count(*) from public.bank_questions where active) + (select count(*) from public.questions),
    'events', (select count(*) from public.battles where kind = 'showdown' and not is_private and status in ('waiting', 'live') and scheduled_at < now() + interval '7 days')
            + (select count(*) from public.knockouts where not is_private and status in ('open', 'running') and starts_at < now() + interval '7 days')
            + (select count(*) from public.tournaments where ranked and opens_at < now() + interval '7 days' and closes_at > now()));
$function$;
revoke execute on function public.site_stats() from public;
grant execute on function public.site_stats() to anon, authenticated;

update public.tournaments set prize = case id
  when 'growth' then 'Top finishers: fast-track to pilot partner marketing roles'
  when 'sql' then 'Top finishers: fast-track to pilot partner analyst roles'
  when 'ops' then 'Top finishers: fast-track to pilot partner ops roles'
  when 'product' then 'Top finishers: fast-track to pilot partner product roles'
  when 'sales' then 'Top finishers: fast-track to pilot partner sales roles'
  when 'design' then 'Top finishers: fast-track to pilot partner design roles'
  when 'code' then 'Top finishers: fast-track to pilot partner engineering roles'
  when 'hr' then 'Top finishers: fast-track to pilot partner people-ops roles'
  else prize end;
