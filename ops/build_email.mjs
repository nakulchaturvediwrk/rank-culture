#!/usr/bin/env node
// Builds the Sunday review email. Usage:
//   node ops/build_email.mjs batch.json <review_url> <out_dir> [screenshot.png ...]
// Writes out_dir/email.html and out_dir/images.json (Resend inline attachments: {filename, content, content_id}).
import fs from "fs";
import path from "path";

const [, , file, url, out, ...shots] = process.argv;
if (!file || !url || !out) { console.error("usage: build_email.mjs batch.json review_url out_dir [png...]"); process.exit(2); }
const b = JSON.parse(fs.readFileSync(file, "utf8"));
fs.mkdirSync(out, { recursive: true });
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const FIELDS = { marketing: "Marketing", data: "Data & analytics", product: "Product", sales: "Sales", ops: "Operations", design: "Design", tech: "Tech", hr: "People ops", finance: "Finance" };
const LEVELS = ["", "Foundation", "Core", "Applied", "Advanced", "Interview-ready"];
const L = "ABCDE";
const fmt = d => new Date(d).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

const images = shots.filter(f => fs.existsSync(f)).map((f, i) => ({ filename: path.basename(f), content: fs.readFileSync(f).toString("base64"), content_id: `shot${i + 1}` }));
const mcq = b.path_items.filter(x => x.kind === "mcq").length, iv = b.path_items.filter(x => x.kind === "interview").length;
const perField = Object.keys(FIELDS).map(f => [f, b.path_items.filter(x => x.domain === f)]).filter(([, xs]) => xs.length);

const btn = (href, label, bg) => `<a href="${esc(href)}" style="display:inline-block;background:${bg};color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border:2px solid #0B0B0C;margin:4px 8px 4px 0">${label}</a>`;
const section = (title, body) => `<tr><td style="padding:20px 28px 0"><h2 style="margin:0 0 10px;font:700 20px Arial,sans-serif;color:#0B0B0C">${title}</h2>${body}</td></tr>`;

const tHtml = b.tournaments.map(t => `<div style="border:2px solid #0B0B0C;padding:14px;margin:0 0 14px">
  <div style="font:700 12px Arial;color:#2D50CD;text-transform:uppercase;letter-spacing:.06em">${esc(FIELDS[t.cat] || t.cat)} · ${esc(fmt(t.opens_at))} → ${esc(fmt(t.closes_at))} · ${t.duration_min} min</div>
  <div style="font:700 18px Arial;margin:4px 0">${esc(t.name)}</div><div style="font:14px Arial;color:#444;margin-bottom:8px">${esc(t.blurb)}</div>
  ${t.questions.map((q, i) => `<div style="font:14px/1.45 Arial;margin:10px 0 0"><strong>${i + 1}. ${esc(q.label)}</strong> <span style="color:#666">(${q.kind === "mcq" ? q.points + " pts · " + esc(q.skill) : "written, not scored"})</span><br>${esc(q.prompt)}${q.context ? `<br><span style="color:#666">${esc(q.context)}</span>` : ""}
    ${q.options ? `<br>${q.options.map((o, k) => k === q.correct ? `<span style="background:#E6F4EE;color:#12805C;font-weight:700">✓ ${L[k]}. ${esc(o)}</span>` : `<span style="color:#444">${L[k]}. ${esc(o)}</span>`).join("<br>")}${q.why ? `<br><span style="color:#666;font-size:13px">Why: ${esc(q.why)}</span>` : ""}` : ""}</div>`).join("")}
</div>`).join("");

