const { barePage, ic, bar, tierBadge, logo, head } = require("./layout");

const recHeader = (active) => `
<header class="header"><div class="container" style="max-width:none">
  <div class="row">${logo("recruiter.html")}<span class="badge dark">Recruiter</span></div>
  <nav class="nav" aria-label="Recruiter">${[["recruiter.html", "Talent search"], ["host-tournament.html", "Host tournament"], ["messages.html", "Messages"]].map(([h, l]) => `<a href="${h}"${h === active ? ' class="active"' : ""}>${l}</a>`).join("")}</nav>
  <div class="header-actions"><span class="t-sm muted hide-m">Kirana Club · 38 unlocks left</span><span class="avatar">PK</span><button class="icon-btn menu-btn" data-open-drawer aria-label="Menu">${ic("menu")}</button></div>
</div></header>
<div class="drawer" id="drawer"><div class="drawer-bg" data-close-drawer></div><div class="drawer-panel">
  <div class="row between mb2">${logo("recruiter.html")}<button class="icon-btn" data-close-drawer aria-label="Close">${ic("x")}</button></div>
  <a class="dl" href="recruiter.html">Talent search</a><a class="dl" href="host-tournament.html">Host tournament</a><a class="dl" href="employers.html">Plans</a><a class="dl" href="index.html">Log out</a>
</div></div>`;
const recPage = (title, active, body) => barePage({ title, header: "none", body: recHeader(active) + `<div class="container section-sm" style="max-width:1280px">${body}</div>` });

const CANDS = [
  ["C-2041", "Growth Marketing", "Pune", 968, [["Copy", 98], ["Funnels", 95], ["Ads", 91]], "Open", "marketing"],
  ["C-1187", "Growth Marketing", "Indore", 884, [["Copy", 90], ["Funnels", 86], ["Ads", 82]], "Open", "marketing"],
  ["C-3302", "Data Analytics", "Kochi", 955, [["SQL", 97], ["Excel", 93], ["Stats", 90]], "Open", "data"],
  ["C-0912", "Growth Marketing", "Lucknow", 812, [["Copy", 84], ["Funnels", 79], ["Ads", 80]], "Interviewing", "marketing"],
  ["C-2280", "Product", "Bengaluru", 941, [["Teardown", 96], ["PRD", 92], ["Priority", 90]], "Open", "product"],
  ["C-4471", "Sales", "Nagpur", 922, [["Cold email", 94], ["Objections", 91], ["Discovery", 88]], "Open", "sales"],
  ["C-1950", "Growth Marketing", "Mumbai", 742, [["Copy", 88], ["Funnels", 71], ["Ads", 64]], "Open", "marketing"],
];

