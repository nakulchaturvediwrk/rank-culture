// Gameplay tests: tournaments, drills, quick battles, Fastest Finger, Elo, knockouts, scheduled events.
// Replays every migration on PGlite and drives the real SQL functions, moving clocks by editing timestamps.
// Run: cd supabase/tests && npm i && node gameplay.test.mjs
import { makeDb, as, newUser } from "./harness.mjs";
import { fileURLToPath } from "url";
import path from "path";

const MIG = path.join(path.dirname(fileURLToPath(import.meta.url)), "../migrations");
const db = await makeDb(MIG, { upTo: Number(process.env.UPTO || 99) });
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) pass++; else { fail++; console.log(`  ✗ ${name} ${extra}`); } };
const su = async (sql, p) => (await db.query(sql, p)).rows;
const one = async (sql, p) => (await su(sql, p))[0];
const call = async (u, sql, p) => (await as(db, u, sql, p)).rows;
const throws = async (name, u, sql, p, re) => { try { await as(db, u, sql, p); ok(name, false, "(did not throw)"); } catch (e) { ok(name, !re || re.test(e.message), `(${e.message})`); } };

const users = [];
for (const n of ["Asha Rao", "Bilal Khan", "Chitra Das", "Dev Iyer", "Esha Paul", "Farhan Ali"]) {
  const u = await newUser(db, n); users.push(u);
  await su(`update public.profiles set onboarded = true, visibility = 'public' where id = $1`, [u.id]);
}
const [A, B, C, D, E, F] = users;

// ---------------------------------------------------------------- Tournaments
console.log("1. Tournaments");
await su(`update public.tournaments set opens_at = now() - interval '1 day', closes_at = now() + interval '1 day'`);
const qsOf = async t => su(`select q.id, q.kind, q.points, q.skill, k.correct, jsonb_array_length(q.options) n from public.questions q left join public.answer_keys k on k.question_id = q.id where q.tournament_id = $1 order by q.position`, [t]);
const play = async (u, t, pick) => {
  await call(u, `select public.start_entry($1)`, [t]);
  const qs = await qsOf(t), ans = {};
  qs.forEach((q, i) => { ans[q.id] = q.kind === "mcq" ? pick(q, i) : "My written answer"; });
  return (await call(u, `select * from public.submit_entry($1, $2)`, [t, ans]))[0];
};
const growth = await qsOf("growth");
const mcq = growth.filter(q => q.kind === "mcq"), total = mcq.reduce((s, q) => s + q.points, 0);
ok("growth has MCQs worth 1000 in total", total === 1000, total);
// A: all right. B: only first MCQ right. C: all wrong.
const eA = await play(A, "growth", q => q.correct);
const eB = await play(B, "growth", (q, i) => (q.id === mcq[0].id ? q.correct : (q.correct + 1) % q.n));
const eC = await play(C, "growth", q => (q.correct + 1) % q.n);
ok("all correct = 1000 rating on first entry", eA.auto_points === 1000 && eA.rating_after === 1000 && eA.rating_before === null);
ok("partial score = points of the right answers", eB.auto_points === mcq[0].points && eB.rating_after === Math.round(1000 * mcq[0].points / 1000));
ok("all wrong = 0", eC.auto_points === 0 && eC.rating_after === 0);
ok("task breakdown lists every task", eA.task_scores.length === growth.length);
const r = await one(`select score, entries, history from public.ratings where user_id = $1 and field = 'marketing'`, [A.id]);
ok("rating row written", r.score === 1000 && r.entries === 1 && r.history.length === 1);
const st = await call(B, `select * from public.my_standing('growth')`);
ok("standing ranks by points (B is 2nd of 3)", Number(st[0].place) === 2 && Number(st[0].total) === 3, JSON.stringify(st));
const sk = await one(`select attempted, correct from public.skill_stats where user_id = $1 and skill = (select skill from public.questions where id = $2)`, [A.id, mcq[0].id]);
ok("tournament answers feed skill stats", sk && sk.attempted >= 1 && sk.correct >= 1, JSON.stringify(sk));
// Second marketing tournament moves the rating 35% of the way to the new performance.
await su(`insert into public.tournaments (id, name, cat, blurb, tasks, prize, opens_at, closes_at, duration_min, cap, ranked, sort)
          values ('growth2', 'Growth II', 'marketing', 'x', 'x', 'x', now() - interval '1 hour', now() + interval '1 day', 30, 3, true, 99)`);
