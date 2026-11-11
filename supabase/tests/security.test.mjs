// Database security & integrity tests. Replays every migration on PGlite (Postgres in WASM)
// with a stub of Supabase auth, then attacks it as anon / signed-in users.
// Run: cd supabase/tests && npm i && node security.test.mjs
import { makeDb, as, newUser } from "./harness.mjs";
import { fileURLToPath } from "url";
import path from "path";

const MIG = path.join(path.dirname(fileURLToPath(import.meta.url)), "../migrations");
const db = await makeDb(MIG, { upTo: Number(process.env.UPTO || 99) });
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) { pass++; } else { fail++; console.log(`  ✗ ${name} ${extra}`); } };
const rows = async (u, sql, p) => (await as(db, u, sql, p)).rows;
const denied = async (name, u, sql, p) => { try { const r = await as(db, u, sql, p); ok(name, r.affectedRows === 0 && r.rows.length === 0, "(ran: " + JSON.stringify(r.rows).slice(0, 80) + ")"); } catch (e) { ok(name, true); } };
const throws = async (name, u, sql, p, re) => { try { await as(db, u, sql, p); ok(name, false, "(did not throw)"); } catch (e) { ok(name, !re || re.test(e.message), `(${e.message})`); } };
const su = (sql, p) => db.query(sql, p);

const A = await newUser(db, "Asha Rao", "asha@x.in"), B = await newUser(db, "Bilal Khan", "bilal@x.in");
await su(`update public.profiles set city='Pune', show_city=true, onboarded=true, field='marketing' where id=$1`, [A.id]);
await su(`update public.profiles set onboarded=true, visibility='public', city='Pune', show_city=true where id=$1`, [B.id]);
// A live, ranked tournament with an MCQ and a text task.
await su(`update public.tournaments set opens_at = now() - interval '1 day', closes_at = now() + interval '1 day' where id = 'growth'`);
const qs = (await su(`select q.id, q.kind, k.correct from public.questions q left join public.answer_keys k on k.question_id = q.id where q.tournament_id='growth' order by position`)).rows;

console.log("1. Anonymous visitors");
for (const t of ["profiles", "ratings", "entries", "applications", "registrations", "skill_stats", "questions", "answer_keys", "bank_questions",
  "battles", "battle_players", "battle_answers", "battle_ratings", "knockouts", "knockout_entries", "knockout_matches", "packs", "contact_messages"])
  await denied(`anon cannot read ${t}`, null, `select * from public.${t} limit 1`);
for (const f of ["start_entry('growth')", "submit_entry('growth', '{}')", "apply_to_job('x', null)", "my_rank('marketing')", "battle_hub()", "delete_my_account()", "tournament_tasks('growth')", "aal_ok()"])
  await throws(`anon cannot call ${f}`, null, `select public.${f}`);
await throws("v1 leaderboard is gone", null, `select * from public.leaderboard('marketing', 10)`);
ok("anon can read public leaderboard", (await rows(null, `select * from public.leaderboard_v2('overall', null, null, 10)`)).length >= 0);
ok("anon can read site stats", (await rows(null, `select public.site_stats()`)).length === 1);

console.log("2. Cross-user isolation");
ok("A sees only own profile", (await rows(A, `select id from public.profiles`)).every(r => r.id === A.id));
await denied("A cannot update B's profile", A, `update public.profiles set full_name='hacked' where id=$1`, [B.id]);
ok("B's name intact", (await su(`select full_name from public.profiles where id=$1`, [B.id])).rows[0].full_name === "Bilal Khan");
await throws("A cannot change profile id", A, `update public.profiles set id=$1 where id=$2`, [B.id, A.id]);
await throws("A cannot write own rating", A, `insert into public.ratings (user_id, field, score) values ($1, 'marketing', 999)`, [A.id]);
await throws("A cannot edit own rating", A, `update public.ratings set score=999`);
await throws("A cannot insert an entry", A, `insert into public.entries (user_id, tournament_id, answers, task_scores, auto_points, auto_max) values ($1,'growth','{}','[]',10,10)`, [A.id]);
await throws("profile name length enforced", A, `update public.profiles set full_name=repeat('x', 200) where id=$1`, [A.id]);
await throws("profile field enum enforced", A, `update public.profiles set visibility='everyone' where id=$1`, [A.id]);