const recruiter = recPage("Talent search", "recruiter.html", `
<div class="page-head"><div><div class="label muted">Hire by rank</div><h1 class="t-h1">Talent search</h1><p class="lead mt1">Every candidate here proved the skill in a proctored tournament. Names and colleges unlock when you invite to interview.</p></div><a class="btn btn-primary" href="host-tournament.html">${ic("plus")} Host a hiring tournament</a></div>
<div class="grid g4 mb3">
  <div class="card kpi"><div class="label muted">Matching candidates</div><div class="v mt1">1,284</div></div>
  <div class="card kpi"><div class="label muted">Elite & Legend</div><div class="v mt1">212</div></div>
  <div class="card kpi"><div class="label muted">Your open roles</div><div class="v mt1">3</div></div>
  <div class="card kpi dark"><div class="label" style="color:#9DB1FF">Interviews this week</div><div class="v mt1">7</div></div>
</div>
<div class="grid" style="grid-template-columns:260px minmax(0,1fr);gap:var(--s5);align-items:start">
  <aside class="card stack" style="position:sticky;top:88px">
    <div class="field"><label for="rf-s">Search</label><input class="input" id="rf-s" placeholder="Skill or city" data-search="#c-list"></div>
    <div class="field"><label>Field</label><div class="row" data-filter-group="#c-list">${[["all", "All"], ["marketing", "Marketing"], ["data", "Data"], ["product", "Product"], ["sales", "Sales"]].map(([v, l], i) => `<button class="chip ${i ? "" : "on"}" data-value="${v}" aria-pressed="${!i}">${l}</button>`).join("")}</div></div>
    <div class="field"><label for="rf-min">Minimum score: <span class="mono" id="rf-v">700</span></label><input id="rf-min" type="range" min="400" max="950" step="10" value="700" oninput="document.getElementById('rf-v').textContent=this.value" style="accent-color:var(--blue)"></div>
    <label class="check"><input type="checkbox" checked> Hide college (recommended)</label>
    <label class="check"><input type="checkbox"> Open to relocate</label>
    <button class="btn btn-dark btn-block" data-toast="Filters applied">Apply</button>
  </aside>
  <div class="stack" id="c-list">
    ${CANDS.map(([id, f, city, s, sk, st, cat]) => `<article class="card hover" data-cat="${cat}"><div class="grid" style="grid-template-columns:auto 1fr auto;gap:var(--s5);align-items:center">
      <div class="stack" style="text-align:center"><div class="mono t-h1">${s}</div>${tierBadge(s)}</div>
      <div class="stack"><div class="row"><strong>Candidate ${id}</strong><span class="t-sm muted">${f} · ${city}</span>${st === "Interviewing" ? '<span class="badge amber">Interviewing elsewhere</span>' : '<span class="badge green">Open to work</span>'}</div>
        <div class="grid g3 t-xs">${sk.map(([k, v]) => `<div><div class="row between"><span>${k}</span><span class="mono">${v}</span></div>${bar(v, "thin blue")}</div>`).join("")}</div></div>
      <div class="stack"><button class="btn btn-primary btn-sm" data-modal="invite-modal">Invite to interview</button><a class="btn btn-sm" href="profile.html?view=recruiter">View work</a></div>
    </div></article>`).join("")}
    <div class="empty hide" data-empty><div class="icon">${ic("search")}</div><h3 class="t-h3">No candidates match</h3><p class="muted t-sm">Lower the minimum score, or host a tournament to grow the pool.</p></div>
  </div>
</div>
<div class="modal" id="invite-modal" role="dialog" aria-modal="true" aria-labelledby="iv-h"><div class="card card-lg stack">
  <h2 class="t-h2" id="iv-h">Invite to interview</h2><p class="muted t-sm">Uses 1 unlock. You'll see the candidate's name, college and contact once they accept.</p>
  <div class="field"><label for="iv-r">Role</label><select class="input" id="iv-r"><option>Growth Associate · 8–12 LPA</option><option>Performance Marketer · 10–14 LPA</option></select></div>
  <div class="field"><label for="iv-m">Message</label><textarea class="input" id="iv-m">Loved your tournament work — would you like to chat about the Growth Associate role?</textarea></div>
  <div class="row"><button class="btn" data-close-modal>Cancel</button><button class="btn btn-primary" data-close-modal data-toast="Invite sent · 37 unlocks left">Send invite</button></div>
</div></div>
<style>@media(max-width:960px){.section-sm>.grid{grid-template-columns:1fr!important}.section-sm aside.card{position:static!important}#c-list .grid{grid-template-columns:1fr!important}}</style>`);