await su(`insert into public.questions (tournament_id, position, kind, label, prompt, options, points, skill) values ('growth2', 1, 'mcq', 'Q', 'P', '["a","b","c"]', 100, 'Copywriting')`);
await su(`insert into public.answer_keys (question_id, correct) select id, 2 from public.questions where tournament_id = 'growth2'`);
const e2 = await play(A, "growth2", () => 0); // wrong → perf 0
ok("second tournament: 1000 + (0 − 1000) × 0.35 = 650", e2.rating_before === 1000 && e2.rating_after === 650, JSON.stringify([e2.rating_before, e2.rating_after]));
// Practice doesn't touch the rating.
const ep = await play(D, "practice", q => q.correct);
ok("practice entry scores but sets no rating", ep.auto_points === ep.auto_max && ep.rating_after === null);
ok("practice leaves no rating row", !(await one(`select 1 from public.ratings where user_id = $1`, [D.id])));
// Timer rules.
await su(`update public.registrations set started_at = now() - interval '40 minutes' where user_id = $1 and tournament_id = 'growth2'`, [B.id]).catch(() => {});
await call(E, `select public.start_entry('growth2')`);
await su(`update public.registrations set started_at = now() - interval '33 minutes' where user_id = $1 and tournament_id = 'growth2'`, [E.id]);
await throws("submitting after duration + 2 min grace is refused", E, `select public.submit_entry('growth2', '{}')`, [], /time is up/);
const dl = await call(F, `select public.start_entry('growth2') d`);
ok("deadline = start + duration", Math.abs(new Date(dl[0].d) - Date.now() - 30 * 60000) < 5000, dl[0].d);
await su(`update public.tournaments set closes_at = now() + interval '5 minutes' where id = 'growth2'`);
const dl2 = await call(F, `select public.start_entry('growth2') d`);
ok("restarting keeps the original start (no fresh timer)", Math.abs(new Date(dl2[0].d) - Date.now() - 5 * 60000) < 5000, dl2[0].d);
// Cap: growth2 allows 3 players. A, E, F have started; a 4th can't.
await throws("tournament cap is enforced", C, `select public.start_entry('growth2')`, [], /full/);
await throws("registering past the cap is refused too", D, `insert into public.registrations (user_id, tournament_id) values ($1, 'growth2')`, [D.id], /full/);

// ---------------------------------------------------------------- Battle helpers
const setStart = (bid, secsAgo) => su(`update public.battles set started_at = now() - make_interval(secs => $2) where id = $1`, [bid, secsAgo]);
const keyOf = async (bid, i) => (await one(`select q.correct, jsonb_array_length(q.options) n from public.battles b join public.bank_questions q on q.id = b.q_ids[$2 + 1] where b.id = $1`, [bid, i]));
const answerAt = async (bid, seat, i, right, secsIn) => {
  const k = await keyOf(bid, i), b = await one(`select started_at, q_seconds, gap_seconds from public.battles where id = $1`, [bid]);
  const choice = right ? k.correct : (k.correct + 1) % k.n;
  await su(`insert into public.battle_answers (battle_id, seat, q_index, choice, correct, answered_at)
            values ($1, $2, $3, $4, $5, $6::timestamptz + make_interval(secs => ($3::int * ($7::int + $8::int) + $9::float8)))`,
    [bid, seat, i, choice, right, b.started_at, b.q_seconds, b.gap_seconds, secsIn]);
};
// Jump to the end of the battle: move the start and every answer back together, so answer timings are kept.
const finish = async bid => {
  const b = await one(`select cardinality(q_ids) n, q_seconds + gap_seconds w, extract(epoch from (now() - started_at)) ago from public.battles where id = $1`, [bid]);
  const shift = Math.max(0, b.n * b.w + 1 - Number(b.ago));
  await su(`update public.battles set started_at = started_at - make_interval(secs => $2::float8) where id = $1`, [bid, shift]);
  await su(`update public.battle_answers set answered_at = answered_at - make_interval(secs => $2::float8) where battle_id = $1`, [bid, shift]);
  await su(`select public._battle_tick($1)`, [bid]);
};
const players = bid => su(`select seat, user_id, bot_name, place, rating_before, rating_after from public.battle_players where battle_id = $1 order by seat`, [bid]);
const scores = bid => su(`select * from public._battle_scores($1, 'infinity') order by seat`, [bid]);

