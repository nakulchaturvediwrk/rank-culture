// Shared layout pieces. Every page goes through these so the logo,
// nav, fonts and sizes can never drift between screens again.

const LOGO_MARK = `<svg viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" fill="#0B0B0C"/><rect x="5" y="16" width="4.5" height="7" fill="#fff"/><rect x="11.75" y="11" width="4.5" height="12" fill="#fff"/><rect x="18.5" y="5" width="4.5" height="18" fill="#2D50CD"/></svg>`;
const LOGO_MARK_DARK = `<svg viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" fill="#fff"/><rect x="5" y="16" width="4.5" height="7" fill="#0B0B0C"/><rect x="11.75" y="11" width="4.5" height="12" fill="#0B0B0C"/><rect x="18.5" y="5" width="4.5" height="18" fill="#2D50CD"/></svg>`;

const logo = (href = "index.html", dark = false) =>
  `<a class="logo${dark ? " on-dark" : ""}" href="${href}" aria-label="Rank Culture home">${dark ? LOGO_MARK_DARK : LOGO_MARK}<span>Rank Culture</span></a>`;

// Stroke icons, 24px grid
const P = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v2a3 3 0 0 0 4 3M16 6h4v2a3 3 0 0 1-4 3M12 13v4M8 21h8M9 17h6"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  brief: '<path d="M3 8h18v12H3zM8 8V5h8v3M3 13h18"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  mail: '<path d="M3 5h18v14H3zM3 6l9 7 9-7"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  x: '<path d="M5 5l14 14M19 5L5 19"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c.8-3.5 3.5-5 7-5s6.2 1.5 7 5M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .6 3.4 2.2 4 5"/>',
  flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
  lock: '<rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  star: '<path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  up: '<path d="M4 17l6-6 4 4 7-8M15 7h6v6"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0M12 20h.01"/>',
  file: '<path d="M6 2h9l5 5v15H6zM14 2v6h6"/>',
  send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
  logout: '<path d="M9 21H4V3h5M16 17l5-5-5-5M21 12H9"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  medal: '<circle cx="12" cy="15" r="6"/><path d="M8 3l4 6 4-6M12 12.5v5M10 15h4"/>',
};
const ic = (name, cls = "icon") =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">${P[name]}</svg>`;

const head = (title, desc) => `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — Rank Culture</title>
<meta name="description" content="${desc || "Rank Culture — fight to get hired, not in the traditional way. Compete in skill tournaments, earn a verified rank, get hired on proof."}">
<meta property="og:title" content="${title} — Rank Culture">
<meta property="og:description" content="Compete in real-work skill tournaments. Earn a verified rank. Get hired on proof, not paper.">
<meta name="theme-color" content="#0B0B0C">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/styles.css">
<script src="assets/shell.js"></script>
</head>`;

// ---------- Public (logged-out) header ----------
const publicNav = [
  ["how-it-works.html", "How it works"],
  ["tournaments.html", "Tournaments"],
  ["leaderboard.html", "Leaderboard"],
  ["employers.html", "For employers"],
  ["pricing.html", "Pricing"],
];
const publicHeader = (active) => `
<header class="header"><div class="container">
  ${logo()}
  <nav class="nav" aria-label="Main">${publicNav.map(([h, l]) => `<a href="${h}"${h === active ? ' class="active" aria-current="page"' : ""}>${l}</a>`).join("")}</nav>
  <div class="header-actions">
    <a class="btn btn-ghost btn-sm hide-m" href="login.html">Log in</a>
    <a class="btn btn-primary btn-sm hide-m" href="signup.html">Get ranked free</a>
    <button class="icon-btn menu-btn" data-open-drawer aria-label="Open menu">${ic("menu")}</button>
  </div>
</div></header>
<div class="drawer" id="drawer" aria-hidden="true"><div class="drawer-bg" data-close-drawer></div>
<div class="drawer-panel" role="dialog" aria-label="Menu">
  <div class="row between mb2">${logo()}<button class="icon-btn" data-close-drawer aria-label="Close menu">${ic("x")}</button></div>
  ${publicNav.map(([h, l]) => `<a class="dl" href="${h}">${l}</a>`).join("")}
  <a class="dl" href="about.html">About</a>
  <a class="dl" href="map.html">Prototype screen map</a>
  <a class="btn btn-primary btn-block mt3" href="signup.html">Get ranked free</a>
  <a class="btn btn-block mt1" href="login.html">Log in</a>
</div></div>`;

