// Rank Culture runtime: auth, route guards and live data for the app screens.
// Everything user-supplied is escaped with esc() before it touches innerHTML.
const { createClient } = require("@supabase/supabase-js");
const { ic, bar, tierBadge, pageHead } = require("./layout");
const CFG = require("./config");

const sb = createClient(CFG.url, CFG.key, {
  auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: CFG.storageKey },
});

// ---------- Routes ----------
const PROTECTED = new Set(["onboarding-1.html", "onboarding-2.html", "onboarding-3.html", "dashboard.html", "arena.html", "tournament.html",
  "live.html", "results.html", "drills.html", "jobs.html", "job.html", "applications.html", "applications-empty.html", "leaderboard-app.html",
  "profile.html", "messages.html", "notifications.html", "network.html", "companies.html", "settings.html", "mfa.html",
  "battles.html", "battle.html", "knockout.html", "path.html"]);
// Pages whose <main> is rendered entirely from live data (prototype markup is never shown).
const RENDERED = new Set(["dashboard.html", "arena.html", "tournament.html", "live.html", "results.html", "jobs.html", "job.html",
  "applications.html", "applications-empty.html", "leaderboard-app.html", "profile.html", "settings.html", "mfa.html", "auth-callback.html", "drills.html",
  "battles.html", "battle.html", "knockout.html", "path.html", "review.html"]);
const SAMPLE = new Set(["messages.html", "notifications.html", "network.html", "companies.html"]);

const FIELDS = { marketing: "Marketing", data: "Data & analytics", product: "Product", sales: "Sales", ops: "Operations", design: "Design", tech: "Tech", hr: "People ops", finance: "Finance" };
const FIELD_ORDER = ["marketing", "data", "product", "sales", "ops", "design", "tech", "hr", "finance"];
const STAGES = { college: "In college", grad_0_2: "Graduated 0–2 yrs", working_2_plus: "Working 2+ yrs", switching: "Switching careers" };
const TIERS = [[900, "Legend"], [800, "Elite"], [650, "Challenger"], [450, "Contender"], [0, "Rookie"]];

// ---------- Small utils ----------
const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const params = () => new URLSearchParams(location.search);
const go = url => { location.replace(url); return new Promise(() => {}); };
const toast = m => (window.toast ? window.toast(m) : alert(m));
const main = () => document.getElementById("main");
const tierName = s => TIERS.find(([min]) => s >= min)[1];
const nextTier = s => [450, 650, 800, 900, 1001].find(x => x > s);
const initials = n => (n || "?").trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
const firstName = n => (n || "").trim().split(/\s+/)[0] || "there";
const n = x => Number(x || 0).toLocaleString("en-IN");
const fmt = d => new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(d)) + " IST";
const fmtDay = d => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(d));
const ago = d => { const s = (Date.now() - new Date(d)) / 1000; return s < 3600 ? "Just now" : s < 86400 ? `${Math.floor(s / 3600)} h ago` : `${Math.floor(s / 86400)} days ago`; };
const safeNext = v => (v && /^[a-z0-9-]+\.html(\?[\w=&%.-]*)?$/i.test(v) ? v : null);
const here = () => (location.pathname.split("/").pop() || "index.html") + location.search;
const friendly = e => {
  const m = (e && (e.message || e.error_description || e.msg)) || String(e);
  if (/reauth required/i.test(m)) return "For your safety, please log in again, then delete your account.";
  if (/captcha/i.test(m)) return "Please complete the security check and try again.";
  if (/rate limit|too many/i.test(m)) return "Too many attempts. Please wait a minute and try again.";
  if (/invalid login credentials/i.test(m)) return "Wrong email or password.";
  if (/token.*(expired|invalid)|otp.*(expired|invalid)|expired.*(token|otp)/i.test(m)) return "That code is wrong or has expired. Check the latest email, or resend.";
  if (/user already registered/i.test(m)) return "An account with this email already exists. Log in instead.";
  if (/same.*(old|current)|different from the old/i.test(m)) return "Choose a password you haven't used here before.";
  if (/(pwned|leaked|known to be weak|easy to guess)/i.test(m)) return "That password has appeared in a data breach. Please choose another.";
  if (/password should/i.test(m)) return m;
  if (/email not confirmed/i.test(m)) return "Please confirm your email first.";
  if (/signups not allowed|user not found/i.test(m)) return "No account with that email yet — sign up first.";
  if (/expired|invalid.*(token|otp)/i.test(m)) return "That code is wrong or has expired. Request a new one.";
  if (/failed to fetch|network/i.test(m)) return "Can't reach the server. Check your connection.";
  return m.replace(/^.*?:\s*/, "") || "Something went wrong.";
};
async function q(p) { const { data, error } = await p; if (error) throw error; return data; }

const hasStoredSession = () => { try { return !!localStorage.getItem(CFG.storageKey); } catch (e) { return false; } };
const loader = `<div class="stack-lg" aria-busy="true" aria-label="Loading"><div class="skel" style="height:40px;width:40%"></div><div class="grid g3"><div class="skel span2" style="height:180px"></div><div class="skel" style="height:180px"></div></div><div class="skel" style="height:220px"></div></div>`;

// Synchronous gate, run before the page body is written.
function guard(file) {
  if (PROTECTED.has(file) && !hasStoredSession()) { location.replace("login.html?next=" + encodeURIComponent(here())); return false; }
  return true;
}
function prepare(file, html) {
  if (!RENDERED.has(file)) return html;
  return html.replace(/(<main[^>]*id="main"[^>]*>)[\s\S]*<\/main>/, `$1<div class="${/live|mfa|auth-callback/.test(file) ? "container section-sm" : ""}">${loader}</div></main>`);
}

// ---------- Data ----------
let ME = null; // { user, profile, ratings: {field: row} }
async function loadMe(user) {
  const [profile, ratings] = await Promise.all([
    q(sb.from("profiles").select("*").eq("id", user.id).single()),
    q(sb.from("ratings").select("field, score, entries, history, updated_at")),
  ]);
  const r = {}; ratings.forEach(x => { r[x.field] = x; });
  return { user, profile, ratings: r };
}
const bestField = () => {
  const rs = Object.values(ME.ratings).sort((a, b) => b.score - a.score);
  return rs.length ? rs[0].field : ME.profile.field || "marketing";
};
const status = t => { const now = Date.now(); return now < new Date(t.opens_at) ? "upcoming" : now < new Date(t.closes_at) ? "live" : "ended"; };
async function loadTournaments() {
  const [ts, counts] = await Promise.all([q(sb.from("tournaments").select("*").order("sort")), q(sb.rpc("tournament_counts"))]);
  const c = {}; counts.forEach(x => { c[x.tournament_id] = Number(x.players); });
  return ts.map(t => Object.assign(t, { players: c[t.id] || 0, status: status(t) }));
}
const myRegs = async () => { const r = {}; (await q(sb.from("registrations").select("tournament_id, started_at"))).forEach(x => { r[x.tournament_id] = x; }); return r; };
const myEntries = async () => { const r = {}; (await q(sb.from("entries").select("tournament_id, auto_points, auto_max, rating_before, rating_after, task_scores, written_pending, submitted_at").order("submitted_at", { ascending: false }))).forEach(x => { r[x.tournament_id] = x; }); return r; };

// ---------- Shared pieces ----------
const whenText = t => t.status === "live" ? `Live · closes ${fmt(t.closes_at)}` : t.status === "upcoming" ? `Opens ${fmt(t.opens_at)}` : `Ended ${fmtDay(t.closes_at)}`;
const statusBadge = t => t.status === "live" ? '<span class="badge red live">Live</span>' : t.status === "ended" ? '<span class="badge">Ended</span>' : '<span class="badge green">Registration open</span>';
function tCard(t, reg, entry, pub) {
  const href = pub ? `signup.html` : entry ? `results.html?t=${esc(t.id)}` : `tournament.html?t=${esc(t.id)}`;
  const label = pub ? (t.status === "ended" ? "Ended" : "Sign up to compete") : entry ? "See my result" : t.status === "live" ? "Enter now" : t.status === "upcoming" ? (reg ? "Registered ✓" : "Register free") : "View";
  const cls = !pub && entry ? "" : t.status === "live" ? "btn-primary" : t.status === "ended" ? "" : "btn-dark";
  const pct = Math.min(100, Math.round((t.players / t.cap) * 100));
  return `<article class="card hover" data-cat="${esc(t.cat)} ${t.status}${reg ? " mine" : ""}">
  <div class="card-head"><span class="badge">${esc(FIELDS[t.cat] || t.cat)}</span>${t.ranked ? statusBadge(t) : '<span class="badge blue">Practice</span>'}</div>
  <h3 class="t-h3">${esc(t.name)}</h3><p class="t-sm muted mt1">${esc(t.tasks)}</p>
  <div class="list mt2 t-sm"><div><span class="muted">${ic("clock")}</span><span style="flex:1">${whenText(t)}</span><span class="mono t-xs">${t.duration_min} min</span></div>
  <div><span class="muted">${ic("medal")}</span><span style="flex:1">${esc(t.prize)}</span></div></div>
  <div class="mt2">${bar(pct, "blue thin")}<div class="row between mt1 t-xs"><span class="mono">${n(t.players)} registered</span><span class="muted">${n(Math.max(0, t.cap - t.players))} spots left</span></div></div>
  <a class="btn ${cls} btn-block mt3" href="${href}">${label}</a></article>`;
}
function errorState(e, retry = true) {
  console.error(e);
  return `<div class="empty"><div class="icon">${ic("x")}</div><h2 class="t-h2">That didn't load</h2><p class="muted t-sm" style="max-width:48ch">${esc(friendly(e))}</p>${retry ? '<button class="btn btn-primary" data-reload>Try again</button>' : ""}</div>`;
}
const render = (html, root = main()) => { root.innerHTML = html; if (window.RCbind) window.RCbind(root); return root; };
const modal = (id, title, body) => `<div class="modal" id="${id}" role="dialog" aria-modal="true" aria-labelledby="${id}-h"><div class="card card-lg stack"><h2 class="t-h2" id="${id}-h">${title}</h2>${body}</div></div>`;
const busy = (btn, on, text) => { if (!btn) return; if (on) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.textContent = text || "Please wait…"; } else { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; } };

// ---------- Shell ----------
function fillShell() {
  const p = ME.profile, f = bestField(), r = ME.ratings[f];
  $$('[data-me="initials"]').forEach(el => { el.textContent = initials(p.full_name || ME.user.email); });
  $$('[data-me="score"]').forEach(el => { el.textContent = r ? r.score : "—"; });
  $$('[data-me="tier"]').forEach(el => { el.textContent = r ? `${tierName(r.score)} · ${FIELDS[f]}` : "Unranked"; });
}
async function fillNext() {
  const box = $('[data-me="next"]'); if (!box) return;
  try {
    const [ts, regs, ents] = await Promise.all([loadTournaments(), myRegs(), myEntries()]);
    const open = ts.filter(t => t.status !== "ended" && !ents[t.id] && t.ranked);
    const t = open.find(x => regs[x.id]) || open.find(x => x.cat === (ME.profile.field || "marketing") && x.status === "live") || open[0];
    if (!t) return;
    $('[data-me="next-name"]').textContent = t.name;
    $('[data-me="next-when"]').textContent = whenText(t);
    $('[data-me="next-link"]').setAttribute("href", `tournament.html?t=${encodeURIComponent(t.id)}`);
    box.classList.remove("hide");
  } catch (e) { /* sidebar is optional */ }
}
function wireGlobal() {
  document.addEventListener("click", async e => {
    const out = e.target.closest("[data-logout]");
    if (out) { e.preventDefault(); try { await sb.auth.signOut(); } catch (err) {} try { Object.keys(sessionStorage).filter(k => k.startsWith("rc-ans-")).forEach(k => sessionStorage.removeItem(k)); } catch (err) {} location.href = "index.html"; }
  });
}
function publicHeaderSignedIn() {
  $$('.header a[href="login.html"], .drawer a[href="login.html"]').forEach(a => { a.setAttribute("href", "dashboard.html"); a.textContent = "Dashboard"; });
  $$('.header a[href="signup.html"]').forEach(a => a.classList.add("hide"));
}