// ---------------------------------------------------------------- Drills
console.log("2. Drills (bot practice)");
const drill = (await call(A, `select public.battle_room(4, 'classic', 'marketing') id`))[0].id;
await call(A, `select public.battle_start_now($1, true)`, [drill]);
let b = await one(`select status, ranked, cardinality(q_ids) n, kind from public.battles where id = $1`, [drill]);
ok("drill starts live with 8 questions", b.status === "live" && b.n === 8, JSON.stringify(b));
ok("drill is unranked", b.ranked === false);
const dp = await players(drill);
ok("3 practice bots fill the seats", dp.filter(p => p.bot_name).length === 3 && dp.length === 4);
const qdom = await su(`select distinct q.domain from public.battles b, unnest(b.q_ids) qid join public.bank_questions q on q.id = qid where b.id = $1`, [drill]);
ok("drill questions come from the chosen field", qdom.length === 1 && qdom[0].domain === "marketing", JSON.stringify(qdom));
await setStart(drill, 1);
await call(A, `select public.battle_answer($1, 0, $2)`, [drill, (await keyOf(drill, 0)).correct]);
const before = await one(`select coalesce(sum(attempted), 0)::int a from public.skill_stats where user_id = $1`, [A.id]);
await finish(drill);
b = await one(`select status from public.battles where id = $1`, [drill]);
ok("drill finishes on the clock", b.status === "finished");
const after = await one(`select coalesce(sum(attempted), 0)::int a from public.skill_stats where user_id = $1`, [A.id]);
ok("every drill question counts as attempted in skill stats", after.a - before.a === 8, `${before.a} → ${after.a}`);
ok("drill gives no arena rating", !(await one(`select 1 from public.battle_ratings where user_id = $1 and played > 0`, [A.id])));
const packDrill = (await call(B, `select public.battle_room(4, 'classic', 'pack:tcs-nqt') id`))[0].id;
await call(B, `select public.battle_start_now($1, true)`, [packDrill]);
const pq = await su(`select distinct q.pack from public.battles b, unnest(b.q_ids) qid join public.bank_questions q on q.id = qid where b.id = $1`, [packDrill]);
ok("company-pack drill uses only that pack's questions", pq.length === 1 && pq[0].pack === "tcs-nqt", JSON.stringify(pq));

// ---------------------------------------------------------------- Classic 1v1
console.log("3. Classic 1v1 (ranked)");
const duel = (await call(C, `select public.battle_quick(2, 'classic', 'data') id`))[0].id;
const duel2 = (await call(D, `select public.battle_quick(2, 'classic', 'data') id`))[0].id;
ok("matchmaking puts the second player in the first player's battle", duel === duel2);
b = await one(`select status, ranked, cardinality(q_ids) n, q_seconds from public.battles where id = $1`, [duel]);
ok("full 1v1 starts by itself, ranked, 7 questions, 20 s", b.status === "live" && b.ranked && b.n === 7 && b.q_seconds === 20, JSON.stringify(b));
// Q0 live now: C answers right after ~1 s via the real RPC; D answers wrong.
await setStart(duel, 1);
await call(C, `select public.battle_answer($1, 0, $2)`, [duel, (await keyOf(duel, 0)).correct]);
await call(D, `select public.battle_answer($1, 0, $2)`, [duel, ((await keyOf(duel, 0)).correct + 1) % (await keyOf(duel, 0)).n]);
const midD = (await call(D, `select public.battle_state($1) s`, [duel]))[0].s;
const cMid = midD.players.find(p => !p.me);
ok("mid-question scoreboard doesn't reveal who got the open question right", cMid.score === 0, JSON.stringify(midD.players));
ok("player sees options but not the key mid-question", Array.isArray(midD.question.options) && midD.question.correct === undefined);
await setStart(duel, 21); // reveal window of Q0
const rev = (await call(D, `select public.battle_state($1) s`, [duel]))[0].s;
ok("after the clock, the reveal shows the right answer and who got it first", rev.reveal && rev.reveal.correct === (await keyOf(duel, 0)).correct && /Chitra/.test(rev.reveal.first || ""), JSON.stringify(rev.reveal));
await throws("answering Q0 after its clock is refused", D, `select public.battle_answer($1, 0, 0)`, [duel], /time is up/);
// Remaining questions: C right at 5 s each, D right at 2 s each.
for (let i = 1; i < 7; i++) { await answerAt(duel, 1, i, true, 5); await answerAt(duel, 2, i, true, 2); }
await finish(duel);
const s = await scores(duel), pl = await players(duel);
const sc = s.find(x => x.seat === 1), sd = s.find(x => x.seat === 2);
const q0 = (await one(`select extract(epoch from (answered_at - (select started_at from public.battles where id = $1))) t from public.battle_answers where battle_id = $1 and seat = 1 and q_index = 0`, [duel])).t;
const exp = s => 100 + Math.max(0, Math.floor(100 * (1 - s / 20)));
ok("classic: 100 + speed bonus per right answer", sc.score === exp(Number(q0)) + 6 * exp(5) && sd.score === 6 * exp(2), JSON.stringify(s));
ok("higher score wins (C: fast on Q0 beats D: wrong on Q0)", sc.score > sd.score && pl.find(p => p.seat === 1).place === 1 && pl.find(p => p.seat === 2).place === 2);
const rC = pl.find(p => p.seat === 1), rD = pl.find(p => p.seat === 2);
ok("Elo: equal 1200s → winner +16, loser −16", rC.rating_before === 1200 && rC.rating_after === 1216 && rD.rating_after === 1184, JSON.stringify(pl));
const brC = await one(`select rating, played, wins from public.battle_ratings where user_id = $1`, [C.id]);
ok("arena rating saved with win count", brC.rating === 1216 && brC.played === 1 && brC.wins === 1, JSON.stringify(brC));
const fin = (await call(C, `select public.battle_state($1) s`, [duel]))[0].s;
ok("final state shows places and rating change", fin.status === "finished" && fin.players.find(p => p.me).delta === 16, JSON.stringify(fin.players));

