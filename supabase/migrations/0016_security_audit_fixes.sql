-- 0016: fixes from the 9 Nov 2026 security audit (findings A3, A10, I5). Safe to re-run.

-- A3: deleting an account needs a login (password, code, OAuth or MFA) within the last 10 minutes.
-- Supabase puts each sign-in method and its time in the JWT `amr` claim; refreshing a token keeps the
-- original times, so a stolen, long-lived session can't delete the account.
create or replace function public._recent_login(p_minutes int default 10)
returns boolean language sql stable set search_path = '' as $$
  select coalesce((
    select max((m ->> 'timestamp')::bigint)
      from jsonb_array_elements(case when jsonb_typeof(auth.jwt() -> 'amr') = 'array' then auth.jwt() -> 'amr' else '[]'::jsonb end) m
     where (m ->> 'timestamp') ~ '^\d+$'), 0) > extract(epoch from now()) - p_minutes * 60;
$$;
revoke execute on function public._recent_login(int) from public, anon, authenticated;

create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.aal_ok() then raise exception 'not authenticated'; end if;
  if not public._recent_login(10) then raise exception 'reauth required: please log in again to delete your account'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- A10: weekly review links expire after 7 days (was 21).
create or replace function public._batch_ok(p_batch uuid, p_token text)
returns public.content_batches language sql stable security definer set search_path = '' as $$
  select * from public.content_batches b
   where b.id = p_batch and b.token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
     and b.created_at > now() - interval '7 days';
$$;
revoke execute on function public._batch_ok(uuid, text) from public, anon, authenticated;

-- I5: pin search_path on the last helper without it, and keep pure helpers off the public API.
alter function public._path_rules(int) set search_path = '';
revoke execute on function public._path_rules(int) from public, anon, authenticated;
revoke execute on function public._check_batch(jsonb) from public, anon, authenticated;
