# Rank Culture — Security Checklist

## Production checklist (current state, 11 Nov 2026)

- [x] Every public table has row-level security; server-only tables have no grants
- [x] Scores, timers and answer checks run only in database functions
- [x] Answer keys never sent before a player answers
- [x] All SECURITY DEFINER functions set `search_path = ''`; no dynamic SQL
- [x] Strict CSP (hash-based, no `unsafe-inline` / `unsafe-eval`), HSTS preload, frame blocking, nosniff, Referrer- and Permissions-Policy
- [x] CAPTCHA enforced on all Supabase Auth calls; auth rate limits set
- [x] Email confirmation, secure email change, secure password change on
- [x] Redirect allow-list limited to rankculture.in and rank-culture.vercel.app
- [x] Account deletion needs a recent login; deletes all player data
- [x] No secrets in the repository or its history
- [x] `npm audit`: 0 vulnerabilities
- [x] Migration 0017 applied to production (12 Nov 2026)
- [ ] "Require current password when updating" on (after OAuth test)
- [x] MFA on every admin account (Supabase, Vercel, GitHub, GoDaddy, Resend, ImprovMX done 12 Nov 2026; Brevo signs in through Google; confirm 2-Step Verification on both Google accounts)
- [x] Migration 0018 applied (bulk-delete, TRUNCATE and DROP guards; backup export) (12 Nov 2026)
- [x] Drive backup script set up in nakulchaturvedi.work@gmail.com; first backup 12 Nov 2026 05:18 IST verified (2 users)
- [ ] One tested restore from a Drive backup
- [ ] Error tracking and alerting
- [ ] CI running tests on every push

## Deployment checklist (every release)

1. Work on `production-hardening` (production runs from it; `main` is behind — never deploy `main`).
2. `node build.js` — must print `Design-system lint: 0 problems` and update CSP hashes in `vercel.json`; commit `vercel.json` if it changed.
3. `npm run test:db` — security, gameplay and weekly suites all pass.
4. `python3 tests/e2e.py` — `0 problems`.
5. New migration? Add it as the next `supabase/migrations/00NN_*.sql`, make it safe to re-run, never drop or bulk-delete user data (the database refuses it; a test fails unless the file carries a `data-safety: reviewed` note explaining why), add an attack test, run step 3, then apply to production only with Nakul's approval. Note the previous function definitions for rollback.
6. Push, create a Vercel **preview** deployment from the commit, open it and check log-in, a tournament page, a battle and the leaderboard.
7. Nakul promotes the preview to production in Vercel (⋯ → Promote to Production).
8. Check https://rankculture.in serves the new commit (Vercel deployment `githubCommitSha`) and the security headers are present.
9. Rollback: in Vercel, promote the previous production deployment (instant). Database: re-apply the previous function definitions noted in step 5.
10. Update `claude/work-log.md` in the project.

## Recurring review

**Weekly**
- [ ] Read `select * from public.integrity_review;` in the Supabase SQL editor; void entries and ban accounts that cheated
- [ ] Read the Sunday review email before Monday 10:00 IST auto-publish; hold anything odd
- [ ] Skim `contact_messages` (topic `dispute`) and `feedback`

**Monthly**
- [ ] Open the **Rank Culture backup log** sheet: every row OK, and a backup in the last 7 days
- [ ] Delete Drive backups older than 12 months (privacy policy promise)
- [ ] `npm audit` (root and `supabase/tests`); upgrade with tests, never bulk `--force`
- [ ] Supabase Advisors (security + performance); compare with the "accepted" list in SECURITY-AUDIT.md
- [ ] Check cron health: `select jobname, status, count(*) from cron.job_run_details join cron.job using (jobid) where start_time > now() - interval '7 days' group by 1, 2;`
- [ ] Review who has access to Supabase, Vercel, GitHub, Google Cloud

**Quarterly**
- [ ] Re-run this audit's attack tests and the cross-user checks
- [ ] Test a backup restore
- [ ] Rotate the Resend API key and OAuth client secrets if anyone with access has left
- [ ] Review terms and privacy policy against what the product actually collects