// ---------- Auth pages ----------
async function startOAuth(provider, btn) {
  const terms = $("#a-terms"); if (terms && !terms.checked) { toast("Please confirm you're 18+ and accept the Terms and Privacy policy"); terms.focus(); return; }
  busy(btn, true, `Opening ${provider === "github" ? "GitHub" : "Google"}…`);
  const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: location.origin + "/auth-callback.html" } });
  if (error) { busy(btn, false); toast(/not enabled|unsupported provider/i.test(error.message) ? `${provider === "github" ? "GitHub" : "Google"} sign-in isn't switched on yet — use your email for now.` : friendly(error)); }
}
const pwProblem = (pw, email) => {
  if (pw.length < 8) return "Use at least 8 characters.";
  if (pw.length > 72) return "Use 72 characters or fewer.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Use at least one letter and one number.";
  if (email && pw.toLowerCase() === email.toLowerCase()) return "Don't use your email as your password.";
  return null;
};
// Messages the login page may show from ?error=. Anything else in the URL is ignored (no text injection).
const AUTH_ERRORS = {
  link: "That sign-in link has expired or was opened in a different browser. Request a new one, and open it in the same browser you requested it from.",
  failed: "Sign-in didn't complete. Please try again.",
};
const authMsg = (html, tone = "red") => { const m = $("#auth-msg"); if (m) m.innerHTML = html ? `<div class="banner ${tone}">${html}</div>` : ""; };
// Supabase's reply when a code is requested for an email with no account — treated as "sent" so the page
// never reveals who has an account.
const NO_ACCOUNT = /signups not allowed|user not found/i;

// Cloudflare Turnstile (free). Off until CFG.turnstileSiteKey is set; then Supabase's CAPTCHA check can be switched on.
let cfWidget = null, cfWait = null, cfLoad = null;
const captcha = async () => {
  if (!CFG.turnstileSiteKey) return undefined;
  try {
    if (!window.turnstile) await (cfLoad = cfLoad || new Promise((ok, no) => { const s = document.createElement("script"); s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; s.async = true; s.onload = ok; s.onerror = no; document.head.appendChild(s); }));
    let box = document.getElementById("cf-box");
    if (!box) { box = document.createElement("div"); box.id = "cf-box"; box.className = "mt2"; const m = $("#auth-msg") || main(); m.insertAdjacentElement("afterend", box); }
    // Never leave a button spinning: give up after 20 s and let Supabase say what's wrong.
    const token = new Promise(ok => { cfWait = ok; setTimeout(() => ok(undefined), 20000); });
    if (cfWidget === null) cfWidget = window.turnstile.render(box, { sitekey: CFG.turnstileSiteKey, appearance: "interaction-only", execution: "execute", callback: t => cfWait && cfWait(t), "error-callback": () => { if (cfWait) cfWait(undefined); } });
    else window.turnstile.reset(cfWidget);
    window.turnstile.execute(cfWidget);
    return await token;
  } catch (e) { cfLoad = null; return undefined; }
};
function authPage(mode) {
  const next = safeNext(params().get("next"));
  try { if (next) localStorage.setItem("rc-next", next); else localStorage.removeItem("rc-next"); } catch (e) {}
  const err = params().get("error"); if (err) authMsg(AUTH_ERRORS[err] || AUTH_ERRORS.failed);
  $$("[data-oauth]").forEach(b => b.addEventListener("click", () => startOAuth(b.dataset.oauth, b)));
  const pwForm = $("#pw-form"), otpForm = $("#otp-form"), codeForm = $("#code-form");
  let email = "", codeType = "email";
  const showCode = (to, type) => { email = to; codeType = type; $("#sent-to").textContent = to; [pwForm, otpForm].forEach(f => f && f.classList.add("hide")); codeForm.classList.remove("hide"); $("#a-code").focus(); cooldown($("#a-resend")); };
  const back = () => { codeForm.classList.add("hide"); (pwForm || otpForm).classList.remove("hide"); if (otpForm) otpForm.classList.add("hide"); authMsg(""); };
  const sendLink = async (to, btn) => {
    busy(btn, true, "Sending…");
    const { error } = await sb.auth.signInWithOtp({ email: to, options: { shouldCreateUser: false, emailRedirectTo: location.origin + "/auth-callback.html", captchaToken: await captcha() } });
    busy(btn, false);
    if (error && !NO_ACCOUNT.test(error.message)) return authMsg(esc(friendly(error)));
    authMsg(""); showCode(to, "email");
  };

  pwForm.addEventListener("submit", async e => {
    e.preventDefault();
    const emailIn = $("#a-email"), passIn = $("#a-pass"), nameIn = $("#a-name"), terms = $("#a-terms");
    const to = emailIn.value.trim().toLowerCase(), pw = passIn.value;
    let ok = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to); emailIn.classList.toggle("error", !ok);
    if (nameIn) { const good = nameIn.value.trim().length >= 2; nameIn.classList.toggle("error", !good); ok = ok && good; }
    const weak = mode === "signup" ? pwProblem(pw, to) : (pw ? null : "Enter your password.");
    passIn.classList.toggle("error", !!weak); if (weak) { ok = false; authMsg(esc(weak)); }
    if (terms && !terms.checked) { ok = false; toast("Please confirm you're 18+ and accept the Terms and Privacy policy"); }
    if (!ok) { if (!weak) authMsg(""); return; }
    const btn = $("button[type=submit]", pwForm); busy(btn, true, mode === "signup" ? "Creating your account…" : "Logging in…");
    if (mode === "signup") {
      const { data, error } = await sb.auth.signUp({ email: to, password: pw, options: { captchaToken: await captcha(), emailRedirectTo: location.origin + "/auth-callback.html", data: { full_name: nameIn.value.trim().slice(0, 80) } } });
      busy(btn, false);
      if (error) return authMsg(esc(friendly(error)));
      if (data.session) return afterSignIn();
      authMsg(""); return showCode(to, "email");
    }
    const { error } = await sb.auth.signInWithPassword({ email: to, password: pw, options: { captchaToken: await captcha() } });
    if (error) {
      busy(btn, false);
      if (/not confirmed/i.test(error.message)) { await sb.auth.resend({ type: "signup", email: to, options: { captchaToken: await captcha(), emailRedirectTo: location.origin + "/auth-callback.html" } }); authMsg("Please confirm your email first — we've sent the confirmation again.", "amber"); return showCode(to, "email"); }
      return authMsg(esc(friendly(error)) + (/wrong email or password/i.test(friendly(error)) ? ` <a class="link" href="forgot-password.html">Reset your password</a>` : ""));
    }
    location.replace("auth-callback.html");
  });

  if (otpForm) {
    $("#a-link-mode").addEventListener("click", () => { pwForm.classList.add("hide"); otpForm.classList.remove("hide"); const v = $("#a-email").value.trim(); if (v) $("#a-email2").value = v; $("#a-email2").focus(); authMsg(""); });
    $("#a-pw-mode").addEventListener("click", () => { otpForm.classList.add("hide"); pwForm.classList.remove("hide"); authMsg(""); });
    otpForm.addEventListener("submit", e => {
      e.preventDefault(); const to = $("#a-email2").value.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) { $("#a-email2").classList.add("error"); return; }
      sendLink(to, $("button[type=submit]", otpForm));
    });
  }
  codeForm.addEventListener("submit", async e => {
    e.preventDefault();
    const code = $("#a-code").value.replace(/\D/g, "");
    if (code.length < 6) { $("#a-code").classList.add("error"); return; }
    const btn = $("button[type=submit]", codeForm); busy(btn, true, "Checking…");
    const { error } = await sb.auth.verifyOtp({ email, token: code, type: codeType });
    if (error) { busy(btn, false); return authMsg(esc(friendly(error))); }
    location.replace("auth-callback.html");
  });
  $("#a-resend").addEventListener("click", async () => {
    const b = $("#a-resend"); busy(b, true, "Sending…");
    const { error } = mode === "signup"
      ? await sb.auth.resend({ type: "signup", email, options: { captchaToken: await captcha(), emailRedirectTo: location.origin + "/auth-callback.html" } })
      : await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: location.origin + "/auth-callback.html", captchaToken: await captcha() } });
    const shown = error && !NO_ACCOUNT.test(error.message) ? error : null;
    busy(b, false); toast(shown ? friendly(shown) : "Sent again — check your inbox"); if (!shown) cooldown(b);
  });
  $("#a-code").addEventListener("input", e => { const d = e.target.value.replace(/\D/g, ""); if (d.length === 8) codeForm.requestSubmit(); });
  $("#a-back").addEventListener("click", back);
}

async function afterSignIn() {
  const { data } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (data && data.nextLevel === "aal2" && data.currentLevel !== "aal2") return go("mfa.html");
  const { data: { user } } = await sb.auth.getUser();
  const p = await q(sb.from("profiles").select("onboarded").eq("id", user.id).single());
  let next = null; try { next = safeNext(localStorage.getItem("rc-next")); localStorage.removeItem("rc-next"); } catch (e) {}
  return go(p.onboarded ? next || "dashboard.html" : "onboarding-1.html");
}

const H = {}; // page handlers

// Is SMS sign-in switched on in Supabase? (Auth → Providers → Phone.) Phone options only show when it is.
let phoneOn = null;
const phoneEnabled = async () => {
  if (phoneOn !== null) return phoneOn;
  try { const r = await fetch(CFG.url + "/auth/v1/settings", { headers: { apikey: CFG.key } }); phoneOn = !!(r.ok && (await r.json()).external.phone); } catch (e) { phoneOn = false; }
  return phoneOn;
};
const toE164 = v => { const d = String(v || "").replace(/\D/g, "").replace(/^0+/, "").replace(/^91(?=\d{10}$)/, ""); return /^[6-9]\d{9}$/.test(d) ? "+91" + d : null; };
// Resend buttons wait 60 s between sends (Supabase allows one email per minute per address).
const cooldown = (btn, secs = 60) => { const label = btn.textContent; btn.disabled = true; let t = secs; const tick = () => { if (--t <= 0) { btn.disabled = false; btn.textContent = label; } else { btn.textContent = `Resend in ${t}s`; setTimeout(tick, 1000); } }; btn.textContent = `Resend in ${t}s`; setTimeout(tick, 1000); };