// ---------------------------------------------------------------- Fastest Finger 4-player
console.log("4. Fastest Finger (4 players)");
const ff = (await call(A, `select public.battle_quick(4, 'fff', 'mixed') id`))[0].id;
for (const u of [B, C, E]) await call(u, `select public.battle_quick(4, 'fff', 'mixed')`);
b = await one(`select status, cardinality(q_ids) n, q_seconds, ranked from public.battles where id = $1`, [ff]);
ok("4 humans → starts ranked, 10 questions, 15 s", b.status === "live" && b.n === 10 && b.q_seconds === 15 && b.ranked, JSON.stringify(b));
await setStart(ff, 1000); // place answers in the past
for (let i = 0; i < 10; i++) {
  await answerAt(ff, 1, i, true, 3);      // A right at 3 s
  await answerAt(ff, 2, i, true, 2);      // B right at 2 s → always first
  await answerAt(ff, 3, i, i < 5, 1);     // C fastest but right only on Q0–4
}
await finish(ff);
const fs = await scores(ff);
ok("only the first correct answer scores 100", fs.find(x => x.seat === 3).score === 500 && fs.find(x => x.seat === 2).score === 500 && fs.find(x => x.seat === 1).score === 0, JSON.stringify(fs));
const fp = await players(ff);
ok("tie on points breaks on total answer time", fp.find(p => p.seat === 3).place === 1 && fp.find(p => p.seat === 2).place === 2, JSON.stringify(fp));
const dsum = fp.reduce((t, p) => t + (p.rating_after - p.rating_before), 0);
ok("multi-player Elo is (almost) zero-sum", Math.abs(dsum) <= 2, dsum);

// ---------------------------------------------------------------- Quick-battle housekeeping
console.log("5. Lobbies");
const lone = (await call(F, `select public.battle_quick(6, 'classic', 'tech') id`))[0].id;
await throws("can't start alone without bots", F, `select public.battle_start_now($1, false)`, [lone], /opponent/);
await su(`update public.battles set created_at = now() - interval '16 minutes' where id = $1`, [lone]);
await su(`select public.tick_all()`);
ok("abandoned lobby is cancelled after 15 min", (await one(`select status from public.battles where id = $1`, [lone])).status === "cancelled");
const room = (await call(A, `select public.battle_room(2, 'classic', 'sales') id`))[0].id;
const code = (await one(`select code from public.battles where id = $1`, [room])).code;
await call(B, `select public.battle_join(null, $1)`, [code]);
ok("private duel with 2 people starts but is unranked", (await one(`select status, ranked from public.battles where id = $1`, [room])).ranked === false);

