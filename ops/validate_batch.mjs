#!/usr/bin/env node
// Validates a weekly batch before it is staged. Usage: node ops/validate_batch.mjs batch.json [existing_prompts.json]
// Exits 1 with a list of problems; prints a short summary on success.
import fs from "fs";

const FIELDS9 = ["marketing", "data", "product", "sales", "ops", "design", "tech", "hr", "finance"];
const T_FIELDS = ["marketing", "data", "product", "sales", "ops", "design", "tech", "hr"];
const [, , file, existingFile] = process.argv;
if (!file) { console.error("usage: validate_batch.mjs batch.json [existing_prompts.json]"); process.exit(2); }
const b = JSON.parse(fs.readFileSync(file, "utf8"));
const existing = new Set(existingFile ? JSON.parse(fs.readFileSync(existingFile, "utf8")).map(norm) : []);
const P = [];
const bad = m => P.push(m);
function norm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }

if (!/^\d{4}-\d{2}-\d{2}$/.test(b.week_start || "")) bad("week_start must be YYYY-MM-DD (the Monday the week starts)");
else if (new Date(b.week_start + "T12:00:00Z").getUTCDay() !== 1) bad("week_start must be a Monday");
if (!Array.isArray(b.tournaments)) bad("tournaments[] missing");
if (!Array.isArray(b.path_items)) bad("path_items[] missing");
const weekStart = new Date(b.week_start + "T00:00:00+05:30"), weekEnd = new Date(weekStart.getTime() + 8 * 86400e3);
const seen = new Set();
const checkMcq = (where, q) => {
  if (!Array.isArray(q.options) || q.options.length < 3 || q.options.length > 5) bad(`${where}: needs 3–5 options`);
  else {
    if (new Set(q.options.map(norm)).size !== q.options.length) bad(`${where}: duplicate options`);
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.options.length) bad(`${where}: correct index out of range`);
    if (q.options.some(o => /all of the above|none of the above/i.test(o))) bad(`${where}: avoid "all/none of the above"`);
  }
  if (!q.prompt || q.prompt.length < 15) bad(`${where}: prompt too short`);
  const k = norm(q.prompt);
  if (seen.has(k)) bad(`${where}: duplicate prompt in this batch`); seen.add(k);
  if (existing.has(k)) bad(`${where}: prompt already used before`);
};

for (const t of b.tournaments || []) {
  const w = `tournament ${t.id}`;
  if (!/^[a-z0-9-]{3,40}$/.test(t.id || "")) bad(`${w}: id must be lowercase letters, digits, hyphens (3–40)`);
  if (!T_FIELDS.includes(t.cat)) bad(`${w}: cat must be one of ${T_FIELDS.join(",")}`);
  for (const f of ["name", "blurb", "tasks", "prize"]) if (!t[f]) bad(`${w}: missing ${f}`);
  const o = new Date(t.opens_at), c = new Date(t.closes_at);
  if (isNaN(o) || isNaN(c) || c <= o) bad(`${w}: bad window`);
  else if (o < weekStart || c > weekEnd) bad(`${w}: window must sit inside the week of ${b.week_start}`);
  if (!Number.isInteger(t.duration_min) || t.duration_min < 20 || t.duration_min > 60) bad(`${w}: duration_min 20–60`);
  const mcqs = (t.questions || []).filter(q => q.kind === "mcq"), texts = (t.questions || []).filter(q => q.kind === "text");
  if (mcqs.length < 3 || mcqs.length > 6) bad(`${w}: 3–6 scored questions`);
  if (texts.length > 1) bad(`${w}: at most one written question`);
  if (mcqs.reduce((s, q) => s + (q.points || 0), 0) !== 1000) bad(`${w}: scored points must total 1000`);
  if (texts.some(q => q.points)) bad(`${w}: written questions are worth 0 points`);
  mcqs.forEach((q, i) => { checkMcq(`${w} Q${i + 1}`, q); if (!q.skill) bad(`${w} Q${i + 1}: missing skill`); if (!q.why) bad(`${w} Q${i + 1}: missing why (shown in the review)`); });
}
const tf = (b.tournaments || []).map(t => t.cat);
for (const f of T_FIELDS) if (!tf.includes(f)) bad(`no tournament for ${f}`);
if (new Set((b.tournaments || []).map(t => t.id)).size !== (b.tournaments || []).length) bad("duplicate tournament ids");

const counts = {};
(b.path_items || []).forEach((x, i) => {
  const w = `path_item ${i} (${x.domain} L${x.level})`;
  if (!FIELDS9.includes(x.domain)) bad(`${w}: bad domain`);
  if (!Number.isInteger(x.level) || x.level < 1 || x.level > 5) bad(`${w}: level 1–5`);
  if (!x.skill) bad(`${w}: missing skill`);
  if (x.kind === "mcq") { checkMcq(w, x); if (!x.explanation || x.explanation.length < 20) bad(`${w}: explanation (20+ chars) required`); }
  else if (x.kind === "interview") {
    if (!x.prompt || x.prompt.length < 15) bad(`${w}: prompt too short`);
    if (!x.model_answer || x.model_answer.split(/\s+/).length < 80) bad(`${w}: model answer must be 80+ words`);
    if (!Array.isArray(x.rubric) || x.rubric.length < 3) bad(`${w}: rubric needs 3+ points`);
    if (!Array.isArray(x.key_points) || x.key_points.length < 3 || x.key_points.some(k => !k.label || !Array.isArray(k.words) || !k.words.length)) bad(`${w}: key_points needs 3+ {label, words[]}`);
    const k = norm(x.prompt); if (seen.has(k)) bad(`${w}: duplicate prompt`); seen.add(k); if (existing.has(k)) bad(`${w}: prompt already used before`);
  } else bad(`${w}: kind must be mcq or interview`);
  const key = `${x.domain}:${x.level}:${x.kind}`; counts[key] = (counts[key] || 0) + 1;
});

// Answer positions should be spread, not always B.
const pos = [...(b.tournaments || []).flatMap(t => (t.questions || []).filter(q => q.kind === "mcq")), ...(b.path_items || []).filter(x => x.kind === "mcq")].map(q => q.correct);
if (pos.length >= 20) { const top = Math.max(...[0, 1, 2, 3, 4].map(k => pos.filter(p => p === k).length)); if (top / pos.length > 0.45) bad(`answer positions are lopsided (${top}/${pos.length} use the same letter)`); }

if (P.length) { console.error(`${P.length} problem(s):\n- ` + P.join("\n- ")); process.exit(1); }
console.log(`OK: ${b.tournaments.length} tournaments, ${b.path_items.filter(x => x.kind === "mcq").length} practice MCQs, ${b.path_items.filter(x => x.kind === "interview").length} interview items`);
console.log(Object.entries(counts).sort().map(([k, v]) => `${k}=${v}`).join("  "));