const host = recPage("Host a tournament", "host-tournament.html", `
<a class="link" href="recruiter.html">${ic("back")} Talent search</a>
<div class="page-head mt3"><div><div class="label muted">Hire from the top 20</div><h1 class="t-h1">Host a hiring tournament</h1><p class="lead mt1">Turn real work from your team into a 60-minute tournament. Our panel reviews your tasks before launch.</p></div></div>
<div class="steps mb3"><div class="done"><div class="seg"></div><div class="label">1 · Role</div></div><div class="now"><div class="seg"></div><div class="label">2 · Tasks</div></div><div><div class="seg"></div><div class="label muted">3 · Prizes</div></div><div><div class="seg"></div><div class="label muted">4 · Launch</div></div></div>
<div class="grid" style="grid-template-columns:minmax(0,1fr) 340px;gap:var(--s6);align-items:start">
  <div class="stack-lg">
    <div class="card card-lg stack"><h2 class="t-h3">Role</h2><div class="grid g2"><div class="field"><label for="h-r">Role title</label><input class="input" id="h-r" value="Growth Associate"></div><div class="field"><label for="h-f">Field</label><select class="input" id="h-f"><option>Marketing</option><option>Data</option><option>Product</option><option>Sales</option><option>Ops</option></select></div></div></div>
    <div class="card card-lg stack"><div class="row between"><h2 class="t-h3">Tasks</h2><span class="t-sm muted">Pick 2–4 · or write your own</span></div>
      <div class="stack" data-options="multi">${[["Write a WhatsApp campaign for store owners", "20 min · Copywriting", true], ["Diagnose a retention drop", "25 min · Funnels", true], ["Plan a ₹1L city launch budget", "20 min · Paid ads", false], ["Write your own task", "Our panel helps you shape it", false]].map(([h, m, on]) => `<button class="option ${on ? "selected" : ""}" aria-pressed="${on}"><div class="row between"><strong>${h}</strong><span class="t-xs muted">${m}</span></div></button>`).join("")}</div></div>
    <div class="card card-lg stack"><h2 class="t-h3">Schedule</h2><div class="grid g3"><div class="field"><label for="h-d">Date</label><input class="input" id="h-d" type="date" value="2026-11-15"></div><div class="field"><label for="h-t">Time (IST)</label><input class="input" id="h-t" type="time" value="19:00"></div><div class="field"><label for="h-c">Max players</label><input class="input" id="h-c" type="number" value="2000"></div></div></div>
    <div class="row between"><a class="btn btn-ghost" href="recruiter.html">Save draft</a><button class="btn btn-primary btn-lg" data-modal="launch-modal">Continue to prizes ${ic("arrow")}</button></div>
  </div>
  <aside class="card card-lg dark stack" style="position:sticky;top:88px"><div class="label" style="color:#9DB1FF">Estimate</div>
    <div class="list t-sm" style="border-color:#2A2B30">${[["Expected players", "1,600–2,000"], ["Elite+ finishers", "~140"], ["Interviews you'll get", "Top 20"], ["Cost", "Included in Growth"]].map(([l, v]) => `<div style="border-color:#2A2B30"><span class="muted">${l}</span><span class="mono">${v}</span></div>`).join("")}</div>
    <p class="t-xs muted">Your brand appears to every participant — most hosts also see a lift in inbound applications.</p></aside>
</div>
<div class="modal" id="launch-modal" role="dialog" aria-modal="true" aria-labelledby="lh-h"><div class="card card-lg stack"><h2 class="t-h2" id="lh-h">Sent for panel review</h2><p class="muted">Our practitioner panel reviews your tasks within 48 hours. You'll get a preview link to try the tournament yourself before it goes live.</p><button class="btn btn-primary" data-close-modal data-toast="Draft submitted for review">Done</button></div></div>
<style>@media(max-width:960px){.section-sm>.grid{grid-template-columns:1fr!important}.section-sm aside.card{position:static!important}}</style>`);