H["forgot-password.html"] = async () => {
  const form = $("#reset-form"), codeForm = $("#rp-code-form");
  let via = "email", target = "";
  if (await phoneEnabled()) $("#rp-via").classList.remove("hide");
  $$("#rp-via [data-via]").forEach(t => t.addEventListener("click", () => {
    via = t.dataset.via;
    $$("#rp-via [data-via]").forEach(x => { x.classList.toggle("on", x === t); x.setAttribute("aria-selected", String(x === t)); });
    $("#rp-email-f").classList.toggle("hide", via !== "email"); $("#rp-phone-f").classList.toggle("hide", via !== "phone"); authMsg("");
  }));
  const send = async btn => {
    busy(btn, true, "Sending…");
    const { error } = via === "email"
      ? await sb.auth.resetPasswordForEmail(target, { redirectTo: location.origin + "/reset-password.html", captchaToken: await captcha() })
      : await sb.auth.signInWithOtp({ phone: target, options: { shouldCreateUser: false, captchaToken: await captcha() } });
    busy(btn, false);
    // Don't reveal whether an account exists; only surface rate limits.
    if (error && /rate limit|too many|seconds/i.test(error.message)) { authMsg(esc(friendly(error))); return false; }
    return true;
  };
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (via === "email") {
      target = $("#a-email").value.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(target)) { $("#a-email").classList.add("error"); return; }
    } else {
      target = toE164($("#a-phone").value);
      if (!target) { $("#a-phone").classList.add("error"); return authMsg("Enter a 10-digit Indian mobile number."); }
    }
    if (!(await send($("button[type=submit]", form)))) return;
    authMsg(""); $("#sent-to").textContent = via === "email" ? target : target.replace(/^\+91/, "+91 ");
    form.classList.add("hide"); $("#rp-via").classList.add("hide"); codeForm.classList.remove("hide"); $("#rp-code").focus(); cooldown($("#rp-resend"));
  });
  $("#rp-resend").addEventListener("click", async () => { const b = $("#rp-resend"); if (await send(b)) { toast("Sent again"); cooldown(b); } });
  $("#rp-back").addEventListener("click", () => { codeForm.classList.add("hide"); form.classList.remove("hide"); if (phoneOn) $("#rp-via").classList.remove("hide"); authMsg(""); });
  codeForm.addEventListener("submit", async e => {
    e.preventDefault();
    const code = $("#rp-code").value.replace(/\D/g, ""), pw = $("#np-pass").value;
    if (code.length < 6) { $("#rp-code").classList.add("error"); return authMsg("Enter the code we sent you."); }
    const weak = pwProblem(pw, via === "email" ? target : "");
    if (weak) { $("#np-pass").classList.add("error"); return authMsg(esc(weak)); }
    if (pw !== $("#np-pass2").value) { $("#np-pass2").classList.add("error"); return authMsg("The two passwords don't match."); }
    const btn = $("button[type=submit]", codeForm); busy(btn, true, "Checking…");
    const { error } = via === "email"
      ? await sb.auth.verifyOtp({ email: target, token: code, type: "recovery" })
      : await sb.auth.verifyOtp({ phone: target, token: code, type: "sms" });
    if (error) { busy(btn, false); return authMsg(esc(friendly(error))); }
    const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") { try { localStorage.setItem("rc-next", "reset-password.html"); } catch (err) {} return go("mfa.html"); }
    const up = await sb.auth.updateUser({ password: pw });
    if (up.error) { busy(btn, false); return authMsg(esc(friendly(up.error))); }
    toast("Password reset — you're logged in"); afterSignIn();
  });
};

H["reset-password.html"] = async () => {
  const p = params(), hp = new URLSearchParams(location.hash.slice(1));
  const linkErr = p.get("error_description") || hp.get("error_description");
  const { data: { session } } = await sb.auth.getSession();
  if (linkErr || !session) {
    $("#np-for").textContent = "";
    return authMsg(`${esc(linkErr || "This reset link has expired or was opened in a different browser.")} <a class="link" href="forgot-password.html">Send a new link</a>`);
  }
  const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") { try { localStorage.setItem("rc-next", "reset-password.html"); } catch (e) {} return go("mfa.html"); }
  $("#np-for").textContent = `For ${session.user.email}`;
  const form = $("#np-form"); form.classList.remove("hide"); $("#np-pass").focus();
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const pw = $("#np-pass").value, weak = pwProblem(pw, session.user.email);
    if (weak) { $("#np-pass").classList.add("error"); return authMsg(esc(weak)); }
    if (pw !== $("#np-pass2").value) { $("#np-pass2").classList.add("error"); return authMsg("The two passwords don't match."); }
    const btn = $("button[type=submit]", form); busy(btn, true, "Saving…");
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) { busy(btn, false); return authMsg(esc(friendly(error))); }
    toast("Password saved"); afterSignIn();
  });
};


H["auth-callback.html"] = async () => {
  const p = params(), hp = new URLSearchParams(location.hash.slice(1));
  const err = p.get("error_description") || hp.get("error_description");
  if (err) return go("login.html?error=" + (/expired|invalid/i.test(err) ? "link" : "failed"));
  const { data: { session }, error } = await sb.auth.getSession();
  if (error || !session) return go("login.html?error=" + (error ? "failed" : "link"));
  return afterSignIn();
};

H["mfa.html"] = async () => {
  const { data: lvl } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (lvl && lvl.currentLevel === "aal2") return afterSignIn();
  const { data: f } = await sb.auth.mfa.listFactors();
  const factor = f && f.totp && f.totp.find(x => x.status === "verified");
  if (!factor) return go("dashboard.html");
  render(`<div style="max-width:460px;margin:0 auto" class="stack-lg">
    <div class="stack"><div class="label muted">Two-step verification</div><h1 class="t-h1">Enter your code</h1><p class="muted">Open your authenticator app and enter the 6-digit code for Rank Culture.</p></div>
    <div id="mfa-msg"></div>
    <form class="stack" id="mfa-form" novalidate><div class="field"><label for="mfa-code">6-digit code</label><input class="input mono" id="mfa-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></div>
    <button class="btn btn-primary btn-lg btn-block" type="submit">Verify ${ic("arrow")}</button></form>
    <button class="btn btn-ghost" data-logout>Use a different account</button></div>`, main().firstElementChild);
  $("#mfa-code").focus();
  $("#mfa-form").addEventListener("submit", async e => {
    e.preventDefault();
    const btn = $("#mfa-form button"); busy(btn, true, "Checking…");
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: factor.id, code: $("#mfa-code").value.trim() });
    if (error) { busy(btn, false); $("#mfa-msg").innerHTML = `<div class="banner red">${esc(friendly(error))}</div>`; return; }
    afterSignIn();
  });
};

// ---------- Onboarding ----------
H["onboarding-1.html"] = async () => {
  const p = ME.profile;
  $("#ob-city").value = p.city || ""; if (p.stage) $("#ob-stage").value = p.stage;
  sb.rpc("path_state").then(({ data }) => { if (data && data.months) $("#ob-months").value = String(data.months); });
  const opts = $$('[data-options] .option');
  if (p.field) { const i = FIELD_ORDER.indexOf(p.field); if (opts[i]) opts[i].click(); }
  $("#ob1-next").addEventListener("click", async e => {
    e.preventDefault();
    const i = opts.findIndex(o => o.classList.contains("selected")); if (i < 0) return toast("Pick your main field");
    const city = $("#ob-city").value.trim(); if (!city) { $("#ob-city").classList.add("error"); return toast("Enter your city"); }
    try {
      await q(sb.from("profiles").update({ field: FIELD_ORDER[i], city: city.slice(0, 60), stage: $("#ob-stage").value }).eq("id", ME.user.id));
      await q(sb.rpc("set_path", { p_field: FIELD_ORDER[i], p_months: Number($("#ob-months").value) }));
      location.href = "onboarding-2.html";
    }
    catch (err) { toast(friendly(err)); }
  });
};
H["onboarding-2.html"] = async () => {
  const opts = $$('[data-options] .option');
  opts.forEach(o => { if ((ME.profile.skills || []).includes(o.textContent.trim())) o.click(); });
  $("#ob2-next").addEventListener("click", async e => {
    e.preventDefault();
    const skills = opts.filter(o => o.classList.contains("selected")).map(o => o.textContent.trim());
    try { await q(sb.from("profiles").update({ skills }).eq("id", ME.user.id)); location.href = "onboarding-3.html"; }
    catch (err) { toast(friendly(err)); }
  });
};
H["onboarding-3.html"] = async () => {
  const grid = $("[data-options]"), field = ME.profile.field || "marketing";
  const ts = (await loadTournaments()).filter(t => t.status !== "ended");
  const list = [...ts.filter(t => t.cat === field && t.ranked), ...ts.filter(t => !t.ranked), ...ts.filter(t => t.cat !== field && t.ranked)].slice(0, 4);
  grid.innerHTML = list.map((t, i) => `<button class="option" aria-pressed="false" data-t="${esc(t.id)}"><div class="row between"><span class="t-h3">${esc(t.name)}</span>${i === 0 ? '<span class="badge blue">Recommended</span>' : ""}</div><div class="row t-sm muted mt1"><span>${ic("clock")} ${whenText(t)}</span><span class="mono">${t.duration_min} min</span></div><p class="t-sm mt1">${t.ranked ? esc(t.tasks) : "Warm-up. Doesn't affect rank."}</p></button>`).join("");
  window.RCbind(grid.parentElement);
  const finish = async (tid) => {
    try {
      if (tid) { const { error } = await sb.from("registrations").insert({ user_id: ME.user.id, tournament_id: tid }); if (error && error.code !== "23505") throw error; }
      await q(sb.from("profiles").update({ onboarded: true }).eq("id", ME.user.id));
      location.href = tid ? `dashboard.html?welcome=${encodeURIComponent(tid)}` : "dashboard.html";
    } catch (err) { toast(friendly(err)); }
  };
  $("#ob3-next").addEventListener("click", e => { e.preventDefault(); const s = $(".option.selected", grid); if (!s) return toast("Pick a tournament, or skip"); finish(s.dataset.t); });
  $("#ob3-skip").addEventListener("click", e => { e.preventDefault(); finish(null); });
};

