-- GitHub accounts often have no display name; fall back to the username.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'user_name', '')), 80), ''));
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