console.log("3. Tournament integrity");
await throws("can't pre-start via registration.started_at", A, `insert into public.registrations (user_id, tournament_id, started_at) values ($1,'growth', now() - interval '1 year')`, [A.id]);
await throws("can't register someone else", A, `insert into public.registrations (user_id, tournament_id) values ($1,'growth')`, [B.id]);
await as(db, A, `insert into public.registrations (user_id, tournament_id) values ($1,'growth')`, [A.id]);
await throws("can't move own start time", A, `update public.registrations set started_at = now() + interval '1 year' where user_id=$1`, [A.id]);
ok("prompts hidden before my timer starts", (await rows(A, `select id from public.questions where tournament_id='growth'`)).length === 0);
ok("task titles available before start", (await rows(A, `select * from public.tournament_tasks('growth')`)).length === qs.length);
await denied("answer keys never readable", A, `select * from public.answer_keys`);
await throws("submit before start rejected", A, `select public.submit_entry('growth', '{}')`, [], /not started/);
await as(db, A, `select public.start_entry('growth')`);
ok("prompts visible after my timer starts", (await rows(A, `select id from public.questions where tournament_id='growth'`)).length === qs.length);
ok("B still can't see prompts", (await rows(B, `select id from public.questions where tournament_id='growth'`)).length === 0);
await throws("oversized answers rejected", A, `select public.submit_entry('growth', jsonb_build_object('x', repeat('a', 40000)))`, [], /invalid answers/);
const ans = {}; for (const q of qs) ans[q.id] = q.kind === "mcq" ? q.correct : "My plan";
const e = (await as(db, A, `select * from public.submit_entry('growth', $1)`, [ans])).rows[0];
ok("perfect MCQ answers score max", e.auto_points === e.auto_max && e.rating_after === 1000, JSON.stringify([e.auto_points, e.auto_max, e.rating_after]));
await throws("double submit rejected", A, `select public.submit_entry('growth', '{}')`, [], /already submitted/);
await throws("restart after submit rejected", A, `select public.start_entry('growth')`, [], /already submitted/);
await su(`insert into public.registrations (user_id, tournament_id, started_at) values ($1, 'growth', now() - interval '5 hours')`, [B.id]);
await throws("late submit rejected", B, `select public.submit_entry('growth', '{}')`, [], /time is up/);
await throws("upcoming tournament can't start", A, `select public.start_entry('code')`, [], /not live/);
ok("A can't see B's entry", (await rows(A, `select user_id from public.entries`)).every(r => r.user_id === A.id));

console.log("4. Jobs & applications");
const job = (await su(`select id from public.jobs where active limit 1`)).rows[0].id;
await throws("direct application insert blocked", A, `insert into public.applications (user_id, job_id, status) values ($1, $2, 'offer')`, [A.id, job]);
await as(db, A, `select public.apply_to_job($1, 'hi')`, [job]);
await throws("double apply rejected", A, `select public.apply_to_job($1, null)`, [job], /already applied/);
await throws("can't promote own application", A, `update public.applications set status='offer'`);
await throws("note length enforced", A, `select public.apply_to_job((select id from public.jobs where id <> $1 and active limit 1), repeat('x', 600))`, [job], /too long/);
await denied("B can't withdraw A's application", B, `delete from public.applications`);
await su(`update public.applications set status='interview' where user_id=$1`, [A.id]);
await denied("can't delete once in interview", A, `delete from public.applications`);

console.log("5. Two-step verification enforcement");
const M = await newUser(db, "Meera Iyer");
await su(`insert into auth.mfa_factors (user_id, status) values ($1, 'verified')`, [M.id]);
ok("aal1 session sees no profile", (await rows(M, `select * from public.profiles`)).length === 0);
await throws("aal1 session can't call RPCs", M, `select public.start_entry('growth')`, [], /not authenticated/);
ok("aal2 session sees profile", (await rows({ ...M, aal: "aal2" }, `select * from public.profiles`)).length === 1);

