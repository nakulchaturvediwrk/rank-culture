// Feedback, job-ready path and weekly content batches (migration 0015).
import { makeDb, as, newUser } from "./harness.mjs";
import { fileURLToPath } from "url";
import path from "path";

const MIG = path.join(path.dirname(fileURLToPath(import.meta.url)), "../migrations");
const db = await makeDb(MIG);
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) pass++; else { fail++; console.log(`  ✗ ${name} ${extra}`); } };
const throws = async (name, u, sql, p, re) => { try { await as(db, u, sql, p); ok(name, false, "(did not throw)"); } catch (e) { ok(name, !re || re.test(e.message), `(${e.message})`); } };
const su = (sql, p) => db.query(sql, p);
const one = async (u, sql, p) => (await as(db, u, sql, p)).rows[0];

const A = await newUser(db, "Asha Rao", "asha@x.in"), B = await newUser(db, "Bilal Khan", "bilal@x.in");

console.log("1. Feedback");
await as(db, A, `select public.send_feedback('tournament', 'growth', 4, 'Loved task 2', 'results.html')`);
await as(db, null, `select public.send_feedback('site', null, null, 'Make the timer bigger', 'contact.html')`);
ok("signed-in and anonymous site feedback saved", Number((await su(`select count(*) n from public.feedback`)).rows[0].n) === 2);
await throws("anon can't rate a tournament", null, `select public.send_feedback('tournament', 'growth', 5, null)`, [], /sign in/);
await throws("rating must be 1-5", A, `select public.send_feedback('drill', 'data', 9, null)`, [], /1 to 5/);
await throws("empty feedback rejected", A, `select public.send_feedback('drill', 'data', null, '   ')`, [], /rating or a comment/);
await throws("unknown kind rejected", A, `select public.send_feedback('admin', null, 3, null)`, [], /unknown/);
let blocked = false; try { await as(db, A, `select * from public.feedback`); } catch (e) { blocked = true; }
ok("users can't read feedback", blocked);
for (let i = 0; i < 19; i++) await as(db, A, `select public.send_feedback('site', null, 3, null)`);
await throws("feedback rate-limited to 20/hour", A, `select public.send_feedback('site', null, 3, null)`, [], /too many/);

console.log("2. Path basics");
const starters = Number((await su(`select count(*) n from public.path_items where source like 'bank:%'`)).rows[0].n);
ok("battle bank copied in as Core practice", starters >= 200, `(${starters})`);
await throws("path needs a goal first", B, `select * from public.path_next(10)`, [], /goal/);
await throws("months must be 3-12", B, `select public.set_path('data', 2)`, [], /3 to 12/);
await throws("field must be valid", B, `select public.set_path('astrology', 6)`, [], /field/);
let st = (await one(B, `select public.set_path('data', 3) s`)).s;
ok("set_path starts at level 1", st.level === 1 && st.months === 3 && st.weeks === 13, JSON.stringify(st));

// Seed a clean level-1 pool for 'data' with known answers.
await su(`insert into public.path_items (domain, skill, level, kind, prompt, options, correct, explanation)
          select 'data', 'SQL', 1, 'mcq', 'L1 q' || g, '["a","b","c","d"]', g % 4, 'because' from generate_series(1, 25) g`);
await su(`insert into public.path_items (domain, skill, level, kind, prompt, model_answer, rubric, key_points)
          values ('data', 'Interview', 1, 'interview', 'Tell me about a dataset you cleaned', 'Model answer here', '["STAR"]', '[{"label":"metric","words":["%"]}]')`);
let set = (await as(db, B, `select * from public.path_next(10)`)).rows;
ok("path_next returns a set", set.length === 10, `(${set.length})`);
ok("path_next hides answers", set.every(x => !("correct" in x) && !("model_answer" in x)));
ok("set is at the student's level", set.every(x => x.level === 1));
ok("set includes an interview item at level 1", set.some(x => x.kind === "interview"));
await throws("can't answer an item off your path", A, `select public.path_answer($1, 0)`, [set.find(x => x.kind === "mcq").id], /not on your path/);

console.log("3. Levelling up");
const keys = Object.fromEntries((await su(`select id, correct from public.path_items where domain='data' and level=1 and kind='mcq'`)).rows.map(r => [r.id, r.correct]));
const ids = Object.keys(keys).map(Number);
let r;
for (let i = 0; i < 14; i++) r = (await one(B, `select public.path_answer($1, $2) r`, [ids[i], keys[ids[i]]])).r;
ok("no level-up before 15 answers", r.leveled_up === false && r.state.level === 1 && r.correct === true && r.explanation === "because");
r = (await one(B, `select public.path_answer($1, $2) r`, [ids[14], (keys[ids[14]] + 1) % 4])).r;
ok("wrong answer is marked wrong and shows the key", r.correct === false && r.answer === keys[ids[14]]);
ok("15 answers at 93% → Core", r.leveled_up === true && r.state.level === 2, JSON.stringify(r.state));
const ss = (await su(`select attempted, correct from public.skill_stats where user_id=$1 and skill='SQL'`, [B.id])).rows[0];
ok("path answers feed skill stats", ss && ss.attempted === 15 && ss.correct === 14, JSON.stringify(ss));

