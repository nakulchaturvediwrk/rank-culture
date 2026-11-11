# Rank Culture — Security Remediation Plan

11 Nov 2026. Finding IDs refer to `SECURITY-AUDIT.md`. Owner "Claude" = can be built in a session; "Nakul" = needs your accounts, money or a decision.

## Immediate (before claiming verified ranks)

| # | Fix | Finding | Owner | Effort | Depends on | Rollout | Rollback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P0 | Apply migration `0017_rank_integrity.sql` to the live database | H-1, M-3 | Nakul approves, Claude applies | 5 min | — | Single migration; existing seen questions are back-filled so history can't be replayed | Re-apply the previous definitions of `path_answer`, `_battle_finish`, `_battle_start` from migrations 0015/0012/0011; `skill_seen` and the view can stay |
| P1 | Question pools: each player gets a random draw from a pool 5–10× the round size, options shuffled per player; a timer per question (45–90 s) | H-2, H-3 | Claude (code), weekly pipeline fills pools | ~1.5 weeks | Weekly pipeline writing larger pools | Ship behind a per-tournament flag, start with December tournaments | Flag off → current fixed-question flow |
| P2 | Turn on "Require current password when updating" (Supabase → Auth → Email), after confirming GitHub/Google-only accounts can still set a first password | M-1 | Nakul (toggle), Claude (test + add a current-password field to Settings) | 0.5 day | — | Toggle on, test change-password with an email account and an OAuth account | Toggle off |
| P3 | Turn on MFA for every admin account: Supabase, Vercel, GitHub, Google Cloud, GoDaddy, Resend, ImprovMX, Brevo; store recovery codes offline | M-5 | Nakul | 1 hour | — | One account at a time | — |

## Next (weeks)

| # | Fix | Finding | Owner | Effort | Notes |
| --- | --- | --- | --- | --- | --- |
| P4 | Backups: apply 0018 and set up the Google Drive backup script (`ops/backup/`); then one test restore; Supabase Pro daily backups as a second layer when budget allows | M-4 | Nakul (setup + approval), Claude (built) | 30 min setup | Built and tested 12 Nov 2026 |
| P5 | Weekly pipeline: require explicit approval before publishing (remove auto-publish) or keep it and read every review email | M-2 | Nakul (decision) | 1 hour | Runbook rule on untrusted feedback already added |
| P6 | Full-screen arena with tab-switch, paste and copy logging shown on the result; penalties (void entry, reset rating, ban repeat offenders) and a dispute flow | H-3 | Claude | ~1 week | Signals, not proof: shown to reviewers |
| P7 | More detection: same-wrong-answer matching between accounts, sudden rating jumps, many accounts from one device/IP | H-3, M-3 | Claude | 1–2 weeks | Feeds `integrity_review` |
| P8 | Manual verified-round pilot: top 20 of one tournament, 15-minute live call with fresh questions + "explain your answer" | H-3 | Nakul + partner employer | Process only | The control that makes ranks hireable |
| P9 | Error tracking and alerts (e.g. Sentry free tier for front-end errors; a daily check that cron jobs succeeded) | L-3 | Claude | 0.5 day | |
| P10 | CI: GitHub Action running build + DB tests + e2e on every push to `production-hardening` | L-7 | Claude | 0.5 day | Blocks deploys of failing code |

## Later (with budget or pilot employers)

| # | Fix | Finding | Owner | Notes |
| --- | --- | --- | --- | --- |
| P11 | Phone OTP at sign-up, one account per number | M-3 | Nakul (SMS budget) | Per-SMS fee |
| P12 | ID check (DigiLocker / Aadhaar-based eKYC via a licensed provider) for Verified ranks | M-3, H-3 | Nakul | Per-check fee; privacy review needed |
| P13 | Webcam proctoring for ranked tournaments | H-3 | Nakul | Per-session fee; consent and privacy policy update |
| P14 | Supabase Pro: leaked-password check, session time-box/inactivity timeout, longer log retention | L-1, L-2, L-3 | Nakul | ~$25/month |
| P15 | CAPTCHA on the contact and feedback forms if spam appears | L-4 | Claude | Turnstile already loaded on auth pages |

## Done in this audit

- Migration 0017 written and tested (pending apply) — H-1, M-3.
- esbuild upgraded to 0.25.12 (exact pin) — L-5.
- Weekly pipeline runbook: feedback treated as untrusted data — M-2 (partial).