// ---------- Screen map ----------
const GROUPS = [
  ["Marketing site", "Logged-out pages a professor or investor sees first", [["index.html", "Landing", "Existing · rebuilt"], ["how-it-works.html", "How it works", "New"], ["tournaments.html", "Tournaments", "New"], ["leaderboard.html", "Leaderboard", "New"], ["employers.html", "For employers", "New"], ["pricing.html", "Pricing", "New"], ["about.html", "About", "Existing · rebuilt"], ["contact.html", "Contact & support", "Existing · rebuilt"], ["terms.html", "Terms", "Existing · rebuilt"], ["privacy.html", "Privacy", "Existing · rebuilt"]]],
  ["Sign-up & onboarding", "From stranger to registered competitor in ~2 minutes", [["signup.html", "Sign up", "Existing · rebuilt"], ["login.html", "Log in (candidate / recruiter)", "Existing · rebuilt"], ["forgot-password.html", "Reset password (3 steps)", "Existing · rebuilt"], ["onboarding-1.html", "Onboarding 1 · Field", "Existing · rebuilt"], ["onboarding-2.html", "Onboarding 2 · Skills", "Existing · rebuilt"], ["onboarding-3.html", "Onboarding 3 · First tournament", "Existing · rebuilt"]]],
  ["Compete — the core loop", "Tournament → live arena → results → drills", [["dashboard.html", "Dashboard (role switcher)", "Merged 5 → 1"], ["arena.html", "Tournaments (in-app)", "New"], ["tournament.html", "Tournament details", "New"], ["live.html", "Live arena", "Existing · rebuilt"], ["results.html", "Results & rank-up", "Existing · rebuilt"], ["drills.html", "Drills (replaces courses)", "New"], ["leaderboard-app.html", "Leaderboard (with you)", "New"]]],
  ["Get hired", "Rank becomes the resume", [["jobs.html", "Jobs", "Existing · rebuilt"], ["job.html", "Job details + apply", "Existing · rebuilt"], ["applications.html", "Application tracker", "New"], ["profile.html", "Profile / rank card", "Existing · rebuilt"], ["messages.html", "Messages", "Merged 2 → 1"], ["notifications.html", "Notifications", "New"], ["network.html", "Rank feed", "Existing · rebuilt"], ["companies.html", "Company reviews", "Existing · rebuilt"], ["settings.html", "Settings & privacy", "Merged 3 → 1"]]],
  ["Employer side", "How the platform makes money", [["recruiter.html", "Recruiter talent search", "New"], ["host-tournament.html", "Host a hiring tournament", "New"]]],
  ["System states", "Edge cases a real product has to handle", [["applications-empty.html", "Empty state", "Merged 2 → 1"], ["loading.html", "Loading skeleton", "Existing · rebuilt"], ["offline.html", "Connection lost (mid-tournament)", "Existing · rebuilt"], ["404.html", "404", "Merged 2 → 1"]]],
];
const map = barePage({
  title: "Screen map",
  body: `
<section class="hero" style="padding-bottom:var(--s7)"><div class="container stack">
  <span class="badge amber">Prototype</span>
  <h1 class="t-display">Screen map</h1>
  <p class="lead">Every screen in the Rank Culture prototype. ${GROUPS.reduce((n, g) => n + g[2].length, 0)} screens, one design system. Click any to open it.</p>
  <div class="row t-sm"><span class="badge">Existing · rebuilt</span><span class="muted">from your Stitch MVP</span><span class="badge blue">New</span><span class="muted">added to complete the flows</span><span class="badge green">Merged</span><span class="muted">duplicates combined</span></div>
</div></section>
<section class="section"><div class="container stack-lg">
  <div class="card dark card-lg"><div class="grid g4">
    <div><div class="label" style="color:#9DB1FF">Fonts</div><p class="t-sm mt1">Space Grotesk · Inter · JetBrains Mono (scores only)</p></div>
    <div><div class="label" style="color:#9DB1FF">Type scale</div><p class="mono t-sm mt1">64 · 40 · 28 · 20 · 16 · 14 · 12</p></div>
    <div><div class="label" style="color:#9DB1FF">Colour</div><div class="row mt1">${["#0B0B0C", "#FAFAF8", "#2D50CD", "#12805C", "#A86200", "#BA1A1A"].map(c => `<span title="${c}" style="width:24px;height:24px;background:${c};border:1px solid #fff"></span>`).join("")}</div></div>
    <div><div class="label" style="color:#9DB1FF">Logo</div><div class="mt1">${logo("index.html", true)}</div></div>
  </div></div>
  ${GROUPS.map(([h, p, items]) => `<div><div class="sec-head" style="margin-bottom:var(--s5)"><div><h2 class="t-h2">${h}</h2><p class="t-sm muted">${p}</p></div><span class="mono t-sm">${items.length}</span></div>
    <div class="grid g4">${items.map(([href, l, s]) => `<a class="card hover stack" href="${href}"><span class="badge ${s === "New" ? "blue" : s.startsWith("Merged") ? "green" : ""}">${s}</span><strong>${l}</strong><span class="mono t-xs muted">/${href}</span></a>`).join("")}</div></div>`).join("")}
  <div class="card soft card-lg"><h2 class="t-h3">Suggested demo path (5 minutes)</h2><p class="t-sm mt1">Landing → Sign up → Onboarding 1–3 → Dashboard → Tournament details → Live arena → Results → Drills → Jobs → Apply → Applications → Recruiter talent search</p><a class="btn btn-primary mt2" href="index.html">Start the demo</a></div>
</div></section>`,
});

module.exports = { pages: { "recruiter.html": recruiter, "host-tournament.html": host, "map.html": map } };