// A struggling student does not level up.
const C = await newUser(db, "Chirag");
await as(db, C, `select public.set_path('data', 6)`);
for (let i = 0; i < 20; i++) r = (await one(C, `select public.path_answer($1, $2) r`, [ids[i], i % 2 ? keys[ids[i]] : (keys[ids[i]] + 1) % 4])).r;
ok("50% accuracy stays at Foundation", r.state.level === 1 && r.state.accuracy === 50, JSON.stringify(r.state));

console.log("4. Interview items");
const iv = (await su(`select id from public.path_items where kind='interview' and domain='data' limit 1`)).rows[0].id;
await throws("short answers rejected", C, `select public.path_reveal($1, 'idk')`, [iv], /40\+/);
await throws("self-score needs an answer first", C, `select public.path_self_score($1, 3)`, [iv], /answer the question/);
const rev = (await one(C, `select public.path_reveal($1, $2) r`, [iv, "I cleaned a 2 lakh row sales dataset, cut duplicates by 12% and fixed dates."])).r;
ok("reveal returns model answer, rubric and key points", rev.model_answer === "Model answer here" && rev.rubric.length === 1 && rev.key_points.length === 1);
const sc = (await one(C, `select public.path_self_score($1, 4) r`, [iv])).r;
ok("self-score saved", sc.state.level === 1);
await throws("self-score bounded", C, `select public.path_self_score($1, 7)`, [iv], /0 to 4/);
const theirs = (await su(`select answer_text, self_score from public.path_attempts where user_id=$1 and item_id=$2`, [C.id, iv])).rows[0];
ok("answer text kept for future coaching", theirs.answer_text.includes("2 lakh") && theirs.self_score === 4);

console.log("5. Changing field resets the climb");
st = (await one(B, `select public.set_path('product', 6) s`)).s;
ok("new field starts at level 1", st.level === 1 && st.field === "product");
st = (await one(B, `select public.set_path('product', 9) s`)).s;
ok("changing only months keeps level", st.level === 1 && st.months === 9);
let pathRead = false; try { const rr = await as(db, A, `select * from public.user_paths`); pathRead = rr.rows.some(x => x.user_id !== A.id); } catch (e) { pathRead = false; }
ok("users only see their own path", !pathRead);
let itemsRead = false; try { await as(db, B, `select correct from public.path_items limit 1`); itemsRead = true; } catch (e) { }
ok("answer keys in path_items are not readable", !itemsRead);

console.log("6. Weekly batches");
const T = (id, cat, pts = [300, 400, 300]) => ({ id, name: "Test " + id, cat, blurb: "b", tasks: "t", prize: "p", opens_at: "2026-12-01T10:00:00+05:30", closes_at: "2026-12-07T23:59:00+05:30", duration_min: 30,
  questions: [...pts.map((p, i) => ({ kind: "mcq", label: "Task " + (i + 1), prompt: "Q" + i, options: ["a", "b", "c"], correct: i % 3, points: p, skill: "SQL" })), { kind: "text", label: "Written", prompt: "Explain", points: 0 }] });
const good = { tournaments: [T("wk1-data", "data"), T("wk1-sales", "sales")], path_items: [
  { domain: "data", skill: "SQL", level: 3, kind: "mcq", prompt: "P", options: ["x", "y"], correct: 1, explanation: "e" },
  { domain: "data", skill: "Case", level: 5, kind: "interview", prompt: "Walk me through…", model_answer: "M", rubric: ["r"], key_points: [] }] };
