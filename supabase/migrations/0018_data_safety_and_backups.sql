-- 0018: protect user data from bulk loss, and a read-only export for the Google Drive backup. Safe to re-run.
--
-- D1  Bulk-delete guard: a single statement may not delete rows belonging to more than 5 different players from any
--     user-data table, and TRUNCATE is refused. Deleting one account (and its cascade) still works. A deliberate bulk
--     clean-up must say so in the same transaction:  set local rc.allow_bulk_delete = 'on';
-- D2  Drop guard: dropping a user-data table or one of its columns is refused unless the transaction sets
--     rc.allow_drop = 'on'. (Event trigger; skipped with a notice where the platform doesn't allow event triggers.)
-- D3  Backup export: backup_status() and backup_snapshot() for the Google Apps Script in ops/backup/, gated by a
--     secret token whose SHA-256 hash is stored here (the token itself lives only in Nakul's Apps Script).
--     Read-only, never returns passwords or auth tokens, rate-limited.

-- ---------------------------------------------------------------- D1
create or replace function public._guard_bulk_delete() returns trigger
language plpgsql set search_path = '' as $$
declare players int; rows_gone int;
begin
  if coalesce(current_setting('rc.allow_bulk_delete', true), '') = 'on' then return null; end if;
  if tg_op = 'TRUNCATE' then
    raise exception 'TRUNCATE on % is blocked to protect user data. If this is really intended, run "set local rc.allow_bulk_delete = ''on''" in the same transaction.', tg_table_name;
  end if;
  execute format('select count(distinct (to_jsonb(o) ->> %L)), count(*) from old_rows o', tg_argv[0]) into players, rows_gone;
  if players > 5 then
    raise exception 'Deleting % rows for % players from % in one go is blocked to protect user data. If this is really intended, run "set local rc.allow_bulk_delete = ''on''" in the same transaction.', rows_gone, players, tg_table_name;
  end if;
  return null;
end $$;
revoke execute on function public._guard_bulk_delete() from public, anon, authenticated;

do $$
declare t record;
begin
  for t in select * from (values
      ('profiles', 'id'), ('ratings', 'user_id'), ('entries', 'user_id'), ('registrations', 'user_id'),
      ('applications', 'user_id'), ('skill_stats', 'user_id'), ('battle_ratings', 'user_id'), ('user_paths', 'user_id'),
      ('path_attempts', 'user_id'), ('contact_messages', 'email'), ('feedback', 'id'), ('skill_seen', 'user_id')) v(tbl, col)
  loop
    if to_regclass('public.' || t.tbl) is null then continue; end if;
    execute format('drop trigger if exists guard_bulk_delete on public.%I', t.tbl);
    execute format('create trigger guard_bulk_delete after delete on public.%I referencing old table as old_rows for each statement execute function public._guard_bulk_delete(%L)', t.tbl, t.col);
    execute format('drop trigger if exists guard_truncate on public.%I', t.tbl);
    execute format('create trigger guard_truncate before truncate on public.%I for each statement execute function public._guard_bulk_delete(%L)', t.tbl, t.col);
  end loop;
end $$;

-- ---------------------------------------------------------------- D2
create or replace function public._guard_drop() returns event_trigger
language plpgsql set search_path = '' as $$
declare o record;
begin
  if coalesce(current_setting('rc.allow_drop', true), '') = 'on' then return; end if;
  for o in select * from pg_event_trigger_dropped_objects() loop
    if o.schema_name = 'public' and o.object_type in ('table', 'table column')
       and split_part(o.object_identity, '.', 2) in ('profiles', 'ratings', 'entries', 'registrations', 'applications', 'skill_stats',
           'battle_ratings', 'user_paths', 'path_attempts', 'contact_messages', 'feedback', 'skill_seen') then
      raise exception 'Dropping % (%) is blocked to protect user data. If this is really intended, run "set local rc.allow_drop = ''on''" in the same transaction.', o.object_identity, o.object_type;
    end if;
  end loop;
end $$;

do $$
begin
  drop event trigger if exists rc_guard_drop;
  create event trigger rc_guard_drop on sql_drop execute function public._guard_drop();
exception when insufficient_privilege or feature_not_supported then
  raise notice 'event triggers are not available here; drop guard skipped (bulk-delete guard still active)';
end $$;

-- ---------------------------------------------------------------- D3
create table if not exists public.backup_config (
  id int primary key default 1 check (id = 1),
  token_hash text,
  last_snapshot_at timestamptz,
  last_status_at timestamptz,
  snapshots int not null default 0
);
alter table public.backup_config enable row level security;
revoke all on public.backup_config from public, anon, authenticated;
insert into public.backup_config (id) values (1) on conflict do nothing;

-- Nakul (or Claude, with the hash he gives it) registers the token hash. Admin-only.
create or replace function public.set_backup_token_hash(p_hash text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then raise exception 'expected a 64-character lowercase hex SHA-256 hash'; end if;
  update public.backup_config set token_hash = p_hash where id = 1;
end $$;
revoke execute on function public.set_backup_token_hash(text) from public, anon, authenticated;

create or replace function public._backup_ok(p_token text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(char_length(p_token) >= 32 and
         (select token_hash from public.backup_config where id = 1) = encode(extensions.digest(p_token, 'sha256'), 'hex'), false);
$$;
revoke execute on function public._backup_ok(text) from public, anon, authenticated;

-- Cheap hourly check: how many sign-ups exist now.
create or replace function public.backup_status(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.backup_config;
begin
  if not public._backup_ok(p_token) then raise exception 'invalid backup token'; end if;
  select * into c from public.backup_config where id = 1 for update;
  if c.last_status_at > now() - interval '20 seconds' then raise exception 'too many requests, try again in a minute'; end if;
  update public.backup_config set last_status_at = now() where id = 1;
  return jsonb_build_object('signups', (select count(*) from auth.users), 'checked_at', now(), 'last_snapshot_at', c.last_snapshot_at);
end $$;

-- Full read-only copy of player data. Never includes password hashes, tokens or MFA secrets.
create or replace function public.backup_snapshot(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.backup_config; out jsonb;
begin
  if not public._backup_ok(p_token) then raise exception 'invalid backup token'; end if;
  select * into c from public.backup_config where id = 1 for update;
  if c.last_snapshot_at > now() - interval '5 minutes' then raise exception 'a backup was taken less than 5 minutes ago'; end if;
  select jsonb_build_object(
    'generated_at', now(),
    'signups', (select count(*) from auth.users),
    'tables', jsonb_build_object(
      'users', coalesce((select jsonb_agg(jsonb_build_object(
          'user_id', u.id, 'email', u.email, 'signed_up_at', u.created_at, 'email_confirmed_at', u.email_confirmed_at,
          'last_sign_in_at', u.last_sign_in_at,
          'sign_in_methods', (select string_agg(distinct i.provider, ', ') from auth.identities i where i.user_id = u.id),
          'full_name', p.full_name, 'city', p.city, 'stage', p.stage, 'field', p.field, 'skills', array_to_string(p.skills, ', '),
          'visibility', p.visibility, 'open_to_work', p.open_to_work, 'onboarded', p.onboarded,
          'banned_until', u.banned_until, 'deleted_at', u.deleted_at) order by u.created_at)
        from auth.users u left join public.profiles p on p.id = u.id), '[]'),
      'ratings', coalesce((select jsonb_agg(to_jsonb(r) order by r.user_id, r.field) from public.ratings r), '[]'),
      'tournament_entries', coalesce((select jsonb_agg(to_jsonb(e) order by e.submitted_at) from public.entries e), '[]'),
      'registrations', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from public.registrations r), '[]'),
      'applications', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at) from public.applications a), '[]'),
      'skill_stats', coalesce((select jsonb_agg(to_jsonb(s) order by s.user_id, s.skill) from public.skill_stats s), '[]'),
      'arena_ratings', coalesce((select jsonb_agg(to_jsonb(b) order by b.user_id) from public.battle_ratings b), '[]'),
      'paths', coalesce((select jsonb_agg(to_jsonb(x) order by x.user_id) from public.user_paths x), '[]'),
      'path_attempts', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.path_attempts x), '[]'),
      'contact_messages', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.contact_messages x), '[]'),
      'feedback', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.feedback x), '[]')
    )) into out;
  update public.backup_config set last_snapshot_at = now(), snapshots = snapshots + 1 where id = 1;
  return out;
end $$;

revoke execute on function public.backup_status(text), public.backup_snapshot(text) from public, authenticated;
grant execute on function public.backup_status(text), public.backup_snapshot(text) to anon;