console.log("6. Leaderboard privacy");
if (!process.env.UPTO || Number(process.env.UPTO) >= 13) await db.query(`select public.refresh_public_cache()`); // public boards are cached for up to a minute
await su(`insert into public.ratings (user_id, field, score) values ($1, 'marketing', 700)`, [B.id]);
await db.query(`select public.refresh_public_cache()`);
const lb = await rows(null, `select * from public.leaderboard_v2('overall', null, null, 10)`);
ok("private user shown as Hidden competitor", lb.some(r => r.name === "Hidden competitor") && !JSON.stringify(lb).includes("Asha"), JSON.stringify(lb));
ok("public user named", lb.some(r => /Bilal/.test(r.name)));
ok("private user's city hidden", !lb.some(r => r.name === "Hidden competitor" && r.city));

console.log("7. Contact form");
await as(db, null, `select public.send_contact('candidate', 'Ravi', 'ravi@x.in', 'Hello')`);
ok("anon message stored", (await su(`select count(*)::int c from public.contact_messages`)).rows[0].c === 1);
await throws("bad email rejected", null, `select public.send_contact('candidate', 'Ravi', 'not-an-email', 'Hello')`, [], /valid email/);
await throws("bad topic rejected", null, `select public.send_contact('spam', 'Ravi', 'r@x.in', 'Hello')`, [], /topic/);
await throws("empty message rejected", null, `select public.send_contact('other', 'Ravi', 'r@x.in', '   ')`, [], /message/);
for (let i = 0; i < 4; i++) await as(db, null, `select public.send_contact('other', 'Ravi', 'RAVI@x.in', 'again')`);
await throws("rate limit per email", null, `select public.send_contact('other', 'Ravi', 'ravi@x.in', 'again')`, [], /too many/);
await as(db, A, `select public.send_contact('dispute', 'Asha', 'asha@x.in', 'Q3 key looks wrong')`);
await denied("users can't read messages", A, `select * from public.contact_messages`);

console.log("8. Battles");
const room = (await as(db, A, `select public.battle_room(2, 'classic', 'marketing') id`)).rows[0].id;
const code = (await su(`select code from public.battles where id=$1`, [room])).rows[0].code;
await throws("private room needs code", B, `select public.battle_join($1, null)`, [room], /invite code/);
await as(db, B, `select public.battle_join(null, $1)`, [code.toLowerCase()]);
const rb = (await su(`select status, ranked from public.battles where id=$1`, [room])).rows[0];
ok("private 2-human room starts unranked (no Elo farming)", rb.status === "live" && rb.ranked === false, JSON.stringify(rb));
const pub = (await as(db, A, `select public.battle_quick(2, 'classic', 'data') id`)).rows[0].id;
await as(db, B, `select public.battle_quick(2, 'classic', 'data')`);
ok("public 1v1 with 2 humans is ranked", (await su(`select ranked from public.battles where id=$1`, [pub])).rows[0].ranked === true);
await throws("answer before question opens rejected", A, `select public.battle_answer($1, 0, 0)`, [pub], /time is up/);
await su(`update public.battles set started_at = now() - interval '1 second' where id=$1`, [pub]);
await throws("invalid choice rejected", A, `select public.battle_answer($1, 0, 9)`, [pub], /invalid choice/);
await throws("invalid question rejected", A, `select public.battle_answer($1, 99, 0)`, [pub], /invalid question/);
await as(db, A, `select public.battle_answer($1, 0, 0)`, [pub]);
await throws("second answer rejected", A, `select public.battle_answer($1, 0, 1)`, [pub], /already answered/);
const C = await newUser(db, "Chitra");
await throws("outsider can't answer", C, `select public.battle_answer($1, 0, 0)`, [pub], /not in this battle/);
const stC = (await as(db, C, `select public.battle_state($1) s`, [pub])).rows[0].s;
ok("spectator never gets the prompt, options or key mid-question", stC.question && !("prompt" in stC.question) && !("options" in stC.question) && !("correct" in stC.question) && !stC.reveal, JSON.stringify(stC.question));
const stB = (await as(db, B, `select public.battle_state($1) s`, [pub])).rows[0].s;
ok("player never gets the key mid-question", stB.question && Array.isArray(stB.question.options) && !("correct" in stB.question) && !JSON.stringify(stB.question).includes("answer"), JSON.stringify(stB.question));
await throws("invalid battle settings", A, `select public.battle_quick(3, 'classic', 'marketing')`, [], /invalid/);
await throws("unknown domain rejected", A, `select public.battle_quick(2, 'classic', 'pack:nope')`, [], /invalid/);
for (let i = 0; i < 5; i++) await as(db, C, `select public.battle_room(4, 'classic', 'mixed')`);
await throws("room limit enforced", C, `select public.battle_room(4, 'classic', 'mixed')`, [], /5 open rooms/);
await throws("event title validated", A, `select public.host_event('showdown', 'mixed', now() + interval '1 day', 50, 'x')`, [], /name/);
await throws("event start window validated", A, `select public.host_event('showdown', 'mixed', now(), 50, 'Cup')`, [], /start time/);
await throws("tick is server-only", A, `select public.tick_all()`);
await throws("battle internals are server-only", A, `select public._battle_start($1, true)`, [room]);