const pHtml = perField.map(([f, xs]) => {
  const byL = [1, 2, 3, 4, 5].map(l => [l, xs.filter(x => x.level === l)]).filter(([, a]) => a.length);
  return `<div style="margin:0 0 16px"><div style="font:700 16px Arial;margin-bottom:4px">${esc(FIELDS[f])} — ${xs.length} new</div>
    ${byL.map(([l, a]) => `<div style="font:700 13px Arial;color:#2D50CD;margin:8px 0 2px">Level ${l} · ${LEVELS[l]}</div>${a.map(x => `<div style="font:13px/1.45 Arial;margin:6px 0 0;padding-left:10px;border-left:3px solid #ddd">${x.kind === "interview" ? "🎤 " : ""}${esc(x.prompt)}
      ${x.kind === "mcq" ? `<br>${x.options.map((o, k) => k === x.correct ? `<strong style="color:#12805C">✓ ${esc(o)}</strong>` : `<span style="color:#666">${esc(o)}</span>`).join(" · ")}` : `<br><span style="color:#666">Model answer: ${esc(x.model_answer.slice(0, 280))}${x.model_answer.length > 280 ? "…" : ""}</span>`}</div>`).join("")}`).join("")}</div>`;
}).join("");

const html = `<!doctype html><html><body style="margin:0;background:#FAFAF8">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FAFAF8"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:#fff;border:2px solid #0B0B0C">
<tr><td style="background:#0B0B0C;padding:20px 28px"><img src="https://rankculture.in/assets/logo-180.png" width="56" height="56" alt="Rank Culture" style="display:block"></td></tr>
<tr><td style="padding:24px 28px 0">
  <div style="font:700 12px Arial;color:#2D50CD;text-transform:uppercase;letter-spacing:.08em">Weekly review · week of ${esc(b.week_start)}</div>
  <h1 style="margin:6px 0 10px;font:700 28px Arial,sans-serif;color:#0B0B0C">Next week: ${b.tournaments.length} tournaments, ${mcq} practice and ${iv} interview questions</h1>
  <p style="font:15px/1.5 Arial;color:#333;margin:0 0 14px">${esc(b.summary || "")}</p>
  <p style="font:15px/1.5 Arial;color:#333;margin:0 0 6px"><strong>It goes live on Monday at 10:00 AM IST</strong> unless you hold it. Approve to publish now, or hold to stop it.</p>
  ${btn(url + "&do=approve", "Review &amp; approve", "#2D50CD")}${btn(url + "&do=hold", "Review &amp; hold", "#0B0B0C")}
  <p style="font:12px Arial;color:#777;margin:6px 0 0">Both buttons open the review page first — nothing changes until you click there. The link expires in 21 days.</p>
</td></tr>
${b.feedback_notes ? section("What students said — and what changed", `<p style="font:14px/1.55 Arial;color:#333;white-space:pre-line;margin:0">${esc(b.feedback_notes)}</p>`) : ""}
${section("How it works", `<ol style="font:14px/1.6 Arial;color:#333;margin:0;padding-left:20px">
  <li>Every Sunday a scheduled job reads the week's student feedback and results, then writes next week's tournaments and new practice questions.</li>
  <li>A second, independent check re-answers every question; anything it disagrees with is dropped before you see it.</li>
  <li>You get this email at 6 PM. Approve → live now. Hold → nothing goes live. No reply → live Monday 10 AM.</li>
  <li>Practice questions join each field's job-ready path at levels 1–5, so students who finished a level get fresh, harder questions next time they log in.</li></ol>`)}
${images.length ? section("How it looks", images.map((im, i) => `<img src="cid:${im.content_id}" width="584" alt="Preview ${i + 1}" style="display:block;width:100%;max-width:584px;border:1px solid #ddd;margin:0 0 12px">`).join("")) : ""}
${section("Tournaments (answers marked ✓)", tHtml)}
${section("New practice questions by field and level", pHtml)}
<tr><td style="padding:20px 28px 28px">${btn(url, "Open the full review", "#2D50CD")}<p style="font:12px Arial;color:#777">Sent by the Rank Culture weekly content job to rank1@rankculture.in.</p></td></tr>
</table></td></tr></table></body></html>`;

fs.writeFileSync(path.join(out, "email.html"), html);
fs.writeFileSync(path.join(out, "images.json"), JSON.stringify(images));
console.log(`email.html ${Math.round(html.length / 1024)} KB, ${images.length} inline image(s), ${Math.round(images.reduce((s, i) => s + i.content.length, 0) * 0.75 / 1024)} KB`);