// ---------------------------------------------------------------- Scheduled showdowns
console.log("6. Scheduled events");
await db.exec(`delete from public.battles where kind = 'showdown'; delete from public.knockouts;`);
await su(`select public.schedule_events()`); await su(`select public.schedule_events()`);
const evs = await su(`select kind, scoring, title, scheduled_at from public.battles where kind = 'showdown' order by scheduled_at`);
const ffDays = evs.filter(e => /Fastest Finger/.test(e.title)).length;
ok("8 days of daily 9 PM Fastest Finger, no duplicates on re-run", ffDays >= 7 && ffDays <= 8, ffDays);
ok("one Saturday Showdown in the window", evs.filter(e => /Saturday/.test(e.title)).length >= 1);
const kos = await su(`select title, size from public.knockouts`);
ok("Wednesday and Sunday knockouts scheduled", kos.some(k => /Midweek/.test(k.title) && k.size === 8) && kos.some(k => /Sunday/.test(k.title) && k.size === 16), JSON.stringify(kos));
const istHour = new Date(evs[0].scheduled_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false });
ok("events are at IST times", ["21", "20"].includes(String(istHour)), istHour);
const sd1 = (await call(A, `select public.host_event('showdown', 'mixed', now() + interval '1 day', 50, 'Campus Cup') r`))[0].r;
await su(`update public.battles set scheduled_at = now() - interval '1 second' where id = $1`, [sd1.id]);
await su(`select public.tick_all()`);
const sdb = await one(`select status, (select count(*)::int from public.battle_players where battle_id = $1) seats from public.battles where id = $1`, [sd1.id]);
ok("showdown with 1 person starts on time with bots filling to 4", sdb.status === "live" && sdb.seats === 4, JSON.stringify(sdb));
const empty = await one(`select id from public.battles where kind = 'showdown' and host is null order by scheduled_at limit 1`);
await su(`update public.battles set scheduled_at = now() - interval '1 second' where id = $1`, [empty.id]);
await su(`select public.tick_all()`);
ok("showdown nobody joined is cancelled", (await one(`select status from public.battles where id = $1`, [empty.id])).status === "cancelled");

// ---------------------------------------------------------------- Knockout
console.log("7. Knockout bracket (5 players → 8-bracket with byes)");
const ko = (await call(A, `select public.host_event('knockout', 'mixed', now() + interval '1 hour', 8, 'Test Cup') r`))[0].r;
for (const u of [B, C, D, E]) await call(u, `select public.ko_join(null, $1)`, [ko.code]);
await su(`update public.battle_ratings set rating = 1500 where user_id = $1`, [E.id]); // E becomes top seed
await su(`update public.knockouts set starts_at = now() - interval '1 second' where id = $1`, [ko.id]);
await su(`select public.tick_all()`);
let k = await one(`select status, bracket from public.knockouts where id = $1`, [ko.id]);
ok("bracket rounds up to 8", k.status === "running" && k.bracket === 8, JSON.stringify(k));
const seeds = await su(`select user_id, seed from public.knockout_entries where knockout_id = $1 order by seed`, [ko.id]);
ok("highest arena rating is seed 1", seeds[0].user_id === E.id, JSON.stringify(seeds));
let ms = await su(`select round, slot, p1, p2, winner, battle_id from public.knockout_matches where knockout_id = $1 order by round, slot`, [ko.id]);
ok("3 byes to the top seeds, 1 real first-round match", ms.filter(m => m.round === 1 && !m.p2 && m.winner).length === 3 && ms.filter(m => m.round === 1 && m.battle_id).length === 1, JSON.stringify(ms));
const playKo = async (m, winnerSeat, noShowSeat) => {
  await su(`update public.battles set scheduled_at = now() - interval '1 second' where id = $1`, [m.battle_id]);
  await su(`select public._battle_tick($1)`, [m.battle_id]);
  const bb = await one(`select status, cardinality(q_ids) n, ranked from public.battles where id = $1`, [m.battle_id]);
  await setStart(m.battle_id, 500);
  for (let i = 0; i < bb.n; i++) for (const seat of [1, 2]) if (seat !== noShowSeat) await answerAt(m.battle_id, seat, i, seat === winnerSeat, 3);
  await finish(m.battle_id);
  await su(`select public._ko_tick($1)`, [ko.id]);
  return bb;
};
let m1 = ms.find(m => m.round === 1 && m.battle_id);
const bb1 = await playKo(m1, 2, null);
ok("knockout match: 5-question duel, no bots", bb1.n === 5 && (await su(`select 1 from public.battle_players where battle_id = $1 and user_id is null`, [m1.battle_id])).length === 0);
ms = await su(`select round, slot, p1, p2, winner, battle_id from public.knockout_matches where knockout_id = $1 order by round, slot`, [ko.id]);
ok("winner of the match is recorded", ms.find(m => m.round === 1 && m.slot === m1.slot).winner === m1.p2);
ok("semi-finals are created once both feeders finish", ms.filter(m => m.round === 2).length === 2, JSON.stringify(ms.filter(m => m.round === 2)));
// Semi 1: p1 doesn't show up, p2 answers (all wrong). The no-show must lose.
const semis = ms.filter(m => m.round === 2);
await playKo(semis[0], 0, 1);
await playKo(semis[1], 1, null);
ms = await su(`select round, slot, p1, p2, winner from public.knockout_matches where knockout_id = $1 order by round, slot`, [ko.id]);
ok("a no-show loses even if the opponent got everything wrong", ms.find(m => m.round === 2 && m.slot === semis[0].slot).winner === semis[0].p2, JSON.stringify(ms.filter(m => m.round === 2)));
const final = (await su(`select * from public.knockout_matches where knockout_id = $1 and round = 3`, [ko.id]))[0];
ok("final is created", !!final && final.battle_id);
await playKo(final, 1, null);
k = await one(`select status, champion from public.knockouts where id = $1`, [ko.id]);
ok("champion crowned", k.status === "finished" && k.champion === final.p1, JSON.stringify(k));
const kst = (await call(final.p1 === A.id ? A : users.find(u => u.id === final.p1), `select public.ko_state($1) s`, [ko.id]))[0].s;
ok("bracket page knows I'm the champion", kst.champion_me === true);