// ---------- App (logged-in candidate) ----------
const ME = { name: "Aarav Mehta", initials: "AM", score: 742, tier: "Challenger", pct: "Top 8%", role: "Growth Marketing" };

const appNav = [
  ["dashboard.html", "Dashboard", "home"],
  ["arena.html", "Tournaments", "trophy"],
  ["drills.html", "Drills", "bolt"],
  ["jobs.html", "Jobs", "brief"],
  ["applications.html", "Applications", "file"],
  ["leaderboard-app.html", "Leaderboard", "chart"],
  ["profile.html", "My profile", "user"],
  ["messages.html", "Messages", "mail", 2],
  ["network.html", "Rank feed", "users"],
];
const appHeader = (active) => `
<header class="header"><div class="container" style="max-width:none">
  ${logo("dashboard.html")}
  <nav class="nav" aria-label="Main">
    ${[["dashboard.html","Dashboard"],["arena.html","Tournaments"],["jobs.html","Jobs"],["leaderboard-app.html","Leaderboard"]].map(([h,l])=>`<a href="${h}"${h===active?' class="active" aria-current="page"':""}>${l}</a>`).join("")}
  </nav>
  <div class="header-actions">
    <a class="btn btn-sm hide-m" href="pricing.html?from=app">Go Pro</a>
    <a class="icon-btn" href="notifications.html" aria-label="Notifications, 3 unread">${ic("bell")}<span class="dot"></span></a>
    <a class="icon-btn hide-m" href="settings.html" aria-label="Settings">${ic("gear")}</a>
    <a class="avatar hide-m" href="profile.html" aria-label="My profile">${ME.initials}</a>
    <button class="icon-btn menu-btn" data-open-drawer aria-label="Open menu">${ic("menu")}</button>
  </div>
</div></header>
<div class="drawer" id="drawer" aria-hidden="true"><div class="drawer-bg" data-close-drawer></div>
<div class="drawer-panel" role="dialog" aria-label="Menu">
  <div class="row between mb2">${logo("dashboard.html")}<button class="icon-btn" data-close-drawer aria-label="Close menu">${ic("x")}</button></div>
  ${appNav.map(([h, l]) => `<a class="dl" href="${h}">${l}</a>`).join("")}
  <a class="dl" href="notifications.html">Notifications</a>
  <a class="dl" href="settings.html">Settings</a>
  <a class="dl" href="map.html">Prototype screen map</a>
  <a class="dl" href="index.html">Log out</a>
</div></div>`;

const sidebar = (active) => `
<aside class="sidebar" aria-label="App navigation">
  <a class="rank-pill" href="profile.html">
    <span class="avatar">${ME.initials}</span>
    <span><span class="label muted">${ME.tier} · ${ME.pct}</span><br><span class="mono">${ME.score}</span><span class="mono muted t-xs"> / 1000</span></span>
  </a>
  <nav class="side-nav">
    ${appNav.map(([h, l, i, c]) => `<a href="${h}"${h === active ? ' class="active" aria-current="page"' : ""}>${ic(i)}${l}${c ? `<span class="count">${c}</span>` : ""}</a>`).join("")}
  </nav>
  <div style="margin-top:auto" class="stack">
    <div class="card dark" style="padding:var(--s4)">
      <div class="label" style="color:#9DB1FF">Next tournament</div>
      <div class="t-sm mt1" style="font-weight:700">Growth Marketing Cup</div>
      <div class="t-xs muted">Sat 25 Oct · 7:00 PM IST</div>
      <a class="btn btn-primary btn-sm btn-block mt2" href="tournament.html">View</a>
    </div>
    <div class="side-nav">
      <a href="settings.html"${active === "settings.html" ? ' class="active"' : ""}>${ic("gear")}Settings</a>
      <a href="contact.html">${ic("mail")}Support</a>
      <a href="index.html">${ic("logout")}Log out</a>
    </div>
  </div>
</aside>`;

const bottomNav = (active) => `
<nav class="bottom-nav" aria-label="Quick navigation">
  ${[["dashboard.html","Home","home"],["arena.html","Compete","trophy"],["drills.html","Drills","bolt"],["jobs.html","Jobs","brief"],["profile.html","Me","user"]]
    .map(([h, l, i]) => `<a href="${h}"${h === active ? ' class="active"' : ""}>${ic(i)}${l}</a>`).join("")}
</nav>`;