await throws("students can't stage batches", A, `select * from public.stage_batch('2026-11-30', $1)`, [good]);
let bad = false; try { await su(`select * from public.stage_batch('2026-11-30', $1)`, [{ tournaments: [T("wk1-x", "data", [300, 300, 300])], path_items: [] }]); } catch (e) { bad = /1000/.test(e.message); }
ok("batch with wrong points total rejected", bad);
bad = false; try { await su(`select * from public.stage_batch('2026-11-30', $1)`, [{ tournaments: [], path_items: [{ domain: "data", skill: "x", level: 2, kind: "mcq", prompt: "p", options: ["a"], correct: 3 }] }]); } catch (e) { bad = /answer key/.test(e.message); }
ok("batch with bad answer key rejected", bad);
const stg = (await su(`select * from public.stage_batch('2026-11-30', $1, 'summary')`, [good])).rows[0];
ok("stage returns id + token", stg.batch_id && /^[0-9a-f]{48}$/.test(stg.token));
ok("token stored only as a hash", (await su(`select token_hash from public.content_batches where id=$1`, [stg.batch_id])).rows[0].token_hash !== stg.token);
ok("drafts are invisible to students", (await as(db, A, `select * from public.tournaments where id='wk1-data'`)).rows.length === 0);
await throws("wrong token can't review", null, `select public.review_batch($1, 'nope')`, [stg.batch_id], /invalid/);
const rv = (await one(null, `select public.review_batch($1, $2) r`, [stg.batch_id, stg.token])).r;
ok("review link shows the full draft", rv.status === "draft" && rv.payload.tournaments.length === 2);
await throws("wrong token can't approve", null, `select public.decide_batch($1, 'nope', 'approve')`, [stg.batch_id], /invalid/);
let d = (await one(null, `select public.decide_batch($1, $2, 'hold') r`, [stg.batch_id, stg.token])).r;
ok("hold works", d.status === "held");
ok("held batches are skipped on Monday", Number((await su(`select public.publish_due_batches() n`)).rows[0].n) === 0);
d = (await one(null, `select public.decide_batch($1, $2, 'release') r`, [stg.batch_id, stg.token])).r;
d = (await one(null, `select public.decide_batch($1, $2, 'approve') r`, [stg.batch_id, stg.token])).r;
ok("approve publishes immediately", d.status === "published", JSON.stringify(d).slice(0, 200));
ok("tournaments now live", (await as(db, A, `select id from public.tournaments where id in ('wk1-data','wk1-sales')`)).rows.length === 2);
ok("answer keys created", Number((await su(`select count(*) n from public.answer_keys k join public.questions q on q.id=k.question_id where q.tournament_id='wk1-data'`)).rows[0].n) === 3);
ok("path items added to the pool", Number((await su(`select count(*) n from public.path_items where batch_id=$1`, [stg.batch_id])).rows[0].n) === 2);
await throws("can't publish twice", null, `select public.decide_batch($1, $2, 'approve')`, [stg.batch_id, stg.token], /already/);

// Unanswered drafts go live on Monday; a re-run for the same week replaces the earlier draft.
const g2 = { tournaments: [T("wk2-ops", "ops")], path_items: [] };
const s1 = (await su(`select * from public.stage_batch('2026-12-07', $1)`, [g2])).rows[0];
const s2 = (await su(`select * from public.stage_batch('2026-12-07', $1)`, [{ tournaments: [T("wk2-ops-b", "ops")], path_items: [] }])).rows[0];
ok("re-run holds the older draft", (await su(`select status from public.content_batches where id=$1`, [s1.batch_id])).rows[0].status === "held");
await su(`update public.content_batches set week_start = current_date where id=$1`, [s2.batch_id]);
ok("Monday job publishes unanswered drafts", Number((await su(`select public.publish_due_batches() n`)).rows[0].n) === 1);
ok("…and only the latest draft", (await su(`select count(*) n from public.tournaments where id like 'wk2-ops%'`)).rows[0].n == 1);

console.log("7. Sunday email");
const s3 = (await su(`select * from public.stage_batch('2026-12-14', $1)`, [{ tournaments: [T("wk3-hr", "hr")], path_items: [] }])).rows[0];
await su(`select public.set_batch_email($1, '<p>Review</p>', '[{"filename":"a.png","content":"AAAA","content_id":"a"}]')`, [s3.batch_id]);
await su(`select public.send_review_emails()`);
ok("no key in Vault → no send, error noted", (await su(`select email_error, email_sent_at from public.content_batches where id=$1`, [s3.batch_id])).rows[0].email_error === "no resend_api_key in Vault");
await su(`insert into vault.decrypted_secrets values ('resend_api_key', 're_test')`);
ok("sends once the key exists", Number((await su(`select public.send_review_emails() n`)).rows[0].n) === 1);
const sent = (await su(`select body from net.sent order by 1 desc limit 1`)).rows[0].body;
ok("email goes to rank1@ from noreply@ with images", sent.to[0] === "rank1@rankculture.in" && /noreply@rankculture\.in/.test(sent.from) && sent.attachments.length === 1);
ok("email not sent twice", Number((await su(`select public.send_review_emails() n`)).rows[0].n) === 0);
await throws("students can't trigger emails", A, `select public.send_review_emails()`);

const old = (await su(`select * from public.stage_batch('2026-12-07', $1, 'old')`, [good])).rows[0];
await su(`update public.content_batches set created_at = now() - interval '8 days' where id = $1`, [old.batch_id]);
await throws("review link expires after 7 days", null, `select public.review_batch($1, $2)`, [old.batch_id, old.token], /invalid|expired/);
await throws("expired link can't approve", null, `select public.decide_batch($1, $2, 'approve')`, [old.batch_id, old.token], /invalid|expired/);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
