# Rank Culture — Authorization Matrix

As of 11 Nov 2026 (live schema + migration 0017). Enforced in Postgres (grants, row-level security, SECURITY DEFINER functions that check `auth.uid()`); the browser enforces nothing.

**Roles**

| Role | Who | How it is identified |
| --- | --- | --- |
| Anonymous | Any visitor | No JWT (`anon`) |
| Player | Signed-in user | Supabase JWT (`authenticated`), `auth.uid()` |
| Player with MFA | Player who enrolled TOTP | Must reach `aal2`; every player function calls `aal_ok()`, so an enrolled player at `aal1` is treated as not signed in |
| Reviewer link | Whoever holds a weekly review URL | 192-bit token, SHA-256 match, 7-day expiry (`_batch_ok`) |
| Admin | Nakul | Supabase dashboard / service role, Vercel, GitHub. No in-app admin role exists. |
| Scheduler | pg_cron jobs | Database owner, not reachable from the API |

Legend: ✅ allowed · 🔒 own rows only · ❌ denied · — not applicable

## Tables (direct API access)

| Table | Anonymous | Player | Notes |
| --- | --- | --- | --- |
| tournaments, jobs | ✅ read | ✅ read | Public catalogue |
| questions | ❌ | 🔒 read after own timer starts, or after the tournament closes | Answer keys are in `answer_keys` |
| answer_keys, bank_questions, path_items, packs | ❌ | ❌ | Served only through functions, never with the key before answering |
| profiles | ❌ | 🔒 read; 🔒 update only city, field, full_name, hide_college, notify_*, onboarded, open_to_work, show_city, skills, stage, visibility | `id`, ratings and roles are not updatable |
| ratings, skill_stats, entries, user_paths | ❌ | 🔒 read | Written only by scoring functions |
| registrations | ❌ | 🔒 read; insert self (user_id, tournament_id only); delete own before starting | `started_at` set only by `start_entry` |
| applications | ❌ | 🔒 read; 🔒 withdraw (delete) while status = applied | Created only by `apply_to_job` |
| battles, battle_players, battle_answers, battle_ratings, knockouts, knockout_entries, knockout_matches | ❌ | ❌ | Server-only; read through `battle_state`, `ko_state`, `battle_hub` |
| contact_messages, feedback, content_batches, public_cache, path_attempts, skill_seen | ❌ | ❌ | Server-only |
| `integrity_review` (view) | ❌ | ❌ | Admin only (0017) |

## Functions (RPC)

| Function | Anonymous | Player | Server-side rule |
| --- | --- | --- | --- |
| leaderboard_v2, site_stats, skills_list, packs_list, tournament_counts | ✅ | ✅ | Aggregates only; non-public players shown as "Hidden competitor" |
| send_contact | ✅ | ✅ | Topic allow-list, length limits, 5/h per email or user, 300/h global |
| send_feedback | ✅ (site feedback only) | ✅ | Length limits, 20/h per user, 2000/h global |
| review_batch, decide_batch | Token holder | Token holder | Valid token + not expired + not published |
| start_entry, submit_entry, tournament_tasks, my_standing | ❌ | ✅ | Live window, one entry each, server timer + 2 min grace, answers ≤ 32 KB |
| apply_to_job | ❌ | ✅ | Active job, one application each, note ≤ 500 chars; fast-track decided by the server |
| my_rank | ❌ | ✅ own | |
| battle_quick, battle_room, battle_join, battle_leave, battle_start_now, battle_state, battle_answer, battle_hub | ❌ | ✅ | Seat required; private rooms need the code; ≤ 5 open rooms; answers server-timed; host-only start |
| host_event, ko_join, ko_leave, ko_state | ❌ | ✅ | ≤ 5 upcoming hosted events; start 2 min–30 days ahead; code required for private |
| set_path, path_next, path_state, path_answer, path_reveal, path_self_score | ❌ | ✅ own | 0017: an item answered right can't be re-answered; misses retry after 1 day; skill stats count first exposure only |
| delete_my_account | ❌ | ✅ own | Login within the last 10 minutes |
| aal_ok | ❌ | ✅ | Helper |
| All `_`-prefixed helpers, tick_all, schedule_events, refresh_public_cache, stage_batch, publish_due_batches, send_review_emails, _battle_*, _ko_* | ❌ | ❌ | Scheduler / admin only |

## Rank effects

| Action | Moves domain rating | Moves Arena rating | Moves skill stats |
| --- | --- | --- | --- |
| Ranked tournament entry | ✅ once per tournament | — | ✅ |
| Practice tournament | ❌ | — | ✅ |
| Public battle, 2+ humans | — | ✅ (frozen vs the same opponent after 3 ranked games in 24 h) | ✅ first time a question is seen |
| Battle vs bots only, private room, hosted showdown/FFF/knockout | — | ❌ | ✅ first time a question is seen |
| Practice path question | — | — | ✅ first attempt only |

## Verified by

`supabase/tests/security.test.mjs` (104 checks), `gameplay.test.mjs` (75), `weekly.test.mjs` (62), plus rolled-back cross-user tests on the live database on 11 Nov 2026.