const footer = () => `
<footer class="footer"><div class="container">
  <div class="cols">
    <div class="stack">
      ${logo("index.html", true)}
      <p class="t-sm" style="color:#A9ABB5;max-width:36ch">Whoever deserves it gets it. Compete in real-work skill tournaments, earn a verified rank and get hired on proof — not on paper.</p>
    </div>
    <div><h4>Candidates</h4><ul>
      <li><a href="how-it-works.html">How it works</a></li>
      <li><a href="tournaments.html">Tournaments</a></li>
      <li><a href="leaderboard.html">Leaderboard</a></li>
      <li><a href="pricing.html">Pricing</a></li>
    </ul></div>
    <div><h4>Employers</h4><ul>
      <li><a href="employers.html">Hire by rank</a></li>
      <li><a href="recruiter.html">Recruiter console</a></li>
      <li><a href="host-tournament.html">Host a tournament</a></li>
    </ul></div>
    <div><h4>Company</h4><ul>
      <li><a href="about.html">About</a></li>
      <li><a href="contact.html">Contact</a></li>
      <li><a href="terms.html">Terms</a></li>
      <li><a href="privacy.html">Privacy</a></li>
    </ul></div>
  </div>
  <div class="base"><span>© 2026 Rank Culture. Made in India.</span><a href="map.html">Prototype screen map →</a></div>
</div></footer>`;

const scripts = () => `<div class="toast" id="toast" role="status" aria-live="polite"></div>
<a class="proto-flag" href="map.html" title="All prototype screens">Prototype · screen map</a>
<script src="assets/app.js"></script></body></html>`;

// ---------- Page wrappers ----------
// Header, sidebar, bottom nav and footer live once in assets/shell.js
// (generated at build time from the functions above). Pages only call it.
const RC = (fn, active = "") => `<script>RC.${fn}(${JSON.stringify(active)})</script>`;

const publicPage = ({ title, desc, active, body }) =>
  `${head(title, desc)}<body>${RC("pub", active)}<main id="main">${body}</main>${RC("foot")}${scripts()}`;

const appPage = ({ title, active, body }) =>
  `${head(title)}<body>${RC("app", active)}<div class="app">${RC("side", active)}<main class="main" id="main">${body}</main></div>${RC("bottom", active)}${scripts()}`;

const barePage = ({ title, body, header = "public", active = "" }) =>
  `${head(title)}<body>${header === "app" ? RC("app", active) : header === "none" ? "" : RC("pub", active)}<main id="main">${body}</main>${scripts()}`;

// Source for assets/shell.js
const shellJS = () => `/* Generated by build.js — the single source of the logo, nav and footer. */
window.RC = (function () {
  var P = ${JSON.stringify({ pub: publicHeader(""), app: appHeader(""), side: sidebar(""), bottom: bottomNav(""), foot: footer() })};
  function put(key, active) {
    var s = document.currentScript, t = document.createElement("template");
    t.innerHTML = P[key];
    if (active) t.content.querySelectorAll('.nav a, .side-nav a, .bottom-nav a').forEach(function (a) {
      if (a.getAttribute("href") === active) { a.classList.add("active"); a.setAttribute("aria-current", "page"); }
    });
    s.parentNode.insertBefore(t.content, s);
  }
  return { pub: function (a) { put("pub", a); }, app: function (a) { put("app", a); }, side: function (a) { put("side", a); }, bottom: function (a) { put("bottom", a); }, foot: function () { put("foot"); } };
})();
`;

// ---------- Small components ----------
const bar = (pct, cls = "") => `<div class="bar ${cls}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>`;
const pageHead = (eyebrow, title, lead, actions = "") => `
<div class="page-head"><div><div class="label muted">${eyebrow}</div><h1 class="t-h1">${title}</h1>${lead ? `<p class="lead mt1">${lead}</p>` : ""}</div>${actions ? `<div class="row">${actions}</div>` : ""}</div>`;
const tierBadge = (score) => {
  const t = score >= 900 ? ["Legend", "dark"] : score >= 800 ? ["Elite", "blue"] : score >= 650 ? ["Challenger", "green"] : score >= 450 ? ["Contender", "amber"] : ["Rookie", ""];
  return `<span class="badge ${t[1]}">${t[0]}</span>`;
};

module.exports = { shellJS, logo, LOGO_MARK, ic, head, publicPage, appPage, barePage, bar, pageHead, tierBadge, ME, footer };