// ---------- Dashboard ----------
H["dashboard.html"] = async () => {
  const [ts, regs, ents, apps] = await Promise.all([loadTournaments(), myRegs(), myEntries(),
    q(sb.from("applications").select("id, status, fast_track, created_at, jobs(role, company)").order("created_at", { ascending: false }).limit(3))]);
  const p = ME.profile, fields = [...new Set([...Object.keys(ME.ratings), p.field || "marketing"])];
  const sel = params().get("f") && fields.includes(params().get("f")) ? params().get("f") : bestField();
  const ranks = {}; await Promise.all(fields.filter(f => ME.ratings[f]).map(async f => { const r = await q(sb.rpc("my_rank", { p_field: f })); ranks[f] = r[0]; }));
  const hr = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()));
  const greet = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
  const welcomeT = ts.find(t => t.id === params().get("welcome"));

  const block = f => {
    const r = ME.ratings[f], hidden = f !== sel;
    if (!r) {
      const t = ts.find(x => x.cat === f && x.status !== "ended" && x.ranked);
      return `<div data-role="${f}" class="${hidden ? "hide" : ""}"><div class="empty"><div class="icon">${ic("target")}</div><h2 class="t-h2">Not ranked in ${esc(FIELDS[f])} yet</h2><p class="muted t-sm" style="max-width:44ch">${t ? `Enter one tournament to get your starting rank. Next up: ${esc(t.name)} — ${whenText(t)}.` : "No tournament in this field right now. Warm up with the practice sprint."}</p><a class="btn btn-primary" href="tournament.html?t=${esc(t ? t.id : "practice")}">${t ? `Go to ${esc(t.name)}` : "Start practice"}</a></div></div>`;
    }
    const hist = r.history && r.history.length ? r.history : [r.score], lo = Math.min(...hist), hi = Math.max(...hist);
    const last = ts.map(t => ents[t.id] && t.cat === f ? Object.assign({ t }, ents[t.id]) : null).filter(Boolean).sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))[0];
    const tasks = last ? last.task_scores.filter(x => x.max) : [];
    const weak = tasks.filter(x => x.points < x.max).sort((a, b) => a.points / a.max - b.points / b.max)[0];
    const rk = ranks[f], top = rk ? Math.max(1, Math.round((rk.place / rk.total) * 100)) : null, nt = nextTier(r.score);
    return `<div data-role="${f}" class="${hidden ? "hide" : ""} stack-lg"><div class="grid g3">
    <div class="card card-lg span2"><div class="card-head"><div><div class="label muted">Your rank · ${esc(FIELDS[f])}</div><div class="row mt1">${tierBadge(r.score)}${rk ? `<span class="label blue">#${n(rk.place)} of ${n(rk.total)} · Top ${top}%</span>` : ""}</div></div><a class="link" href="profile.html">My profile →</a></div>
      <div class="row between" style="align-items:flex-end"><div class="score"><span class="num">${r.score}</span><span class="of">/1000</span></div>
      <div style="display:flex;gap:4px;align-items:flex-end;height:80px" aria-label="Score after each tournament">${hist.map((v, i) => `<div style="width:12px;height:${Math.max(8, Math.round(((v - lo + 20) / (hi - lo + 20)) * 80))}px;background:${i === hist.length - 1 ? "var(--blue)" : "var(--ink)"}"></div>`).join("")}</div></div>
      <div class="row t-sm mt2"><span>${r.entries} tournament${r.entries === 1 ? "" : "s"} played${nt <= 1000 ? ` · <strong>${nt - r.score}</strong> points to ${tierName(nt)}` : " · Top tier"}</span></div></div>
    <div class="card card-lg dark stack"><div class="label" style="color:#9DB1FF">${weak ? "Where you lost most points" : "Next step"}</div><div class="t-h2">${esc(weak ? weak.label.replace(/^.*·\s*/, "") : "Play another round")}</div>
      <p class="muted t-sm">${weak ? `You scored ${weak.points}/${weak.max} here in ${esc(last.t.name)}.` : "Each tournament moves your rank toward your real level."}</p><a class="btn btn-primary btn-block" href="drills.html">Warm up with a drill</a></div></div>
    <div class="grid g2"><div class="card card-lg"><div class="card-head"><h2 class="t-h3">Last result</h2>${last ? `<a class="link" href="results.html?t=${esc(last.t.id)}">Details →</a>` : ""}</div>
      ${last ? `<div class="stack">${last.task_scores.map(x => `<div><div class="row between t-sm"><span>${esc(x.label)}</span><span class="mono">${x.max ? `${x.points}/${x.max}` : "Not scored"}</span></div>${x.max ? bar(Math.round(x.points / x.max * 100), x.points / x.max > .85 ? "blue" : "") : ""}</div>`).join("")}</div>` : '<p class="t-sm muted">No tournaments in this field yet.</p>'}</div>
    <div class="card card-lg"><div class="card-head"><h2 class="t-h3">Fast-track tracker</h2><a class="link" href="applications.html">All →</a></div>
      ${apps.length ? `<div class="list t-sm">${apps.map(a => `<div><span><strong>${esc(a.jobs.company)}</strong><br><span class="muted">${esc(a.jobs.role)}</span></span>${appBadge(a)}</div>`).join("")}</div>` : `<p class="t-sm muted">No applications yet. <a class="link" href="jobs.html">See jobs you qualify for →</a></p>`}</div></div></div>`;
  };
  const upcoming = ts.filter(t => t.status !== "ended" && !ents[t.id]).sort((a, b) => (b.cat === p.field) - (a.cat === p.field) || (a.status === "live" ? -1 : 1)).slice(0, 3);
  render(`${welcomeT ? `<div class="banner blue mb3"><span><strong>You're in, ${esc(firstName(p.full_name))}.</strong> You're registered for ${esc(welcomeT.name)} — ${whenText(welcomeT)}.</span><button class="btn btn-sm" data-dismiss>Got it</button></div>` : ""}
  ${pageHead(`${greet}, ${esc(firstName(p.full_name))}`, "Dashboard", "", `<label class="sr" for="role-sw">Field</label><select class="input" id="role-sw" data-role-switch style="width:auto;min-height:44px">${fields.map(f => `<option value="${f}"${f === sel ? " selected" : ""}>${esc(FIELDS[f])}${ME.ratings[f] ? "" : " (unranked)"}</option>`).join("")}</select><a class="btn" href="battles.html">${ic("swords")} Battle</a><a class="btn btn-primary" href="arena.html">${ic("trophy")} Compete</a>`)}
  ${fields.map(block).join("")}
  <div class="mt4"><div class="sec-head" style="margin-bottom:var(--s5)"><h2 class="t-h2">Up next for you</h2><a class="link" href="arena.html">All tournaments →</a></div>
  <div class="grid g3">${upcoming.map(t => tCard(t, regs[t.id], ents[t.id])).join("") || '<p class="muted">Nothing open right now.</p>'}</div></div>`);
};
const appBadge = a => a.status === "interview" ? '<span class="badge green">Interview</span>' : a.status === "review" ? '<span class="badge amber">In review</span>' : a.status === "offer" ? '<span class="badge blue">Offer</span>' : a.status === "closed" ? '<span class="badge">Closed</span>' : a.fast_track ? '<span class="badge blue">Fast-track</span>' : '<span class="badge">Applied</span>';

// ---------- Tournaments ----------
H["arena.html"] = async () => {
  const [ts, regs, ents] = await Promise.all([loadTournaments(), myRegs(), myEntries()]);
  const mine = ts.filter(t => regs[t.id] || ents[t.id]);
  const cats = [...new Set(ts.map(t => t.cat))];
  render(`${pageHead("Compete", "Tournaments", "Free to enter. Real work. Top finishers win interview fast-tracks.", `<a class="btn" href="results.html">My latest result</a>`)}
  <div class="tabs mb3" data-tabs role="tablist"><button class="on" data-tab="t-all" role="tab" aria-selected="true">All</button><button data-tab="t-mine" role="tab" aria-selected="false">Mine (${mine.length})</button></div>
  <div id="t-all"><div class="row mb3" data-filter-group="#a-grid" role="group" aria-label="Filter"><button class="chip on" data-value="all" aria-pressed="true">All</button><button class="chip" data-value="live" aria-pressed="false">Live now</button>${cats.map(c => `<button class="chip" data-value="${esc(c)}" aria-pressed="false">${esc(FIELDS[c] || c)}</button>`).join("")}</div>
  <div class="grid g3" id="a-grid">${ts.map(t => tCard(t, regs[t.id], ents[t.id])).join("")}<div class="empty hide span2" data-empty><div class="icon">${ic("trophy")}</div><h3 class="t-h3">Nothing here this week</h3><p class="muted t-sm">Try another field.</p></div></div></div>
  <div id="t-mine" class="hide grid g3">${mine.map(t => tCard(t, regs[t.id], ents[t.id])).join("") || '<p class="muted">You haven\'t registered for anything yet.</p>'}</div>`);
};
const publicCards = async (sel, limit, signedIn) => {
  const grid = $(sel); if (!grid) return;
  const ts = (await loadTournaments()).filter(t => t.ranked).sort((a, b) => ({ live: 0, upcoming: 1, ended: 2 }[a.status] - { live: 0, upcoming: 1, ended: 2 }[b.status]));
  const empty = $("[data-empty]", grid);
  grid.innerHTML = ts.slice(0, limit).map(t => tCard(t, null, null, !signedIn)).join("");
  if (empty) grid.appendChild(empty);
  if (signedIn) $$("a.btn", grid).forEach(a => { a.setAttribute("href", "arena.html"); a.textContent = "Open in app"; });
  const live = ts.filter(t => t.status === "live").length, b = $("[data-live-count]");
  if (b) b.textContent = live ? `${live} tournament${live === 1 ? "" : "s"} live now` : "New tournaments every week";
};
H["tournaments.html"] = signedIn => publicCards("#t-grid", 50, signedIn);
const siteStats = async () => {
  if (!$("[data-stat]")) return;
  try { const st = await q(sb.rpc("site_stats")); $$("[data-stat]").forEach(el => { el.textContent = n(st[el.dataset.stat]); }); } catch (e) { /* keep dashes */ }
};
H["index.html"] = signedIn => Promise.all([publicCards("#home-t", 3, signedIn), BX.homeBoard && BX.homeBoard(), siteStats()]);

H["tournament.html"] = async () => {
  const id = params().get("t") || "growth";
  const [t] = await q(sb.from("tournaments").select("*").eq("id", id));
  if (!t) return render(errorState(new Error("Tournament not found."), false));
  t.status = status(t);
  const [counts, qs, regRows, entRows] = await Promise.all([q(sb.rpc("tournament_counts")), q(sb.rpc("tournament_tasks", { p_tournament: id })),
    q(sb.from("registrations").select("*").eq("tournament_id", id)), q(sb.from("entries").select("id").eq("tournament_id", id))]);
  const players = Number((counts.find(c => c.tournament_id === id) || {}).players || 0), reg = regRows[0], entry = entRows[0];
  const r = ME.ratings[t.cat], tasks = qs.length ? qs.map(x => [x.label, x.kind === "mcq" ? `${x.points} pts` : "Written · not scored"]) : (t.tasks || "").split(" · ").map(x => [x, ""]);
  let action;
  if (entry) action = `<a class="btn btn-primary btn-lg btn-block" href="results.html?t=${esc(id)}">See my result</a>`;
  else if (t.status === "live") action = `<button class="btn btn-primary btn-lg btn-block" data-modal="start-modal">${reg && reg.started_at ? "Resume attempt" : "Start now"}</button>`;
  else if (t.status === "upcoming") action = reg ? `<button class="btn btn-dark btn-lg btn-block" id="unreg">Registered ✓ · Unregister</button>` : `<button class="btn btn-primary btn-lg btn-block" id="reg">Register free</button>`;
  else action = `<button class="btn btn-lg btn-block" disabled>This tournament has ended</button>`;
  render(`<a class="link" href="arena.html">${ic("back")} All tournaments</a>
  <div class="grid mt3 rc-split"><div class="stack-lg">
    <div class="card card-lg stack"><div class="row"><span class="badge">${esc(FIELDS[t.cat] || t.cat)}</span>${t.ranked ? statusBadge(t) : '<span class="badge blue">Practice · unranked</span>'}</div>
      <h1 class="t-h1">${esc(t.name)}</h1><p class="lead">${esc(t.blurb)}</p>
      <div class="grid g4 mt2">${[["Opens", fmtDay(t.opens_at), ""], ["Duration", `${t.duration_min} min`, `${tasks.length} tasks`], ["Registered", n(players), `of ${n(t.cap)}`], ["Entry", "Free", "One attempt"]].map(([l, v, s]) => `<div><div class="label muted">${l}</div><div class="mono t-h3 mt1">${esc(v)}</div><div class="t-xs muted">${esc(s)}</div></div>`).join("")}</div></div>
    <div class="card card-lg"><h2 class="t-h3 mb2">The tasks</h2><div class="list">${tasks.map(([h, m], i) => `<div><span class="mono t-h2 blue" style="width:48px">${String(i + 1).padStart(2, "0")}</span><div style="flex:1" class="row between"><strong class="t-body">${esc(h)}</strong><span class="mono t-xs muted">${esc(m)}</span></div></div>`).join("")}</div>${qs.length ? "" : '<p class="t-xs muted mt2">Full task briefs unlock when the tournament opens.</p>'}</div>
    <div class="card card-lg"><h2 class="t-h3 mb2">Prizes</h2><div class="grid g3"><div class="card dark"><div class="label" style="color:#9DB1FF">Top finishers</div><p class="t-sm mt1">${esc(t.prize)}</p></div><div class="card blue"><div class="label">Above the bar</div><p class="t-sm mt1">Fast-track applications to partner jobs that hire from this tournament</p></div><div class="card"><div class="label">Everyone</div><p class="t-sm mt1 muted">Verified score, task breakdown, rank points</p></div></div></div>
    <div class="card card-lg"><h2 class="t-h3 mb2">Rules</h2><ul class="stack t-sm" style="padding-left:20px"><li>One attempt. The timer runs on our server from the moment you start — closing the tab doesn't pause it.</li><li>Tab switches are recorded with your entry.</li><li>No AI tools unless a task says so.</li><li>Multiple-choice tasks score instantly. Written answers are saved with your entry but don't count toward your score during the pilot.</li></ul></div>
  </div>
  <aside class="card card-lg stack rc-sticky"><div class="label muted">${t.status === "live" ? "Closes" : t.status === "upcoming" ? "Opens" : "Closed"}</div>
    <div class="t-h3">${fmt(t.status === "upcoming" ? t.opens_at : t.closes_at)}</div>
    <div>${bar(Math.min(100, Math.round(players / t.cap * 100)), "blue")}<div class="t-xs muted mt1">${n(Math.max(0, t.cap - players))} spots left</div></div>
    ${action}
    <div class="list t-sm"><div><span class="muted">Your ${esc(FIELDS[t.cat] || "")} rank</span><span class="mono">${r ? r.score : "Unranked"}</span></div><div><span class="muted">Counts toward rank</span><span class="mono">${t.ranked ? "Yes" : "No"}</span></div></div>
    <a class="link t-sm" href="drills.html">Warm up with a drill →</a></aside></div>
  ${modal("start-modal", "Ready to start?", `<p class="muted">You get <strong>${t.duration_min} minutes</strong>${t.status === "live" ? `, ending no later than ${fmt(t.closes_at)}` : ""}. The timer starts now and keeps running if you leave. One attempt only.</p><div class="row"><button class="btn" data-close-modal>Not yet</button><a class="btn btn-primary" href="live.html?t=${esc(id)}">Start the timer</a></div>`)}`);
  const regBtn = $("#reg"), unBtn = $("#unreg");
  if (regBtn) regBtn.addEventListener("click", async () => { busy(regBtn, true); const { error } = await sb.from("registrations").insert({ user_id: ME.user.id, tournament_id: id }); if (error && error.code !== "23505") { busy(regBtn, false); return toast(friendly(error)); } toast("Registered"); H["tournament.html"](); });
  if (unBtn) unBtn.addEventListener("click", async () => { busy(unBtn, true); try { await q(sb.from("registrations").delete().eq("tournament_id", id).eq("user_id", ME.user.id)); toast("Unregistered"); H["tournament.html"](); } catch (e) { busy(unBtn, false); toast(friendly(e)); } });
};

// ---------- Live arena ----------
H["live.html"] = async () => {
  const id = params().get("t"); if (!id) return go("arena.html");
  let deadline;
  try { deadline = new Date(await q(sb.rpc("start_entry", { p_tournament: id }))); }
  catch (e) { if (/already submitted/.test(e.message)) return go(`results.html?t=${encodeURIComponent(id)}`); return render(errorState(e, false) + `<div class="center mt3"><a class="btn" href="tournament.html?t=${encodeURIComponent(id)}">Back to tournament</a></div>`, main().firstElementChild); }
  const [[t], qs] = await Promise.all([q(sb.from("tournaments").select("name").eq("id", id)), q(sb.from("questions").select("*").eq("tournament_id", id).order("position"))]);
  const KEY = `rc-ans-${ME.user.id}-${id}`;
  let saved = {}; try { saved = JSON.parse(sessionStorage.getItem(KEY) || "{}"); } catch (e) {}
  const ans = saved.a || {}; let switches = saved.s || 0, cur = 0, sent = false;
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify({ a: ans, s: switches })); } catch (e) {} };
  const table = d => d && d.head ? `<div class="table-wrap"><table><thead><tr>${d.head.map((h, i) => `<th${i ? ' style="text-align:right"' : ""}>${esc(h)}</th>`).join("")}</tr></thead><tbody>${d.rows.map(r => `<tr>${r.map((c, i) => `<td${i ? ' class="mono" style="text-align:right"' : ""}>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : "";
  const box = main().firstElementChild;
  main().insertAdjacentHTML("afterbegin", `<div class="arena-top"><div class="container"><div><div class="label" style="color:#9DB1FF">${esc(t.name)} · Live</div><div class="t-sm">Task <span id="q-num">1</span> of ${qs.length}</div></div>
    <div class="q-dots" aria-label="Tasks">${qs.map((x, i) => `<span role="button" tabindex="0" data-dot="${i}">${i + 1}</span>`).join("")}</div>
    <div class="row"><span class="badge red live">Timed</span><div class="timer" id="rc-timer" aria-live="off">--:--</div></div></div></div>`);
  render(`<h1 class="sr">${esc(t.name)} — live</h1><div data-rc-arena style="max-width:960px;margin:0 auto">${qs.map((x, i) => `<div class="q stack-lg${i ? " hide" : ""}" data-qi="${i}">
    <div class="stack"><div class="row"><span class="badge">${esc(x.label)}</span><span class="mono t-xs muted">${x.kind === "mcq" ? `${x.points} pts` : "Written · not scored"}</span></div><h2 class="t-h2">${esc(x.prompt)}</h2>${x.context ? `<p class="muted">${esc(x.context)}</p>` : ""}</div>
    ${table(x.table_data)}
    ${x.kind === "mcq" ? `<div class="stack">${(x.options || []).map((o, k) => `<button class="option${ans[x.id] === k ? " selected" : ""}" aria-pressed="${ans[x.id] === k}" data-q="${x.id}" data-k="${k}"><span class="key">${"ABCDEF"[k]}</span>${esc(o)}</button>`).join("")}</div>`
      : `<textarea class="input" style="min-height:220px" maxlength="4000" data-q="${x.id}" placeholder="Type your answer…">${esc(ans[x.id] || "")}</textarea><div class="row between t-xs muted"><span>${ic("shield")} Saved on this device as you type</span><span>AI tools not allowed for this task</span></div>`}
  </div>`).join("")}
  <div class="row between bt mt4" style="padding-top:var(--s5)"><button class="btn" id="q-prev">${ic("back")} Previous</button><div class="row"><button class="btn btn-ghost" data-modal="leave-modal">Leave</button><button class="btn btn-dark" id="q-next">Next ${ic("arrow")}</button><button class="btn btn-primary hide" id="q-submit" data-modal="submit-modal">Submit</button></div></div></div>
  ${modal("submit-modal", "Submit your answers?", `<p class="muted">You can't change answers after submitting. Unanswered tasks score zero.</p><div class="row"><button class="btn" data-close-modal>Keep working</button><button class="btn btn-primary" id="do-submit">Submit</button></div>`)}
  ${modal("leave-modal", "Leave the tournament?", `<p class="muted">The timer keeps running. Come back before it ends and submit, or your attempt won't count.</p><div class="row"><button class="btn" data-close-modal>Stay</button><a class="btn btn-dark" href="arena.html" data-leave>Leave</a></div>`)}`, box);
  const root = $("[data-rc-arena]"), dots = $$("[data-dot]");
  const mark = () => qs.forEach((x, i) => dots[i].classList.toggle("done", ans[x.id] !== undefined && ans[x.id] !== ""));
  const show = i => { cur = Math.max(0, Math.min(qs.length - 1, i)); $$(".q", root).forEach((el, k) => el.classList.toggle("hide", k !== cur)); dots.forEach((d, k) => d.classList.toggle("cur", k === cur)); $("#q-prev").toggleAttribute("disabled", cur === 0); $("#q-next").classList.toggle("hide", cur === qs.length - 1); $("#q-submit").classList.toggle("hide", cur !== qs.length - 1); $("#q-num").textContent = cur + 1; };
  root.addEventListener("click", e => { const o = e.target.closest(".option[data-q]"); if (!o) return; $$(`.option[data-q="${o.dataset.q}"]`, root).forEach(x => { x.classList.remove("selected"); x.setAttribute("aria-pressed", "false"); }); o.classList.add("selected"); o.setAttribute("aria-pressed", "true"); ans[o.dataset.q] = Number(o.dataset.k); save(); mark(); });
  root.addEventListener("input", e => { if (e.target.matches("textarea[data-q]")) { ans[e.target.dataset.q] = e.target.value; save(); mark(); } });
  dots.forEach((d, k) => d.addEventListener("click", () => show(k)));
  $("#q-prev").addEventListener("click", () => show(cur - 1)); $("#q-next").addEventListener("click", () => show(cur + 1));
  document.addEventListener("visibilitychange", () => { if (document.hidden) { switches++; save(); } });
  const submit = async (auto) => {
    if (sent) return; sent = true; const btn = $("#do-submit"); busy(btn, true, "Submitting…");
    const payload = { _tab_switches: switches }; qs.forEach(x => { if (ans[x.id] !== undefined && ans[x.id] !== "") payload[x.id] = ans[x.id]; });
    try { await q(sb.rpc("submit_entry", { p_tournament: id, p_answers: payload })); try { sessionStorage.removeItem(KEY); } catch (e) {} location.replace(`results.html?t=${encodeURIComponent(id)}`); }
    catch (e) { sent = false; busy(btn, false); if (/already submitted/.test(e.message)) return location.replace(`results.html?t=${encodeURIComponent(id)}`); toast(auto ? "Time's up — " + friendly(e) : friendly(e)); }
  };
  $("#do-submit").addEventListener("click", () => submit(false));
  const timer = $("#rc-timer");
  const tick = () => { const s = Math.max(0, Math.round((deadline - Date.now()) / 1000)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; timer.textContent = (h ? String(h).padStart(2, "0") + ":" : "") + String(m).padStart(2, "0") + ":" + String(x).padStart(2, "0"); timer.classList.toggle("low", s < 300); if (!s) { clearInterval(iv); toast("Time's up — submitting your answers"); submit(true); } };
  const iv = setInterval(tick, 1000); tick(); mark(); show(0);
  let leaving = false; $("[data-leave]").addEventListener("click", () => { leaving = true; });
  window.addEventListener("beforeunload", e => { if (!sent && !leaving) { e.preventDefault(); e.returnValue = ""; } });
};

// ---------- Results ----------
H["results.html"] = async () => {
  let id = params().get("t");
  const ents = await myEntries();
  if (!id) id = Object.keys(ents)[0];
  const e = id && ents[id];
  if (!e) return render(`${pageHead("Results", "No results yet", "")}<div class="empty"><div class="icon">${ic("trophy")}</div><h2 class="t-h2">You haven't finished a tournament${id ? " here" : ""} yet</h2><p class="muted t-sm">Your score and task breakdown appear here the moment you submit.</p><a class="btn btn-primary" href="arena.html">Find a tournament</a></div>`);
  const [[t], st, jobs, apps] = await Promise.all([q(sb.from("tournaments").select("*").eq("id", id)), q(sb.rpc("my_standing", { p_tournament: id })),
    q(sb.from("jobs").select("*").eq("hiring_from", id)), q(sb.from("applications").select("job_id"))]);
  const s = st[0] || { place: 1, total: 1 }, perf = Math.round(1000 * e.auto_points / e.auto_max);
  const score = t.ranked ? e.rating_after : perf, before = e.rating_before, delta = before == null ? null : e.rating_after - before;
  const up = before != null && tierName(e.rating_after) !== tierName(before) && e.rating_after > before;
  const applied = new Set(apps.map(a => a.job_id)), claimable = jobs.filter(j => j.fast_track && score >= j.min_rank && !applied.has(j.id));
  const top = Math.max(1, Math.round(s.place / s.total * 100));
  render(`<div class="card dark card-lg mb3" style="box-shadow:8px 8px 0 var(--blue)"><div class="grid g2" style="align-items:center;gap:var(--s7)">
    <div class="stack"><h1 class="label" style="color:#9DB1FF">${esc(t.name)} · Result</h1>
      <div class="score"><span class="num">${score}</span><span class="of">/1000</span></div>
      <div class="row">${t.ranked ? `<span class="badge blue">${tierName(score)}${up ? " — rank up!" : ""}</span>` : '<span class="badge">Practice · rank unchanged</span>'}<span class="label" style="color:#9DB1FF">#${n(s.place)} of ${n(s.total)} · Top ${top}%</span></div>
      <p class="muted">${t.ranked ? (before == null ? `This sets your starting ${esc(FIELDS[t.cat])} rank.` : `Your ${esc(FIELDS[t.cat])} rank moved from ${before} to ${e.rating_after}.`) : `You scored ${e.auto_points} of ${e.auto_max} points.`}${e.written_pending ? " Your written answer is saved with your entry; it doesn't change your score during the pilot." : ""}</p></div>
    <div class="stack">${t.ranked ? `<div class="row between t-sm"><span>Previous</span><span class="mono">${before == null ? "—" : before}</span></div><div class="row between t-sm"><span>This tournament</span><span class="mono" style="color:#9DB1FF">${delta == null ? "New" : (delta >= 0 ? "+" : "") + delta}</span></div>` : ""}
      <div class="bar" style="border-color:#fff;background:transparent;height:16px"><i style="width:${Math.round(score / 10)}%;background:var(--blue)"></i></div>
      <div class="row between t-xs muted"><span>Challenger 650</span><span>Elite 800</span><span>Legend 900</span></div></div></div></div>
  <div class="grid g3"><div class="card card-lg span2"><h2 class="t-h3 mb2">Task-by-task</h2><div class="list">${e.task_scores.map(x => `<div style="flex-direction:column;align-items:stretch;gap:var(--s2)"><div class="row between"><strong>${esc(x.label)}</strong><span class="mono">${x.max ? `${x.points}/${x.max}` : "Not scored"}</span></div>${x.max ? bar(Math.round(x.points / x.max * 100), x.points / x.max > .85 ? "blue" : "") : '<p class="t-sm muted">Saved with your entry. Written answers aren\'t scored during the pilot.</p>'}</div>`).join("")}</div></div>
  <div class="stack">${claimable.length ? `<div class="card card-lg stack"><h2 class="t-h3">Claim your fast-tracks</h2><p class="t-sm muted">Your score clears the bar for these roles. Pick any — they skip resume screening.</p><div class="stack" data-options="multi" id="claim">${claimable.map(j => `<button class="option" style="padding:var(--s3)" aria-pressed="false" data-job="${esc(j.id)}"><strong class="t-sm">${esc(j.company)}</strong><div class="t-xs muted">${esc(j.role)} · ${esc(j.salary)}</div></button>`).join("")}</div><button class="btn btn-primary btn-block" id="claim-btn">Claim fast-tracks</button></div>`
    : jobs.length ? `<div class="card card-lg stack"><h2 class="t-h3">Hiring from this tournament</h2><div class="list t-sm">${jobs.map(j => `<div><span>${esc(j.company)}<br><span class="t-xs muted">${esc(j.role)}</span></span><span class="mono t-xs">${applied.has(j.id) ? "Applied" : `needs ${j.min_rank}`}</span></div>`).join("")}</div></div>` : ""}
    <div class="card stack"><h2 class="t-h3">Close the gap</h2><p class="t-sm muted">Drills target the tasks where you dropped points.</p><a class="btn btn-block" href="drills.html">Do a drill</a></div>
    <div class="card stack"><button class="btn btn-block" id="share">${ic("send")} Copy my rank card</button><a class="btn btn-ghost btn-block" href="contact.html?topic=dispute">Dispute a score</a></div>
    <div data-fb-slot data-kind="tournament" data-target="${esc(id)}" data-title="How was this tournament?"></div></div></div>`);
  const cb = $("#claim-btn");
  if (cb) cb.addEventListener("click", async () => {
    const picks = $$("#claim .option.selected").map(o => o.dataset.job); if (!picks.length) return toast("Pick at least one company");
    busy(cb, true, "Claiming…");
    try { for (const j of picks) await q(sb.rpc("apply_to_job", { p_job: j, p_note: `Fast-track from ${t.name}` })); location.href = "applications.html?applied=1"; }
    catch (err) { busy(cb, false); toast(friendly(err)); }
  });
  $("#share").addEventListener("click", async () => {
    const text = `I scored ${score}/1000 in ${t.name} on Rank Culture — ${tierName(score)}, top ${top}%. ${location.origin}`;
    try { await navigator.clipboard.writeText(text); toast("Copied — paste it on LinkedIn"); } catch (err) { toast(text); }
  });
};

// ---------- Jobs ----------
const scoreFor = cat => (ME.ratings[cat] ? ME.ratings[cat].score : 0);
H["jobs.html"] = async () => {
  const [jobs, apps] = await Promise.all([q(sb.from("jobs").select("*").order("min_rank")), q(sb.from("applications").select("job_id"))]);
  const applied = new Set(apps.map(a => a.job_id));
  const row = j => { const me = scoreFor(j.cat), ok = me >= j.min_rank; return `<article class="card hover" data-cat="${esc(j.cat)} ${j.type === "Internship" ? "intern" : "full"} ${ok ? "qualify" : ""}">
    <div class="row between" style="align-items:flex-start"><div class="row" style="align-items:flex-start"><span class="avatar">${esc(initials(j.company))}</span><div><a href="job.html?j=${esc(j.id)}"><h3 class="t-h3">${esc(j.role)}</h3></a><div class="t-sm muted">${esc(j.company)} · ${esc(j.city)} · ${esc(j.type)}</div></div></div>
    <div style="text-align:right"><div class="mono">${esc(j.salary)}</div>${j.fast_track ? '<span class="badge blue mt1">Fast-track</span>' : ""}</div></div>
    <div class="row between mt3"><div class="t-sm"><span class="muted">Min. ${esc(FIELDS[j.cat] || j.cat)} rank</span> <span class="mono">${j.min_rank}</span> · <span class="${ok ? "green" : "amber"}">${ME.ratings[j.cat] ? (ok ? `You qualify (+${me - j.min_rank})` : `${j.min_rank - me} pts short`) : "Unranked in this field"}</span></div>
    <div class="row">${applied.has(j.id) ? '<span class="badge green">Applied ✓</span>' : ok ? `<a class="btn btn-sm btn-primary" href="job.html?j=${esc(j.id)}">Apply with rank</a>` : `<a class="btn btn-sm" href="job.html?j=${esc(j.id)}">View role</a>`}</div></div></article>`; };
  render(`${pageHead("Your rank is your resume", "Jobs", "Every role lists the minimum rank. If you're above it, you skip resume screening.")}
  <div class="card mb3"><div class="row"><div style="flex:1;min-width:220px"><input class="input" placeholder="Search role, company or city" data-search="#j-list" aria-label="Search jobs"></div>
  <div class="row" data-filter-group="#j-list" role="group" aria-label="Filter">${[["all", "All"], ["qualify", "I qualify"], ["marketing", "Marketing"], ["data", "Data"], ["product", "Product"], ["sales", "Sales"], ["ops", "Ops"], ["intern", "Internships"]].map(([v, l], i) => `<button class="chip ${i === 0 ? "on" : ""}" data-value="${v}" aria-pressed="${i === 0}">${l}</button>`).join("")}</div></div></div>
  <div class="stack" id="j-list">${jobs.map(row).join("")}<div class="empty hide" data-empty><div class="icon">${ic("search")}</div><h3 class="t-h3">No jobs match that</h3><p class="muted t-sm">Try a different filter.</p></div></div>
  <p class="t-xs muted mt3">Partner companies shown are fictional while Rank Culture is in pilot.</p>`);
};
H["job.html"] = async () => {
  const id = params().get("j");
  const [jobs, apps] = await Promise.all([q(sb.from("jobs").select("*, tournaments(name)").eq("id", id || "")), q(sb.from("applications").select("job_id, status").eq("job_id", id || ""))]);
  const j = jobs[0]; if (!j) return go("jobs.html");
  const me = scoreFor(j.cat), ok = me >= j.min_rank, app = apps[0], ranked = !!ME.ratings[j.cat];
  render(`<a class="link" href="jobs.html">${ic("back")} All jobs</a>
  <div class="grid mt3 rc-split"><div class="stack-lg">
    <div class="card card-lg stack"><div class="row"><span class="avatar lg">${esc(initials(j.company))}</span><div><div class="row"><span class="badge">Partner (pilot)</span>${j.fast_track ? '<span class="badge blue">Fast-track</span>' : ""}</div><h1 class="t-h1 mt1">${esc(j.role)}</h1><div class="muted">${esc(j.company)} · ${esc(j.city)} · ${esc(j.type)}</div></div></div>
      <div class="grid g3 mt2"><div><div class="label muted">Salary</div><div class="mono t-h3">${esc(j.salary)}</div></div><div><div class="label muted">Min. rank</div><div class="mono t-h3">${j.min_rank}</div></div><div><div class="label muted">Hiring from</div><div class="t-sm mt1">${esc(j.tournaments ? j.tournaments.name : "Any tournament in " + (FIELDS[j.cat] || j.cat))}</div></div></div></div>
    <div class="card card-lg stack"><h2 class="t-h3">What you'll do</h2><ul class="stack" style="padding-left:20px">${(j.duties || []).map(d => `<li>${esc(d)}</li>`).join("")}</ul></div>
    <div class="card card-lg stack"><h2 class="t-h3">About ${esc(j.company)}</h2><p class="muted">${esc(j.about)} Fictional company for the pilot.</p></div></div>
  <aside class="card card-lg stack rc-sticky"><div class="label muted">Your match · ${esc(FIELDS[j.cat] || j.cat)}</div>
    <div class="score"><span class="num">${ranked ? me : "—"}</span><span class="of">/ ${j.min_rank} needed</span></div>
    ${ranked ? (ok ? '<span class="badge green">You qualify · skip screening</span>' : `<span class="badge amber">${j.min_rank - me} pts short</span>`) : '<span class="badge amber">Not ranked in this field yet</span>'}
    <p class="t-sm muted">Applying sends your rank and task scores — not a resume.</p>
    ${app ? `<span class="badge green">Applied ✓ · ${esc(app.status)}</span><a class="btn btn-block" href="applications.html">Track it</a>` : `<button class="btn btn-primary btn-lg btn-block" data-modal="apply-modal">${ok ? "Apply with my rank" : "Apply anyway"}</button>`}
    ${!ok ? `<a class="btn btn-block" href="arena.html">Raise my rank first</a>` : ""}</aside></div>
  ${modal("apply-modal", `Apply to ${esc(j.company)}`, `<div class="list t-sm"><div><span>${esc(FIELDS[j.cat] || j.cat)} rank (${ranked ? me : "unranked"})</span>${ic("check")}</div><div><span>Task scores from your tournaments</span>${ic("check")}</div><div><span>${ok && j.fast_track ? "Fast-track: skips screening" : "Standard application"}</span>${ic("check")}</div></div>
    <div class="field"><label for="ap-note">Note to the team (optional)</label><textarea class="input" id="ap-note" maxlength="500" placeholder="One line on why this role"></textarea></div>
    <div class="row"><button class="btn" data-close-modal>Cancel</button><button class="btn btn-primary" id="ap-send">Send application</button></div>`)}`);
  const send = $("#ap-send");
  if (send) send.addEventListener("click", async () => { busy(send, true, "Sending…"); try { await q(sb.rpc("apply_to_job", { p_job: j.id, p_note: $("#ap-note").value.slice(0, 500) })); location.href = `applications.html?applied=${encodeURIComponent(j.id)}`; } catch (e) { busy(send, false); toast(friendly(e)); } });
};

// ---------- Applications ----------
H["applications-empty.html"] = () => go("applications.html");
H["applications.html"] = async () => {
  const apps = await q(sb.from("applications").select("id, job_id, status, fast_track, created_at, jobs(role, company)").order("created_at", { ascending: false }));
  const just = apps.find(a => a.job_id === params().get("applied"));
  if (!apps.length) {
    const jobs = await q(sb.from("jobs").select("cat, min_rank"));
    const qual = jobs.filter(j => ME.ratings[j.cat] && ME.ratings[j.cat].score >= j.min_rank).length;
    return render(`${pageHead("Track everything", "Applications", "")}<div class="empty"><div class="icon">${ic("file")}</div><h2 class="t-h2">No applications yet</h2><p class="muted" style="max-width:48ch">${qual ? `You qualify for ${qual} job${qual === 1 ? "" : "s"} right now. Applying takes one click — no resume needed.` : "Get ranked in a tournament first, then apply to roles with your score."}</p><div class="row"><a class="btn btn-primary" href="jobs.html">See jobs</a><a class="btn" href="arena.html">Raise my rank first</a></div></div>`);
  }
  const col = (h, st) => { const items = apps.filter(a => st.includes(a.status)); return `<div class="stack"><div class="row between"><span class="label">${h}</span><span class="mono t-xs muted">${items.length}</span></div>${items.length ? items.map(a => `<div class="card" style="padding:var(--s4)"><strong class="t-sm">${esc(a.jobs.role)}</strong><div class="t-xs muted">${esc(a.jobs.company)}</div><div class="row between mt2"><span class="t-xs muted">${ago(a.created_at)}</span>${appBadge(a)}</div>${a.status === "applied" ? `<button class="link t-xs mt2" data-withdraw="${esc(a.id)}">Withdraw</button>` : ""}</div>`).join("") : '<div class="card t-sm muted center" style="border-style:dashed">Nothing yet</div>'}</div>`; };
  render(`${just ? `<div class="banner blue mb3"><span><strong>Application sent to ${esc(just.jobs.company)}.</strong> ${just.fast_track ? "Fast-track roles aim to reply within 7 days." : "We'll show updates here."}</span></div>` : params().get("applied") ? '<div class="banner blue mb3"><span><strong>Fast-tracks claimed.</strong> Track them below.</span></div>' : ""}
  ${pageHead("Track everything", "Applications", "", `<a class="btn" href="jobs.html">Find more jobs</a>`)}
  <div class="grid g4">${col("Applied", ["applied"])}${col("In review", ["review"])}${col("Interview", ["interview"])}${col("Offer", ["offer"])}</div>
  <p class="t-xs muted mt3">Partner companies are fictional during the pilot, so statuses won't move yet.</p>`);
  $$("[data-withdraw]").forEach(b => b.addEventListener("click", async () => {
    if (!confirm("Withdraw this application?")) return;
    busy(b, true, "Withdrawing…");
    try { const gone = await q(sb.from("applications").delete().eq("id", b.dataset.withdraw).select("id")); if (!gone.length) throw new Error("This application can't be withdrawn any more."); toast("Withdrawn"); H["applications.html"](); } catch (err) { busy(b, false); toast(friendly(err)); }
  }));
};

// ---------- Profile ----------
H["profile.html"] = async () => {
  const p = ME.profile, ents = await q(sb.from("entries").select("tournament_id, rating_after, auto_points, auto_max, submitted_at, tournaments(name, ranked)").order("submitted_at", { ascending: false }));
  const f = bestField(), r = ME.ratings[f], rs = Object.values(ME.ratings).sort((a, b) => b.score - a.score);
  const vis = { private: "Private", recruiters: "Recruiters only", public: "Public" }[p.visibility];
  render(`<div class="card card-lg mb3"><div class="grid g2" style="align-items:center">
    <div class="row" style="align-items:flex-start"><span class="avatar lg">${esc(initials(p.full_name))}</span><div class="stack"><div class="row">${r ? tierBadge(r.score) : '<span class="badge">Unranked</span>'}<span class="badge">${vis} profile</span></div><h1 class="t-h1">${esc(p.full_name || "Your name")}</h1>
      <p class="muted">${esc(FIELDS[p.field] || "")}${p.city && p.show_city ? ` · ${esc(p.city)}` : ""}${p.open_to_work ? " · Open to work" : ""}</p><div class="row t-sm">${(p.skills || []).slice(0, 6).map(s => `<span class="badge">${esc(s)}</span>`).join("")}</div></div></div>
    <div class="row" style="justify-content:flex-end"><div class="score"><span class="num">${r ? r.score : "—"}</span><span class="of">/1000</span></div></div></div>
    <div class="row mt3"><button class="btn btn-primary" id="share">${ic("send")} Copy rank card</button><a class="btn" href="settings.html">Edit profile & visibility</a></div></div>
  <div class="grid g3"><div class="card card-lg span2"><h2 class="t-h3 mb2">Verified ranks by field</h2>${rs.length ? `<div class="stack">${rs.map(x => `<div><div class="row between t-sm"><span>${esc(FIELDS[x.field] || x.field)} · ${tierName(x.score)}</span><span class="mono">${x.score}/1000</span></div>${bar(Math.round(x.score / 10), x.score >= 800 ? "blue" : "")}</div>`).join("")}</div>` : '<p class="t-sm muted">Your ranks appear here after your first tournament. Only tournament scores count — nothing you type yourself.</p><a class="btn btn-primary mt2" href="arena.html">Find a tournament</a>'}</div>
    <div class="card card-lg"><h2 class="t-h3 mb2">Tournament history</h2>${ents.length ? `<div class="list t-sm">${ents.map(x => `<div><span><a href="results.html?t=${esc(x.tournament_id)}">${esc(x.tournaments.name)}</a><br><span class="t-xs muted">${fmtDay(x.submitted_at)}${x.tournaments.ranked ? "" : " · practice"}</span></span><span class="mono">${x.tournaments.ranked ? x.rating_after : Math.round(1000 * x.auto_points / x.auto_max)}</span></div>`).join("")}</div>` : '<p class="t-sm muted">Nothing yet.</p>'}</div></div>`);
  $("#share").addEventListener("click", async () => { const text = r ? `I'm ${tierName(r.score)} (${r.score}/1000) in ${FIELDS[f]} on Rank Culture — ranked on real work, not resumes. ${location.origin}` : `I'm competing on Rank Culture. ${location.origin}`; try { await navigator.clipboard.writeText(text); toast("Copied"); } catch (e) { toast(text); } });
};

// ---------- Settings ----------
H["settings.html"] = async () => {
  const p = ME.profile, tab = params().get("tab") || "s-vis";
  const tog = (key, h, d) => `<div><span><strong class="t-sm">${h}</strong><br><span class="t-sm muted">${d}</span></span><button class="toggle" role="switch" aria-checked="${!!p[key]}" aria-label="${h}" data-label="${h}" data-pref="${key}"></button></div>`;
  const { data: fl } = await sb.auth.mfa.listFactors();
  const totp = ((fl && fl.totp) || []).filter(x => x.status === "verified")[0];
  const identities = (ME.user.identities || []).map(i => i.provider);
  render(`${pageHead("Your data, your call", "Settings", "")}
  <div class="tabs mb3" data-tabs role="tablist">${[["s-vis", "Visibility"], ["s-acc", "Account"], ["s-sec", "Security"], ["s-not", "Notifications"], ["s-data", "Data"]].map(([id, l]) => `<button class="${id === tab ? "on" : ""}" data-tab="${id}" role="tab" aria-selected="${id === tab}">${l}</button>`).join("")}</div>
  <div id="s-vis" class="stack-lg ${tab === "s-vis" ? "" : "hide"}"><div class="card card-lg"><h2 class="t-h3 mb2">Who can see my rank</h2>
    <div class="grid g3" data-options="single" id="vis">${[["private", "Only me", "Private. Nobody sees your score."], ["recruiters", "Recruiters only", "Verified hiring partners can find you."], ["public", "Everyone", "Shown on the public leaderboard."]].map(([v, h, d]) => `<button class="option ${p.visibility === v ? "selected" : ""}" aria-pressed="${p.visibility === v}" data-vis="${v}"><strong>${h}</strong><p class="t-sm muted mt1">${d}</p></button>`).join("")}</div></div>
    <div class="card card-lg"><div class="list">${tog("hide_college", "Hide my college from recruiters", "Shown only after you accept an interview.")}${tog("show_city", "Show my city", "Helps local recruiters find you.")}${tog("open_to_work", "Open to work badge", "Recruiters see you're actively looking.")}</div></div></div>
  <form id="s-acc" class="${tab === "s-acc" ? "" : "hide"} card card-lg stack" style="max-width:640px" novalidate>
    <div class="field"><label for="a-n">Name</label><input class="input" id="a-n" maxlength="80" required value="${esc(p.full_name || "")}"></div>
    <div class="grid g2"><div class="field"><label for="a-c">City</label><input class="input" id="a-c" maxlength="60" value="${esc(p.city || "")}"></div>
    <div class="field"><label for="a-s">I am</label><select class="input" id="a-s">${Object.entries(STAGES).map(([k, v]) => `<option value="${k}"${p.stage === k ? " selected" : ""}>${v}</option>`).join("")}</select></div></div>
    <div class="field"><label for="a-f">Main field</label><select class="input" id="a-f">${FIELD_ORDER.map(k => `<option value="${k}"${p.field === k ? " selected" : ""}>${FIELDS[k]}</option>`).join("")}</select></div>
    <div class="row"><button class="btn btn-primary" type="submit">Save changes</button></div>
    <div class="bt stack" style="padding-top:var(--s5)"><div class="label muted">Email</div><p class="t-sm"><strong>${esc(ME.user.email)}</strong> · signs in with ${[identities.includes("google") && "Google", identities.includes("github") && "GitHub", "email links"].filter(Boolean).join(", ")}</p>
      <div class="row"><input class="input" id="a-e" type="email" placeholder="New email" style="flex:1;min-width:200px"><button class="btn" type="button" id="a-e-btn">Change email</button></div><p class="t-xs muted">We'll send a confirmation link to both addresses. Nothing changes until you confirm.</p></div></form>
  <div id="s-sec" class="${tab === "s-sec" ? "" : "hide"} stack-lg" style="max-width:640px">
    <form class="card card-lg stack" id="pw-change" novalidate><div><h2 class="t-h3">Password</h2><p class="t-sm muted">Set or change the password you log in with. At least 8 characters, with a letter and a number.</p></div>
      <div class="field"><label for="pw-new">New password</label><input class="input" id="pw-new" type="password" autocomplete="new-password" minlength="8" maxlength="72"></div>
      <div class="field"><label for="pw-new2">Type it again</label><input class="input" id="pw-new2" type="password" autocomplete="new-password" maxlength="72"></div>
      <div class="field hide" id="pw-nonce-f"><label for="pw-nonce">Code we just emailed you</label><input class="input mono" id="pw-nonce" inputmode="numeric" autocomplete="one-time-code" maxlength="10"><span class="hint t-xs muted">For your security we confirm it's you before changing a password.</span></div>
      <div class="row"><button class="btn btn-primary" type="submit">Save password</button></div></form>
    <form class="card card-lg stack hide" id="ph-card" novalidate><div><h2 class="t-h3">Mobile number</h2><p class="t-sm muted">Add a number to reset your password by SMS code. It's never shown to anyone.</p></div>
      <p class="t-sm" id="ph-now"></p>
      <div class="field"><label for="ph-new">Mobile number</label><div class="row" style="gap:var(--s2);flex-wrap:nowrap"><span class="input" style="flex:none;width:auto">+91</span><input class="input" id="ph-new" type="tel" inputmode="tel" autocomplete="tel-national" maxlength="14" style="flex:1"></div></div>
      <div class="field hide" id="ph-code-f"><label for="ph-code">Code we just sent by SMS</label><input class="input mono" id="ph-code" inputmode="numeric" autocomplete="one-time-code" maxlength="8"></div>
      <div class="row"><button class="btn btn-primary" type="submit" id="ph-go">Send code</button></div></form>
    <div class="card card-lg stack"><div class="row between"><div><h2 class="t-h3">Two-step verification</h2><p class="t-sm muted">Ask for a code from an authenticator app (Google Authenticator, Authy, 1Password) every time you sign in.</p></div>${totp ? '<span class="badge green">On</span>' : '<span class="badge">Off</span>'}</div>
      <div id="mfa-box">${totp ? `<button class="btn" id="mfa-off" style="border-color:var(--red);color:var(--red)">Turn off two-step verification</button>` : `<button class="btn btn-primary" id="mfa-on">${ic("lock")} Set up two-step verification</button>`}</div></div>
    <div class="card card-lg stack"><h2 class="t-h3">Sessions</h2><p class="t-sm muted">Lost a phone or used a shared computer? Sign out everywhere, including this device.</p><button class="btn" id="sign-out-all">Sign out of all devices</button></div></div>
  <div id="s-not" class="${tab === "s-not" ? "" : "hide"} card card-lg" style="max-width:640px"><div class="list">${tog("notify_reminders", "Tournament reminders", "Before tournaments you've registered for.")}${tog("notify_weekly", "Weekly rank report", "Every Monday.")}</div><p class="t-xs muted mt2">Saved now; reminder emails switch on after the pilot.</p></div>
  <div id="s-data" class="${tab === "s-data" ? "" : "hide"} card card-lg stack" style="max-width:640px"><p class="t-sm">Download everything we hold about you, or delete your account. Deletion is immediate and permanent.</p>
    <div class="row"><button class="btn" id="export">Export my data</button><button class="btn" style="border-color:var(--red);color:var(--red)" data-modal="del-modal">Delete account</button></div></div>
  ${modal("del-modal", "Delete your account?", `<p class="muted">Your profile, ranks, tournament history and applications are deleted right away. This can't be undone. If you last logged in more than 10 minutes ago, we'll ask you to log in again first.</p><div class="field"><label for="del-confirm">Type DELETE to confirm</label><input class="input" id="del-confirm" autocomplete="off"></div><div class="row"><button class="btn" data-close-modal>Cancel</button><button class="btn btn-dark" id="del-go">Delete forever</button></div>`)}`);
  const upd = async (patch, msg = "Saved") => { try { const row = await q(sb.from("profiles").update(patch).eq("id", ME.user.id).select().single()); ME.profile = row; fillShell(); toast(msg); } catch (e) { toast(friendly(e)); } };
  $$("#vis .option").forEach(o => o.addEventListener("click", () => upd({ visibility: o.dataset.vis }, o.dataset.vis === "public" ? "Visible to everyone — your name now shows on leaderboards" : "Visibility updated")));
  $$("[data-pref]").forEach(t => t.addEventListener("click", async () => { const want = t.getAttribute("aria-checked") === "true"; await upd({ [t.dataset.pref]: want }); if (!!ME.profile[t.dataset.pref] !== want) t.setAttribute("aria-checked", String(!want)); }));
  $("#s-acc").addEventListener("submit", e => { e.preventDefault(); const name = $("#a-n").value.trim(); if (name.length < 1) return toast("Enter your name"); upd({ full_name: name.slice(0, 80), city: $("#a-c").value.trim().slice(0, 60) || null, stage: $("#a-s").value, field: $("#a-f").value }); });
  $("#a-e-btn").addEventListener("click", async () => { const v = $("#a-e").value.trim(); if (!/^\S+@\S+\.\S+$/.test(v)) return toast("Enter a valid email"); const { error } = await sb.auth.updateUser({ email: v }, { emailRedirectTo: location.origin + "/settings.html?tab=s-acc" }); toast(error ? friendly(error) : "Check both inboxes to confirm the change"); });
  $("#sign-out-all").addEventListener("click", async () => { await sb.auth.signOut({ scope: "global" }); location.href = "login.html"; });
  $("#export").addEventListener("click", async () => {
    try {
      const [regs, ents, apps, rts] = await Promise.all([q(sb.from("registrations").select("*")), q(sb.from("entries").select("*")), q(sb.from("applications").select("*")), q(sb.from("ratings").select("*"))]);
      const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), email: ME.user.email, profile: ME.profile, ratings: rts, registrations: regs, entries: ents, applications: apps }, null, 2)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "rank-culture-data.json"; a.click(); URL.revokeObjectURL(a.href);
    } catch (e) { toast(friendly(e)); }
  });
  $("#del-go").addEventListener("click", async () => {
    const b = $("#del-go"); if ($("#del-confirm").value.trim() !== "DELETE") return toast("Type DELETE to confirm");
    busy(b, true, "Deleting…");
    try { await q(sb.rpc("delete_my_account")); }
    catch (e) {
      busy(b, false); toast(friendly(e));
      // Deletion needs a login in the last 10 minutes: sign in again and come straight back here.
      if (/reauth required/i.test(e.message || "")) { await sb.auth.signOut({ scope: "local" }); return go("login.html?next=" + encodeURIComponent("settings.html?tab=s-data")); }
      return;
    }
    try { Object.keys(sessionStorage).filter(k => k.startsWith("rc-")).forEach(k => sessionStorage.removeItem(k)); localStorage.removeItem("rc-next"); } catch (e) {}
    await sb.auth.signOut({ scope: "local" }); location.replace("index.html?deleted=1");
  });
  $("#pw-change").addEventListener("submit", async e => {
    e.preventDefault();
    const pw = $("#pw-new").value, weak = pwProblem(pw, ME.user.email), nonce = $("#pw-nonce").value.replace(/\D/g, "");
    if (weak) { $("#pw-new").classList.add("error"); return toast(weak); }
    if (pw !== $("#pw-new2").value) { $("#pw-new2").classList.add("error"); return toast("The two passwords don't match"); }
    const btn = $("#pw-change button[type=submit]"); busy(btn, true, "Saving…");
    const { error } = await sb.auth.updateUser(nonce ? { password: pw, nonce } : { password: pw });
    if (error && /reauth|nonce/i.test(error.message) && !nonce) {
      const r = await sb.auth.reauthenticate(); busy(btn, false);
      if (r.error) return toast(friendly(r.error));
      $("#pw-nonce-f").classList.remove("hide"); $("#pw-nonce").focus(); return toast("We emailed you a code — enter it and press Save again");
    }
    busy(btn, false);
    if (error) return toast(friendly(error));
    $("#pw-new").value = $("#pw-new2").value = $("#pw-nonce").value = ""; $("#pw-nonce-f").classList.add("hide");
    toast("Password saved");
  });
  if (await phoneEnabled()) {
    $("#ph-card").classList.remove("hide");
    const cur = ME.user.phone ? "+" + String(ME.user.phone).replace(/^\+/, "") : "";
    $("#ph-now").innerHTML = cur ? `Current: <strong>${esc(cur)}</strong>` : "No number added yet.";
    let pending = null;
    $("#ph-card").addEventListener("submit", async e => {
      e.preventDefault(); const btn = $("#ph-go");
      if (!pending) {
        const ph = toE164($("#ph-new").value); if (!ph) { $("#ph-new").classList.add("error"); return toast("Enter a 10-digit Indian mobile number"); }
        busy(btn, true, "Sending…"); const { error } = await sb.auth.updateUser({ phone: ph }); busy(btn, false);
        if (error) return toast(friendly(error));
        pending = ph; $("#ph-code-f").classList.remove("hide"); $("#ph-code").focus(); btn.textContent = "Verify number"; return;
      }
      const code = $("#ph-code").value.replace(/\D/g, ""); if (code.length < 6) { $("#ph-code").classList.add("error"); return; }
      busy(btn, true, "Checking…"); const { error } = await sb.auth.verifyOtp({ phone: pending, token: code, type: "phone_change" }); busy(btn, false);
      if (error) return toast(friendly(error));
      $("#ph-now").innerHTML = `Current: <strong>${esc(pending)}</strong>`; pending = null; $("#ph-code-f").classList.add("hide"); $("#ph-new").value = $("#ph-code").value = ""; btn.textContent = "Send code"; toast("Number verified");
    });
  }
  const on = $("#mfa-on"), off = $("#mfa-off");
  if (on) on.addEventListener("click", async () => {
    busy(on, true);
    const { data: stale } = await sb.auth.mfa.listFactors();
    for (const f of ((stale && stale.all) || []).filter(x => x.status === "unverified")) await sb.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator " + new Date().toISOString().slice(0, 10) });
    if (error) { busy(on, false); return toast(friendly(error)); }
    $("#mfa-box").innerHTML = `<div class="stack"><p class="t-sm">1. Scan this QR code with your authenticator app.</p><img src="${esc(data.totp.qr_code)}" alt="QR code for two-step verification" width="180" height="180" style="border:var(--border);background:#fff">
      <p class="t-xs muted">Can't scan? Enter this key: <span class="mono">${esc(data.totp.secret)}</span></p><p class="t-sm">2. Enter the 6-digit code it shows.</p>
      <div class="row"><input class="input mono" id="mfa-code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" style="max-width:160px"><button class="btn btn-primary" id="mfa-verify">Turn on</button></div></div>`;
    $("#mfa-verify").addEventListener("click", async () => {
      const { error: e2 } = await sb.auth.mfa.challengeAndVerify({ factorId: data.id, code: $("#mfa-code").value.trim() });
      if (e2) return toast(friendly(e2));
      toast("Two-step verification is on"); location.replace("settings.html?tab=s-sec");
    });
  });
  if (off) off.addEventListener("click", async () => {
    if (!confirm("Turn off two-step verification?")) return;
    const { error } = await sb.auth.mfa.unenroll({ factorId: totp.id });
    if (error) return toast(friendly(error));
    await sb.auth.refreshSession(); toast("Two-step verification is off"); location.replace("settings.html?tab=s-sec");
  });
};


