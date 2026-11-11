// Data-safety guards (0018) and the Drive backup export.
import { makeDb, as, newUser } from "./harness.mjs";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
const MIG = new URL("../migrations", import.meta.url).pathname;
const db = await makeDb(MIG);
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { cond ? pass++ : fail++; console.log(`${cond ? "  ok  " : "  FAIL"} ${name}${!cond && extra ? " — " + extra : ""}`); };
const su = async (s, p) => (await db.query(s, p)).rows;
const throwsSu = async (name, sql, re) => { try { await db.exec(sql); ok(name, false, "no error"); } catch (e) { ok(name, !re || re.test(e.message), e.message); } };
const anon = async (sql, p) => { await db.exec(`reset role; select set_config('request.jwt.claims', '{"role":"anon"}', false); set role anon;`); try { return (await db.query(sql, p)).rows; } finally { await db.exec("reset role"); } };
const anonThrows = async (name, sql, p, re) => { try { await anon(sql, p); ok(name, false, "no error"); } catch (e) { ok(name, !re || re.test(e.message), e.message); } };

console.log("1. Bulk-delete and truncate guards");
const users = [];
for (let i = 0; i < 8; i++) users.push(await newUser(db, `Player ${i}`));
await su(`insert into public.ratings (user_id, field, score, entries, history) select id, 'data', 500, 1, array[500] from auth.users`);
await throwsSu("deleting ratings of 8 players in one statement is blocked", `delete from public.ratings`, /blocked to protect user data/);
ok("…and nothing was deleted", Number((await su(`select count(*) n from public.ratings`))[0].n) === 8);
await throwsSu("TRUNCATE is blocked", `truncate public.ratings cascade`, /TRUNCATE on ratings is blocked/);
await throwsSu("mass account deletion (cascade to profiles) is blocked", `delete from auth.users`, /blocked to protect user data/);
ok("…all 8 accounts still there", Number((await su(`select count(*) n from auth.users`))[0].n) === 8);
await su(`delete from auth.users where id = $1`, [users[7].id]);
ok("deleting one account (and its cascade) still works", Number((await su(`select count(*) n from public.profiles`))[0].n) === 7);
await su(`delete from public.ratings where user_id = any($1)`, [[users[0].id, users[1].id]]);
ok("small deletes (2 players) still work", Number((await su(`select count(*) n from public.ratings`))[0].n) === 5);
await db.exec(`begin; set local rc.allow_bulk_delete = 'on'; delete from public.ratings; commit;`);
ok("a deliberate bulk delete with the override works", Number((await su(`select count(*) n from public.ratings`))[0].n) === 0);
const victim = users[2];
r: { const r = await as(db, victim, `select public.delete_my_account()`).catch(e => e); ok("self-service account deletion unaffected", !(r instanceof Error) || /recent|log in again|10 minutes/i.test(r.message), String(r.message || "")); }

console.log("2. Drop guard");
const hasEvt = (await su(`select count(*) n from pg_event_trigger where evtname = 'rc_guard_drop'`))[0].n > 0;
if (hasEvt) {
  await throwsSu("dropping a user-data column is blocked", `alter table public.profiles drop column city`, /blocked to protect user data/);
  await throwsSu("dropping a user-data table is blocked", `drop table public.feedback`, /blocked to protect user data/);
  await db.exec(`create table public.scratch_t (x int); drop table public.scratch_t;`); ok("dropping other tables still works", true);
} else console.log("  (event triggers not supported in this test database — drop guard checked on the live database)");

console.log("3. Backup export");
const token = "t".repeat(20) + "0123456789abcdef0123456789abcdef";
const hash = createHash("sha256").update(token).digest("hex");
await anonThrows("export refused before a token is registered", `select public.backup_snapshot($1)`, [token], /invalid backup token/);
await su(`select public.set_backup_token_hash($1)`, [hash]);
await anonThrows("players can't register a token", `select public.set_backup_token_hash($1)`, [hash], /permission denied/);
await anonThrows("wrong token refused", `select public.backup_status($1)`, ["x".repeat(40)], /invalid backup token/);
const live = Number((await su(`select count(*) n from auth.users`))[0].n);
const st = (await anon(`select public.backup_status($1) s`, [token]))[0].s;
ok("status returns the sign-up count", st.signups === live, JSON.stringify(st));
await anonThrows("status is rate-limited", `select public.backup_status($1)`, [token], /too many requests/);
await su(`update public.contact_messages set message = message where false`); // no-op
await su(`insert into public.feedback (user_id, target_kind, target_id, rating, comment, page) values (null, 'site', null, 5, '=HYPERLINK("http://evil")', 'home')`);
const snap = (await anon(`select public.backup_snapshot($1) s`, [token]))[0].s;
ok("snapshot has every table", ["users", "ratings", "tournament_entries", "registrations", "applications", "skill_stats", "arena_ratings", "paths", "path_attempts", "contact_messages", "feedback"].every(k => Array.isArray(snap.tables[k])), Object.keys(snap.tables).join(","));
ok("snapshot users = sign-ups", snap.tables.users.length === live && snap.signups === live);
ok("snapshot never contains password hashes", !JSON.stringify(snap).includes("encrypted_password"));
await anonThrows("snapshot rate-limited to one per 5 minutes", `select public.backup_snapshot($1)`, [token], /less than 5 minutes/);
const B = users[3];
try { await as(db, B, `select public.backup_snapshot($1)`, [token]); ok("signed-in players can't call the export", false); } catch (e) { ok("signed-in players can't call the export", /permission denied/.test(e.message), e.message); }
await anonThrows("anon can't read backup_config", `select * from public.backup_config`, [], /permission denied/);

console.log("4. Migration hygiene");
const later = readdirSync(MIG).filter(f => f.slice(0, 4) > "0018");
const risky = later.filter(f => /\b(drop\s+table|truncate|drop\s+column|delete\s+from\s+(public\.)?(profiles|ratings|entries|registrations|applications|skill_stats|battle_ratings|user_paths|path_attempts|contact_messages|feedback)\b)/i.test(readFileSync(`${MIG}/${f}`, "utf8")) && !/data-safety:\s*reviewed/i.test(readFileSync(`${MIG}/${f}`, "utf8")));
ok("no later migration drops or bulk-deletes user data without a 'data-safety: reviewed' note", risky.length === 0, risky.join(", "));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