console.log("9. Account deletion");
await throws("deletion needs a recent login (stolen old session)", { ...A, loginAgo: 3600 }, `select public.delete_my_account()`, [], /reauth required/);
await throws("deletion needs a login time at all", { ...A, loginAgo: 1e9 }, `select public.delete_my_account()`, [], /reauth required/);
ok("account still there after refused deletion", (await su(`select count(*)::int n from auth.users where id=$1`, [A.id])).rows[0].n === 1);
for (const f of ["_recent_login(10)", "_path_rules(1)", "_check_batch('{}')", "_batch_ok(gen_random_uuid(), 'x')"]) {
  await throws(`signed-in user cannot call ${f}`, A, `select public.${f}`, [], /permission denied/);
  await throws(`anon cannot call ${f}`, null, `select public.${f}`, [], /permission denied/);
}
await as(db, A, `select public.delete_my_account()`);
const left = (await su(`select (select count(*) from public.profiles where id=$1) + (select count(*) from public.entries where user_id=$1)
  + (select count(*) from public.applications where user_id=$1) + (select count(*) from public.contact_messages where user_id=$1)
  + (select count(*) from public.battle_players where user_id=$1) + (select count(*) from auth.users where id=$1) as n`, [A.id])).rows[0].n;
ok("deleting the account removes all personal rows", Number(left) === 0, `left=${left}`);

console.log("10. Grants");
const g = (await su(`select table_name, grantee, privilege_type from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated') and privilege_type in ('TRUNCATE','TRIGGER','REFERENCES')`)).rows;
ok("no TRUNCATE/TRIGGER/REFERENCES grants to API roles", g.length === 0, JSON.stringify(g.slice(0, 3)));
const anonDefiner = (await su(`select proname from pg_proc where pronamespace='public'::regnamespace and prosecdef and has_function_privilege('anon', oid, 'execute') order by 1`)).rows.map(r => r.proname);
const allowed = ["backup_snapshot", "backup_status", "decide_batch", "leaderboard_v2", "packs_list", "review_batch", "send_contact", "send_feedback", "site_stats", "skills_list", "tournament_counts"];
ok("only intended functions are public", JSON.stringify(anonDefiner) === JSON.stringify(allowed), JSON.stringify(anonDefiner));
const noPath = (await su(`select proname from pg_proc where pronamespace='public'::regnamespace and prosecdef and not coalesce(array_to_string(proconfig, ',') like '%search_path%', false)`)).rows;
ok("every SECURITY DEFINER function pins search_path", noPath.length === 0, JSON.stringify(noPath));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