// ---------- Contact ----------
H["contact.html"] = async signedIn => {
  const form = $("#c-form"); if (!form) return;
  const topic = params().get("topic");
  if (topic && $(`#c-topic option[value="${CSS.escape(topic)}"]`)) $("#c-topic").value = topic;
  if (topic === "pro-waitlist") $("#c-msg").value = "Please email me when Pro opens.";
  if (signedIn) {
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        $("#c-email").value = user.email || "";
        const { data: p } = await sb.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
        if (p && p.full_name) $("#c-name").value = p.full_name;
      }
    } catch (e) { /* prefill is optional */ }
  }
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const name = $("#c-name").value.trim(), email = $("#c-email").value.trim(), msg = $("#c-msg").value.trim();
    const bad = [["#c-name", !name], ["#c-email", !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)], ["#c-msg", !msg]];
    bad.forEach(([sel, b]) => $(sel).classList.toggle("error", b));
    if (bad.some(([, b]) => b)) return toast("Please fill in your name, a valid email and a message");
    const btn = $("button[type=submit]", form); busy(btn, true, "Sending…");
    try {
      await q(sb.rpc("send_contact", { p_topic: $("#c-topic").value, p_name: name, p_email: email, p_message: msg }));
      $("#c-wrap").innerHTML = `<div class="card card-lg stack"><div class="icon">${ic("check")}</div><h2 class="t-h2">Message sent</h2><p class="muted">Thanks, ${esc(firstName(name))}. We'll reply to <strong>${esc(email)}</strong>, usually within two working days.</p><a class="btn" href="index.html">Back to home</a></div>`;
    } catch (err) { busy(btn, false); $("#c-msg-box").innerHTML = `<div class="banner red">${esc(friendly(err))}</div>`; }
  });
};

