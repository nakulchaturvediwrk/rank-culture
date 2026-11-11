# Rank Culture — Security Test Report

**Date:** 11 November 2026 (IST) · **Commit under test:** `production-hardening` after `d8adca6` + this audit's changes (esbuild 0.25.12, runbook rule, security docs)

## Test environment

| Environment | Used for | Notes |
| --- | --- | --- |
| Local replica | All automated tests, migration 0017, incident SQL | PGlite (Postgres in WASM) replaying every migration in `supabase/migrations` with a stub of Supabase auth, cron, vault and pg_net (`supabase/tests/harness.mjs`). Node 22.23.4. |
| Local static site | Browser tests | `node build.js` output served with the production CSP; Chrome via Playwright; Supabase API mocked (`tests/e2e.py`). |
| Production database | Exploit reproduction and access checks | Only inside `begin … rollback` transactions with synthetic users; read-only catalog queries. No production data changed. |
| Production site / dashboards | Header, CAPTCHA and settings checks | Read-only. |

There is no staging environment (see remediation P10 for CI).

## Commands executed and results

| Command / check | Result |
| --- | --- |
| `node build.js` | Pass — 45 pages, CSP 48 inline-script hashes, design lint 0 problems |
| `cd supabase/tests && node security.test.mjs` | **104 passed, 0 failed** |
| `node gameplay.test.mjs` | **75 passed, 0 failed** (7 new rank-integrity attack tests) |
| `node weekly.test.mjs` | **62 passed, 0 failed** (4 new practice-farming attack tests) |
| `python3 tests/e2e.py` | **0 problems** — every page × signed in/out × desktop/mobile, click-through of every control, auth and game flows |
| `npm audit` (root, before) | 1 moderate: esbuild ≤ 0.24.2 dev-server (GHSA-67mh-4wv8-2f99) |
| `npm audit` (root, after esbuild 0.25.12) | **0 vulnerabilities**; bundle output size unchanged within 11 bytes; CSP hashes unchanged |
| `npm audit` (`supabase/tests`) | 0 vulnerabilities |
| Git history secret scan (regex: Stripe, Resend, JWT, GitHub, Google API/OAuth, private keys, Supabase secret keys, `client_secret`) | No secrets found (only role names in test SQL) |
| Live rolled-back: re-answer one practice question 41× | **Exploit reproduced:** skill stats SEO 40/41 (fixed by 0017 R1) |
| Live rolled-back: two accounts quick-match a quiet pack | **Exploit reproduced:** both seated in one ranked live 1v1 (fixed by 0017 R3) |
| Live code review: private hosted events | Ranked with 2+ humans (fixed by 0017 R2) |
| Live rolled-back: cross-user reads/writes, private room access, late/duplicate/early/invalid battle answers, anon calls | All denied or rejected as expected |
| Live: Auth password request without CAPTCHA token | Rejected `captcha_failed` |
| Live: response headers | CSP, HSTS (preload), X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP present |
| Catalog: dynamic SQL in public functions | None |
| Catalog: SECURITY DEFINER without `search_path` | None |
| Catalog: tables without RLS | None |
| Catalog: storage buckets | None (no uploads) |
| Supabase dashboard (read-only) | CAPTCHA (Turnstile) on; leaked-password check off (Pro only); confirm email on; secure email change on; secure password change on; require current password **off**; min password 8; redirect allow-list 2 own domains; TOTP MFA enabled; auth rate limits set; sessions not time-boxed (Pro only) |
| Incident-response "void entry" SQL on local replica | Pass — voided tournament's entry and rating removed, other tournament kept |

## Skipped checks and reasons

| Check | Why skipped |
| --- | --- |
| Applying migration 0017 to production | Needs Nakul's approval (production change) |
| Denial-of-service, load, credential stuffing, password spraying | Out of scope by rule; could affect real users and cost |
| Real sign-up / log-in on production with test credentials | Would create accounts and send emails on production |
| Backup restore | No restorable backup available on Free plan; no throwaway project |
| Admin-account MFA (Supabase, Vercel, GitHub, GoDaddy, Resend, ImprovMX, Brevo) | Not visible to the auditor |
| Provider internals (JWT signing, refresh rotation, OAuth providers) | Trusted provider controls |
| File-upload and payment tests | Features don't exist |
| AI/LLM runtime tests | No AI at runtime; weekly content pipeline reviewed by reading its runbook and validators |

## Remaining warnings

- Supabase Advisors still list SECURITY DEFINER functions callable by signed-in users and "RLS enabled, no policy" on server-only tables. Both are intentional (the API is built from checked functions; server-only tables are meant to have no direct access).
- Open High findings H-2 (shared tournament questions) and H-3 (AI from a second device) need product work.

## Production-readiness recommendation

Keep the site live for the pilot. Apply migration 0017 now. Before telling employers or investors that ranks are verified: ship question pools and per-question timers (P1), turn on admin MFA (P3), set up backups (P4) and run the manual verified-round pilot (P8).