// ---------------------------------------------------------------- Leaderboards
console.log("8. Leaderboards");
if (!process.env.UPTO || Number(process.env.UPTO) >= 13) await db.query(`select public.refresh_public_cache()`); // public boards are cached for up to a minute
const arena = await call(null, `select * from public.leaderboard_v2('arena', null, null, 10)`);
ok("arena board lists rated players", arena.length >= 4 && arena[0].score >= arena[arena.length - 1].score);
const skillName = (await one(`select skill from public.skill_stats where attempted >= 3 limit 1`)).skill;
const skillB = await call(null, `select * from public.leaderboard_v2('skill', $1, null, 10)`, [skillName]);
ok("skill board works", skillB.length >= 1);
const dom = await call(null, `select * from public.leaderboard_v2('domain', 'marketing', null, 10)`);
ok("domain board ordered by rating", dom.length >= 3 && Number(dom[0].place) === 1);

console.log("9. Public cache");
await su(`select public.refresh_public_cache()`);
const live = await su(`select * from public._leaderboard_live('overall', null, null, 50)`);
const cached = await call(null, `select * from public.leaderboard_v2('overall', null, null, 50)`);
ok("cached public leaderboard matches the live one", JSON.stringify(cached.map(r => [Number(r.place), r.name, r.score])) === JSON.stringify(live.map(r => [Number(r.place), r.name, r.score])), JSON.stringify([cached.length, live.length]));
const meRow = await call(A, `select * from public.leaderboard_v2('overall', null, null, 50) where is_me`);
ok("signed-in board is live and marks me", meRow.length === 1 && /\(you\)/.test(meRow[0].name));
const ss = (await call(null, `select public.site_stats() s`))[0].s;
ok("site stats served from cache", ss.ranked >= 1 && ss.questions > 0, JSON.stringify(ss));
const tc = await call(null, `select * from public.tournament_counts() where tournament_id = 'growth'`);
ok("tournament counts served from cache", Number(tc[0].players) === 3, JSON.stringify(tc));
await su(`update public.public_cache set refreshed_at = now() - interval '10 minutes'`);
ok("stale cache falls back to live", (await call(null, `select * from public.leaderboard_v2('overall', null, null, 5)`)).length >= 1);
await throws("visitors can't trigger a cache refresh", null, `select public.refresh_public_cache()`);
await throws("visitors can't call the live leaderboard directly", null, `select * from public._leaderboard_live('overall', null, null, 5)`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