const BX = {};
require("./rc-path")(H, Object.assign(BX, { sb, $, $$, esc, q, render, toast, busy, friendly, main, params, ic, pageHead, FIELDS, n, bar, me: () => ME }));
require("./rc-battle")(H, Object.assign(BX, { sb, $, $$, esc, q, render, toast, busy, friendly, modal, main, params, go, ic, pageHead, tierBadge, FIELDS, n, fmt, errorState, bar,
  me: () => ME, bestField: () => bestField() }));

// ---------- Boot ----------
async function start(file) {
  wireGlobal();
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (PROTECTED.has(file)) {
      if (!session) return go("login.html?next=" + encodeURIComponent(here()));
      const { data: { user }, error } = await sb.auth.getUser(); // verified by the auth server, not just the local token
      if (error || !user) { await sb.auth.signOut({ scope: "local" }); return go("login.html?next=" + encodeURIComponent(here())); }
      if (file !== "mfa.html") {
        const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") return go("mfa.html");
        ME = await loadMe(user);
        if (!ME.profile.onboarded && !file.startsWith("onboarding")) return go("onboarding-1.html");
        fillShell(); fillNext();
      }
      if (SAMPLE.has(file)) { const m = main(); if (m) m.insertAdjacentHTML("afterbegin", '<div class="banner amber mb3"><span><strong>Sample screen.</strong> This part of Rank Culture isn\'t live yet — what you see is example data.</span></div>'); }
    } else if (session && (file === "login.html" || file === "signup.html")) {
      return afterSignIn();
    } else if (session) publicHeaderSignedIn();
    if (file === "index.html" && params().get("deleted")) setTimeout(() => toast("Your account and all its data have been deleted."), 300);
    if (file === "login.html") authPage("login");
    if (file === "signup.html") authPage("signup");
    if (H[file]) await H[file](!!session);
  } catch (e) {
    const m = main(); if (m && RENDERED.has(file)) render(errorState(e), m.querySelector(".container") || m); else console.error(e);
  }
}

module.exports = { guard, prepare, start, sb };
