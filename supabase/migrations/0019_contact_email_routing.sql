-- 0019: contact-form messages reach a real inbox.
-- Every new row in contact_messages is emailed (through Resend, key in Vault as 'resend_api_key') to the
-- rankculture.in address for its topic. ImprovMX forwards those addresses to the founder's Gmail.
--   support@  candidate help, score disputes, Pro waitlist, anything else
--   talks@    employers, investors, press
--   campus@   college placement cells
-- Reply-To is the sender, so hitting Reply in Gmail answers them directly.
-- The email is plain text (no HTML), so nothing a visitor types can render as markup or links in the inbox.
-- Sending is best-effort: if the key is missing or the call fails, the message is still saved (read it in the
-- dashboard: select * from public.contact_messages order by created_at desc).
-- Safe to re-run.

create or replace function public._contact_inbox(p_topic text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_topic in ('employer', 'investor', 'press') then 'talks@rankculture.in'
    when p_topic = 'college' then 'campus@rankculture.in'
    else 'support@rankculture.in' end
$$;

create or replace function public._contact_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  k text;
  label text := case new.topic
    when 'candidate' then 'Candidate help' when 'dispute' then 'Score dispute' when 'employer' then 'Employer / hiring pilot'
    when 'college' then 'College' when 'pro-waitlist' then 'Pro waitlist' when 'investor' then 'Investor / mentor'
    when 'press' then 'Press' else 'Other' end;
  who text := left(regexp_replace(coalesce(new.name, ''), '[[:cntrl:]]+', ' ', 'g'), 80);
begin
  select decrypted_secret into k from vault.decrypted_secrets where name = 'resend_api_key';
  if k is null then return new; end if;
  begin
    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Authorization', 'Bearer ' || k, 'Content-Type', 'application/json'),
      body := jsonb_build_object(
        'from', 'Rank Culture website <noreply@rankculture.in>',
        'to', jsonb_build_array(public._contact_inbox(new.topic)),
        'reply_to', new.email,
        'subject', '[' || label || '] ' || who,
        'text', 'From: ' || who || ' <' || new.email || '>' || chr(10)
             || 'Topic: ' || label || chr(10)
             || 'Signed in: ' || case when new.user_id is null then 'no' else 'yes (user ' || new.user_id || ')' end || chr(10)
             || 'Sent: ' || to_char(new.created_at at time zone 'Asia/Kolkata', 'DD Mon YYYY, HH24:MI') || ' IST' || chr(10) || chr(10)
             || new.message || chr(10) || chr(10)
             || '— Sent from the contact form on rankculture.in. Reply to this email to answer ' || who || ' directly.'),
      timeout_milliseconds := 10000);
  exception when others then
    null; -- never lose the message because the email could not be queued
  end;
  return new;
end $$;
revoke all on function public._contact_notify() from public, anon, authenticated;

drop trigger if exists contact_notify on public.contact_messages;
create trigger contact_notify after insert on public.contact_messages
  for each row execute function public._contact_notify();
