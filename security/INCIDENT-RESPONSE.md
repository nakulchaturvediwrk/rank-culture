# Rank Culture — Incident Response

Owner: Nakul Chaturvedi (founder) · Contact for reports: support@rankculture.in (forwards to the founder inbox)

## 1. Detection — what counts as an incident

- Someone reports a vulnerability, a leaked account, or a cheated rank
- Unexpected rows in `integrity_review`, a spike of sign-ups, contact messages or feedback
- Site down or defaced; unexpected Vercel deployment; unexpected database change
- An email from Supabase, Vercel, GitHub, Google, Resend or GoDaddy about a login, key or billing change you didn't make

Where to look: Supabase → Logs (Auth, API, Postgres) and Auth → Audit Logs; Vercel → Deployments and Logs; GitHub → Security log; `cron.job_run_details`.

## 2. Containment (first hour)

| Situation | Do this |
| --- | --- |
| Bad deploy or defacement | Vercel → Deployments → promote the last good deployment |
| Abuse through sign-ups | Supabase → Auth → Sign In / Providers → turn off "Allow new users to sign up"; lower auth rate limits |
| Abuse through a database function | Revoke it: `revoke execute on function public.<name>(...) from authenticated, anon;` |
| One account cheating or abusing | Supabase → Auth → Users → ban the user; void their entries (below) |
| Suspected admin-account compromise | Change the password, revoke sessions, check MFA on that provider; then rotate the credentials below |
| Data being read that shouldn't be | Pause the project (Supabase → Settings → Pause) if the leak is ongoing and can't be revoked quickly |

## 3. Credential revocation

| Credential | Where | How to rotate |
| --- | --- | --- |
| Supabase secret / service-role keys | Supabase → Settings → API Keys | Create a new secret key, delete the old one (the site uses only the publishable key, so the site keeps working) |
| JWT signing key | Supabase → Settings → JWT Keys | Rotate; signs everyone out |
| Resend API key | resend.com → API Keys; then update Vault secret `resend_api_key` and the Supabase SMTP password | |
| GitHub OAuth client secret | GitHub → Settings → Developer settings → OAuth Apps → Rank Culture; paste the new secret in Supabase → Auth → Providers → GitHub | |
| Google OAuth client secret | Google Cloud (nakulchaturvedi.work@gmail.com) → project `rank-culture` → Google Auth Platform → Clients; paste in Supabase → Auth → Providers → Google | |
| Turnstile secret | Cloudflare → Turnstile; paste in Supabase → Auth → Attack Protection | |
| Weekly review links | `update public.content_batches set token_hash = 'revoked' where status in ('draft','approved');` | |
| All user sessions | Rotate the JWT signing key, or per user: Supabase → Auth → Users → sign out | |

## 4. Investigation

1. Write down the time you noticed and what you saw. Keep screenshots.
2. Export the relevant logs before they roll off (Free-plan retention is short).
3. Establish: what was accessed or changed, which accounts, since when, through which entry point.
4. Cheating cases: compare the entry's timing (`registrations.started_at` vs `entries.submitted_at`), battle answer speeds, and accounts sharing patterns. Decide void / reset / ban and write the reason.

Voiding a cheated tournament entry (run in the SQL editor):
```sql
-- 1) note the user id and tournament id; 2) restore the rating that existed before the entry
update public.ratings r set score = e.rating_before
  from public.entries e
 where e.user_id = r.user_id and e.tournament_id = '<tournament>' and e.user_id = '<user id>' and e.rating_before is not null;
delete from public.ratings where user_id = '<user id>' and field = (select cat from public.tournaments where id = '<tournament>')
   and not exists (select 1 from public.entries where user_id = '<user id>' and tournament_id = '<tournament>' and rating_before is not null);
delete from public.entries where user_id = '<user id>' and tournament_id = '<tournament>';
```
Run the three statements in this order. Tested on the local replica on 11 Nov 2026: the voided tournament's entry and its rating go, the player's other tournaments stay. It does not adjust skill stats or the rating history list; to ban the player as well, use Supabase → Auth → Users → Ban.

## 5. Recovery

- Fix the cause in code with a regression test (see SECURITY-CHECKLIST.md → deployment checklist), deploy through a preview, promote.
- Restore data from the latest backup if rows were lost (backup routine is remediation item P4 — not yet in place).
- Turn sign-ups and revoked functions back on only after the fix is live.

## 6. Communication

- Affected players: email within 72 hours if their personal data was exposed, saying what happened, what data, what you did, what they should do.
- India's DPDP Act: notify the Data Protection Board and affected people of a personal-data breach as the rules require; keep a record of the breach and actions.
- Employers/partners: tell them if any rank they relied on was voided.
- Never post details of an unfixed vulnerability publicly.

## 7. Lessons learned (within a week)

Write a short note in the project: what happened, timeline, root cause, what stopped it, what changes (code, settings, checklist). Add the attack as a test in `supabase/tests`.
