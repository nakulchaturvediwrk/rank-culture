const { appPage, barePage, ic, bar, pageHead, tierBadge, ME } = require("./layout");
const { TOURNAMENTS, catLabel, tournamentCard, leaderTable } = require("./pages-public");

// ---------- Dashboard (merges the 5 role dashboards into one with a switcher) ----------
const ROLES = {
  marketing: { label: "Growth Marketing", score: 742, pct: "Top 8%", skills: [["Copywriting", 88], ["Funnel analysis", 71], ["Paid ads", 64], ["SEO", 52]], weak: "SEO", trend: [612, 640, 655, 671, 690, 700, 698, 715, 724, 731, 738, 742] },
  data: { label: "Data Analytics", score: 618, pct: "Top 22%", skills: [["SQL", 74], ["Excel", 81], ["Dashboards", 58], ["Statistics", 41]], weak: "Statistics", trend: [480, 501, 520, 533, 550, 561, 570, 584, 590, 602, 611, 618] },
  product: { label: "Product", score: 0, pct: "Unranked", skills: [], weak: "", trend: [] },
};

const roleBlock = (key, r, hidden) => r.score === 0 ? `
<div data-role="${key}" class="${hidden ? "hide" : ""}">
  <div class="empty"><div class="icon">${ic("target")}</div><h2 class="t-h2">Not ranked in ${r.label} yet</h2><p class="muted t-sm" style="max-width:44ch">Enter one Product tournament to get your starting rank. The next one is Product Teardown Clash on Wed 29 Oct.</p><a class="btn btn-primary" href="tournament.html">Register for Product Teardown Clash</a></div>
</div>` : `
<div data-role="${key}" class="${hidden ? "hide" : ""} stack-lg">
  <div class="grid g3">
    <div class="card card-lg span2">
      <div class="card-head"><div><div class="label muted">Your rank · ${r.label}</div><div class="row mt1">${tierBadge(r.score)}<span class="label blue">${r.pct} in India</span></div></div><a class="link" href="profile.html">Share rank →</a></div>
      <div class="row between" style="align-items:flex-end">
        <div class="score"><span class="num">${r.score}</span><span class="of">/1000</span></div>
        <div style="display:flex;gap:4px;align-items:flex-end;height:80px" aria-label="Score trend, last 12 weeks">${r.trend.map((v, i) => `<div style="width:12px;height:${Math.round(((v - r.trend[0] + 20) / (r.trend[11] - r.trend[0] + 20)) * 80)}px;background:${i === 11 ? "var(--blue)" : "var(--ink)"}"></div>`).join("")}</div>
      </div>
      <div class="row t-sm mt2"><span class="green">${ic("up")}</span><span><strong class="mono">+${r.score - r.trend[0]}</strong> in 12 weeks · <strong>${800 - r.score}</strong> points to Elite</span></div>
    </div>
    <div class="card card-lg dark stack">
      <div class="label" style="color:#9DB1FF">Your weakest skill</div>
      <div class="t-h2">${r.weak}</div>
      <p class="muted t-sm">This is what's holding your rank back. 3 drills could add ~25 points.</p>
      <a class="btn btn-primary btn-block" href="drills.html">Start a ${r.weak} drill</a>
    </div>
  </div>
  <div class="grid g2">
    <div class="card card-lg">
      <div class="card-head"><h2 class="t-h3">Skill breakdown</h2><span class="badge">Verified</span></div>
      <div class="stack">${r.skills.map(([s, v]) => `<div><div class="row between t-sm"><span>${s}</span><span class="mono">${v}/100</span></div>${bar(v, s === r.weak ? "blue" : "")}</div>`).join("")}</div>
    </div>
    <div class="card card-lg">
      <div class="card-head"><h2 class="t-h3">Fast-track tracker</h2><a class="link" href="applications.html">All →</a></div>
      <div class="list t-sm">
        <div><span><strong>Kirana Club</strong><br><span class="muted">Growth Associate</span></span><span class="badge green">Interview Thu</span></div>
        <div><span><strong>Bluepine Foods</strong><br><span class="muted">Performance Marketer</span></span><span class="badge amber">In review</span></div>
        <div><span><strong>Loop Health</strong><br><span class="muted">Marketing Analyst</span></span><span class="badge">Applied</span></div>
      </div>
    </div>
  </div>
</div>`;

const dashboard = appPage({
  title: "Dashboard",
  active: "dashboard.html",
  body: `
<div class="banner blue mb3 hide" id="welcome"><span><strong>You're in, Aarav.</strong> You're registered for Growth Marketing Cup on Saturday. We'll remind you 1 hour before.</span><button class="btn btn-sm" onclick="this.parentElement.remove()">Got it</button></div>
<script>if(location.search.includes('welcome'))document.getElementById('welcome').classList.remove('hide')</script>
${pageHead("Good evening, Aarav", "Dashboard", "", `<label class="sr" for="role-sw">Field</label><select class="input" id="role-sw" data-role-switch style="width:auto;min-height:44px"><option value="marketing">Growth Marketing</option><option value="data">Data Analytics</option><option value="product">Product (unranked)</option></select><a class="btn btn-primary" href="arena.html">${ic("trophy")} Compete</a>`)}
${Object.entries(ROLES).map(([k, r], i) => roleBlock(k, r, i > 0)).join("")}
<div class="mt4">
  <div class="sec-head" style="margin-bottom:var(--s5)"><h2 class="t-h2">Upcoming for you</h2><a class="link" href="arena.html">All tournaments →</a></div>
  <div class="grid g3">${TOURNAMENTS.filter(t => t.status !== "ended").slice(0, 3).map(t => tournamentCard(t, t.status === "live" ? "live.html" : "tournament.html")).join("")}</div>
</div>
<div class="grid g2 mt4">
  <div class="card card-lg">
    <div class="card-head"><h2 class="t-h3">Jobs matching your rank</h2><a class="link" href="jobs.html">See 24 →</a></div>
    <div class="list t-sm">
      ${[["Growth Associate", "Kirana Club · Bengaluru", "8–12 LPA", 700], ["Performance Marketer", "Bluepine Foods · Mumbai", "10–14 LPA", 720], ["Content Lead", "Paperlane · Remote", "12–16 LPA", 780]].map(([r, c, s, min]) => `<div><span><a href="job.html"><strong>${r}</strong></a><br><span class="muted">${c}</span></span><span style="text-align:right"><span class="mono">${s}</span><br><span class="t-xs ${742 >= min ? "green" : "amber"}">${742 >= min ? "You qualify" : `Need ${min}`}</span></span></div>`).join("")}
    </div>
  </div>
  <div class="card card-lg">
    <div class="card-head"><h2 class="t-h3">Rank feed</h2><a class="link" href="network.html">More →</a></div>
    <div class="list t-sm">
      <div><span><strong>Riya S.</strong> hit #1 in Growth Marketing</span><span class="t-xs muted">2h</span></div>
      <div><span><strong>Kirana Club</strong> hired 4 from SQL Sprint</span><span class="t-xs muted">5h</span></div>
      <div><span>You passed <strong>412 people</strong> this week</span><span class="t-xs muted">1d</span></div>
    </div>
  </div>
</div>`,
});

// ---------- Tournaments (in app) ----------
const arena = appPage({
  title: "Tournaments",
  active: "arena.html",
  body: `
${pageHead("Compete", "Tournaments", "Free to enter. Real work. Top finishers win interview fast-tracks.", `<a class="btn" href="results.html">My past results</a>`)}
<div class="tabs mb3" data-tabs role="tablist"><button class="on" data-tab="t-all" role="tab" aria-selected="true">All</button><button data-tab="t-mine" role="tab" aria-selected="false">Registered (2)</button></div>
<div id="t-all">
  <div class="row mb3" data-filter-group="#a-grid" role="group" aria-label="Filter">
    <button class="chip on" data-value="all" aria-pressed="true">All</button><button class="chip" data-value="live" aria-pressed="false">Live now</button>
    ${Object.entries(catLabel).map(([k, v]) => `<button class="chip" data-value="${k}" aria-pressed="false">${v}</button>`).join("")}
  </div>
  <div class="grid g3" id="a-grid">${TOURNAMENTS.map(t => tournamentCard(t, t.status === "live" ? "live.html" : "tournament.html")).join("")}
    <div class="empty hide span2" data-empty><div class="icon">${ic("trophy")}</div><h3 class="t-h3">Nothing here this week</h3><p class="muted t-sm">Try another field, or get notified when one drops.</p><button class="btn" data-toast="We'll notify you">Notify me</button></div>
  </div>
</div>
<div id="t-mine" class="hide grid g3">${[TOURNAMENTS[0], TOURNAMENTS[1]].map(t => tournamentCard(t)).join("")}</div>`,
});

// ---------- Tournament details ----------
const t = TOURNAMENTS[0];
const tournament = appPage({
  title: t.name,
  active: "arena.html",
  body: `
<a class="link" href="arena.html">${ic("back")} All tournaments</a>
<div class="grid mt3" style="grid-template-columns:minmax(0,1fr) 360px;gap:var(--s6);align-items:start">
  <div class="stack-lg">
    <div class="card card-lg stack">
      <div class="row"><span class="badge">Marketing</span><span class="badge green">Registration open</span><span class="badge">Season 3 · Week 6</span></div>
      <h1 class="t-h1">${t.name}</h1>
      <p class="lead">Three real tasks from three D2C brands. You'll get the same brief their marketing team got last quarter, anonymised.</p>
      <div class="grid g4 mt2">
        ${[["When", "Sat 25 Oct", "7:00 PM IST"], ["Duration", "60 min", "3 tasks"], ["Registered", "2,418", "of 3,000"], ["Entry", "Free", "Webcam needed"]].map(([l, v, s]) => `<div><div class="label muted">${l}</div><div class="mono t-h3 mt1">${v}</div><div class="t-xs muted">${s}</div></div>`).join("")}
      </div>
    </div>
    <div class="card card-lg">
      <h2 class="t-h3 mb2">The three tasks</h2>
      <div class="list">${[["Write the launch email", "20 min · 300 pts", "A new protein bar launches Monday. Write the email that goes to 80,000 subscribers."], ["Find the funnel leak", "25 min · 400 pts", "Landing → cart is fine; cart → pay drops 70%. Here's the data. Why, and what do you fix first?"], ["Pick the winning ad", "15 min · 300 pts", "Four ad variants, real results from week one. Pick the winner and justify the budget split."]]
        .map(([h, m, p], i) => `<div style="align-items:flex-start"><span class="mono t-h2 blue" style="width:48px">0${i + 1}</span><div style="flex:1"><div class="row between"><strong class="t-body">${h}</strong><span class="mono t-xs muted">${m}</span></div><p class="t-sm muted mt1">${p}</p></div></div>`).join("")}</div>
    </div>
    <div class="card card-lg">
      <h2 class="t-h3 mb2">Prizes</h2>
      <div class="grid g3">
        <div class="card dark"><div class="label" style="color:#9DB1FF">Top 20</div><p class="t-sm mt1">Interview fast-track at all 6 partner companies + share of ₹50,000</p></div>
        <div class="card blue"><div class="label">Top 10%</div><p class="t-sm mt1">Fast-track at 2 companies of your choice</p></div>
        <div class="card"><div class="label">Everyone</div><p class="t-sm mt1 muted">Verified score, full breakdown, rank points</p></div>
      </div>
    </div>
    <div class="card card-lg">
      <h2 class="t-h3 mb2">Hiring through this tournament</h2>
      <div class="grid g3 t-sm">${["Kirana Club", "Bluepine Foods", "Paperlane", "Haldi & Co", "Northwind D2C", "Saltpan Labs"].map(c => `<div class="row" style="border:var(--border-thin);padding:var(--s3)"><span class="avatar">${c.split(" ").map(w => w[0]).join("")}</span><strong>${c}</strong></div>`).join("")}</div>
      <p class="t-xs muted mt2">Fictional company names for the prototype.</p>
    </div>
    <div class="card card-lg"><h2 class="t-h3 mb2">Rules</h2><ul class="stack t-sm" style="padding-left:20px"><li>Webcam on throughout. Tab switches are logged.</li><li>No AI tools unless a task says so. Plagiarism is auto-checked.</li><li>Late joins get the remaining time only.</li><li>Scores publish within 48 hours after human review.</li></ul></div>
  </div>
  <aside class="card card-lg stack" style="position:sticky;top:88px">
    <div class="label muted">Starts in</div>
    <div class="timer" data-countdown="${6 * 86400 / 6 * 1 + 4 * 3600 + 1240}">—</div>
    <div>${bar(81, "blue")}<div class="t-xs muted mt1">582 spots left</div></div>
    <button class="btn btn-primary btn-lg btn-block" id="reg-btn" onclick="this.textContent='Registered ✓';this.classList.replace('btn-primary','btn-dark');toast('Registered — reminder set for 6:00 PM')">Register free</button>
    <a class="btn btn-block" href="live.html">Try the arena (demo)</a>
    <div class="list t-sm"><div><span class="muted">Your current rank</span><span class="mono">742</span></div><div><span class="muted">Fast-track at</span><span class="mono">Top 10%</span></div><div><span class="muted">You need</span><span class="mono">~810</span></div></div>
    <a class="link t-sm" href="drills.html">Warm up with a drill →</a>
  </aside>
</div>
<style>@media(max-width:960px){.main>.grid{grid-template-columns:1fr!important}.main aside.card{position:static!important}}</style>`,
});

// ---------- Live arena ----------
const live = barePage({
  title: "Live: Growth Marketing Cup",
  header: "app",
  active: "arena.html",
  body: `
<div class="arena-top"><div class="container">
  <div><div class="label" style="color:#9DB1FF">Growth Marketing Cup · Live</div><div class="t-sm">Task <span id="q-num">1</span> of 4</div></div>
  <div class="q-dots" aria-label="Questions">${[1, 2, 3, 4].map(n => `<span role="button" tabindex="0">${n}</span>`).join("")}</div>
  <div class="row"><span class="badge red live">Proctored</span><div class="timer" data-countdown="2834" data-on-end="results.html" aria-live="off">47:14</div></div>
</div></div>
<div class="container section-sm" data-arena style="max-width:960px">
  <div class="q stack-lg">
    <div class="stack"><div class="row"><span class="badge">Task 1 · Copywriting</span><span class="mono t-xs muted">300 pts</span></div><h1 class="t-h2">Which subject line should go to 80,000 subscribers?</h1>
      <p class="muted">Context: a new protein bar ("Haldi Crunch") launches Monday. Last 5 launch emails averaged 18% open rate. Audience: 22–34, mostly gym-goers in metros.</p></div>
    <div class="stack" data-options="single">
      ${["Introducing Haldi Crunch — our newest protein bar", "Your 4 PM slump called. It wants Haldi Crunch.", "NEW LAUNCH!!! 20% OFF HALDI CRUNCH TODAY ONLY", "We made a protein bar that tastes like dadi's haldi doodh"].map((o, i) => `<button class="option" aria-pressed="false"><span class="key">${"ABCD"[i]}</span>${o}</button>`).join("")}
    </div>
  </div>
  <div class="q stack-lg hide">
    <div class="stack"><div class="row"><span class="badge">Task 2 · Funnel analysis</span><span class="mono t-xs muted">400 pts</span></div><h1 class="t-h2">Where is the funnel leaking?</h1></div>
    <div class="table-wrap"><table><thead><tr><th>Step</th><th style="text-align:right">Users</th><th style="text-align:right">Drop</th></tr></thead><tbody>
      <tr><td>Landing page</td><td class="mono" style="text-align:right">42,000</td><td></td></tr><tr><td>Product page</td><td class="mono" style="text-align:right">18,900</td><td class="mono" style="text-align:right">55%</td></tr><tr><td>Add to cart</td><td class="mono" style="text-align:right">6,050</td><td class="mono" style="text-align:right">68%</td></tr><tr><td>Checkout started</td><td class="mono" style="text-align:right">5,320</td><td class="mono" style="text-align:right">12%</td></tr><tr><td>Payment success</td><td class="mono red" style="text-align:right">1,590</td><td class="mono red" style="text-align:right">70%</td></tr>
    </tbody></table></div>
    <p class="muted t-sm">Note: 64% of checkout traffic is mobile. COD was removed 3 weeks ago.</p>
    <div class="stack" data-options="single">
      ${["The product page — 55% drop is the biggest leak", "Add-to-cart — the price is probably too high", "Payment — COD removal is hurting mobile buyers", "Landing page — traffic quality is poor"].map((o, i) => `<button class="option" aria-pressed="false"><span class="key">${"ABCD"[i]}</span>${o}</button>`).join("")}
    </div>
  </div>
  <div class="q stack-lg hide">
    <div class="stack"><div class="row"><span class="badge">Task 2b · Written answer</span><span class="mono t-xs muted">Human-reviewed</span></div><h1 class="t-h2">What would you fix first, and how will you know it worked?</h1><p class="muted">3–5 sentences. Be specific. Reviewers score clarity, reasoning and measurability.</p></div>
    <textarea class="input" style="min-height:220px" placeholder="Type your answer…"></textarea>
    <div class="row between t-xs muted"><span>${ic("shield")} Autosaved every 10 seconds</span><span>AI tools not allowed for this task</span></div>
  </div>
  <div class="q stack-lg hide">
    <div class="stack"><div class="row"><span class="badge">Task 3 · Paid ads</span><span class="mono t-xs muted">300 pts</span></div><h1 class="t-h2">₹2 lakh budget. Which ad gets the most?</h1></div>
    <div class="table-wrap"><table><thead><tr><th>Ad</th><th style="text-align:right">CTR</th><th style="text-align:right">CPC</th><th style="text-align:right">Conv. rate</th><th style="text-align:right">CPA</th></tr></thead><tbody>
      <tr><td>A · Gym reel</td><td class="mono" style="text-align:right">2.1%</td><td class="mono" style="text-align:right">₹9</td><td class="mono" style="text-align:right">1.8%</td><td class="mono" style="text-align:right">₹500</td></tr>
      <tr><td>B · Office snack</td><td class="mono" style="text-align:right">1.4%</td><td class="mono" style="text-align:right">₹7</td><td class="mono" style="text-align:right">3.2%</td><td class="mono" style="text-align:right">₹219</td></tr>
      <tr><td>C · Influencer</td><td class="mono" style="text-align:right">3.6%</td><td class="mono" style="text-align:right">₹14</td><td class="mono" style="text-align:right">1.1%</td><td class="mono" style="text-align:right">₹1,273</td></tr>
      <tr><td>D · Dadi recipe</td><td class="mono" style="text-align:right">2.8%</td><td class="mono" style="text-align:right">₹8</td><td class="mono" style="text-align:right">2.4%</td><td class="mono" style="text-align:right">₹333</td></tr>
    </tbody></table></div>
    <div class="stack" data-options="single">
      ${["Ad C — highest CTR means most attention", "Ad B — lowest cost per acquisition", "Split 60/40 between B and D to keep learning", "Ad A — gym audience fits the product best"].map((o, i) => `<button class="option" aria-pressed="false"><span class="key">${"ABCD"[i]}</span>${o}</button>`).join("")}
    </div>
  </div>
  <div class="row between bt mt4" style="padding-top:var(--s5)">
    <button class="btn" id="q-prev">${ic("back")} Previous</button>
    <div class="row"><button class="btn btn-ghost" data-modal="leave-modal">Leave</button><button class="btn btn-dark" id="q-next">Next ${ic("arrow")}</button><button class="btn btn-primary hide" id="q-submit" data-modal="submit-modal">Submit tournament</button></div>
  </div>
</div>
<div class="modal" id="submit-modal" role="dialog" aria-modal="true" aria-labelledby="sm-h"><div class="card card-lg stack">
  <h2 class="t-h2" id="sm-h">Submit your answers?</h2><p class="muted">You can't change answers after submitting. Unanswered tasks score zero.</p>
  <div class="row"><button class="btn" data-close-modal>Keep working</button><a class="btn btn-primary" href="results.html">Submit</a></div>
</div></div>
<div class="modal" id="leave-modal" role="dialog" aria-modal="true" aria-labelledby="lm-h"><div class="card card-lg stack">
  <h2 class="t-h2" id="lm-h">Leave the tournament?</h2><p class="muted">The timer keeps running. Your saved answers will be submitted when time ends.</p>
  <div class="row"><button class="btn" data-close-modal>Stay</button><a class="btn btn-dark" href="dashboard.html">Leave</a></div>
</div></div>
<a class="hide" href="offline.html" id="sim-offline">Simulate connection loss</a>`,
});

// ---------- Results ----------
const results = appPage({
  title: "Results",
  active: "arena.html",
  body: `
<div class="card dark card-lg mb3" style="box-shadow:8px 8px 0 var(--blue)">
  <div class="grid g2" style="align-items:center;gap:var(--s7)">
    <div class="stack">
      <div class="label" style="color:#9DB1FF">Growth Marketing Cup · Final result</div>
      <div class="score"><span class="num">812</span><span class="of">/1000</span></div>
      <div class="row"><span class="badge blue">Elite — rank up!</span><span class="label" style="color:#9DB1FF">#214 of 2,418 · Top 9%</span></div>
      <p class="muted">You moved from Challenger to <strong style="color:#fff">Elite</strong>. You've won fast-tracks at 2 companies of your choice.</p>
    </div>
    <div class="stack">
      <div class="row between t-sm"><span>Previous</span><span class="mono">742</span></div>
      <div class="row between t-sm"><span>This tournament</span><span class="mono" style="color:#9DB1FF">+70</span></div>
      <div class="bar" style="border-color:#fff;background:transparent;height:16px"><i style="width:81%;background:var(--blue)"></i></div>
      <div class="row between t-xs muted"><span>Challenger 650</span><span>Elite 800</span><span>Legend 900</span></div>
    </div>
  </div>
</div>
<div class="grid g3">
  <div class="card card-lg span2">
    <h2 class="t-h3 mb2">Task-by-task</h2>
    <div class="list">
      ${[["Write the launch email", 280, 300, "Strong hook and clear CTA. Lost points: subject line ran over 50 characters on mobile."], ["Find the funnel leak", 312, 400, "Correctly spotted the COD issue. Your fix lacked a success metric — reviewers want a number and a timeframe."], ["Pick the winning ad", 220, 300, "Good call on B, but the 60/40 split with D would have kept learning. Top scorers hedged."]]
        .map(([h, s, m, fb]) => `<div style="flex-direction:column;align-items:stretch;gap:var(--s2)"><div class="row between"><strong>${h}</strong><span class="mono">${s}/${m}</span></div>${bar(Math.round(s / m * 100), s / m > .85 ? "blue" : "")}<p class="t-sm muted">${fb}</p></div>`).join("")}
    </div>
  </div>
  <div class="stack">
    <div class="card card-lg stack"><h2 class="t-h3">Claim your fast-tracks</h2><p class="t-sm muted">Pick 2 companies. They'll invite you to interview within 7 days.</p>
      <div class="stack" data-options="multi">${["Kirana Club", "Bluepine Foods", "Paperlane", "Haldi & Co"].map(c => `<button class="option" style="padding:var(--s3)" aria-pressed="false"><strong class="t-sm">${c}</strong></button>`).join("")}</div>
      <button class="btn btn-primary btn-block" data-toast="Fast-tracks claimed — check Applications">Claim fast-tracks</button></div>
    <div class="card stack"><h2 class="t-h3">Close the gap</h2><p class="t-sm muted">Measurable goals cost you 88 points. One drill fixes that.</p><a class="btn btn-block" href="drills.html">Do the drill</a></div>
    <div class="card stack"><button class="btn btn-block" data-toast="Rank card copied — share on LinkedIn">${ic("send")} Share my rank card</button><button class="btn btn-ghost btn-block" data-toast="Dispute form opened (prototype)">Dispute a score</button></div>
  </div>
</div>`,
});

// ---------- Drills ----------
const drills = appPage({
  title: "Drills",
  active: "drills.html",
  body: `
${pageHead("No courses. Just reps.", "Drills", "15-minute real tasks, picked from your weakest skills. Each one is scored and adds points to your rank.", `<span class="badge">3 of 3 free drills left this week</span>`)}
<div class="card dark card-lg mb3"><div class="grid g2" style="align-items:center">
  <div class="stack"><div class="label" style="color:#9DB1FF">Recommended for you</div><h2 class="t-h2">SEO is costing you the most points</h2><p class="muted t-sm">You scored 52/100 on SEO — 30 below Elite average. These 3 drills target exactly that.</p></div>
  <div class="row" style="justify-content:flex-end"><a class="btn btn-primary btn-lg" href="live.html">Start drill 1 of 3</a></div>
</div></div>
<div class="row mb3" data-filter-group="#d-grid" role="group" aria-label="Filter drills">
  ${[["all", "All"], ["weak", "My weak spots"], ["seo", "SEO"], ["copy", "Copywriting"], ["data", "Funnels & data"], ["ads", "Paid ads"]].map(([v, l], i) => `<button class="chip ${i === 0 ? "on" : ""}" data-value="${v}" aria-pressed="${i === 0}">${l}</button>`).join("")}
</div>
<div class="grid g3" id="d-grid">
  ${[["seo weak", "Fix a page that ranks #14", "SEO", "15 min", "+8–12", "You get a real product page and its Search Console data. Rewrite the title, H1 and meta to move it up."],
     ["seo weak", "Keyword map for a D2C brand", "SEO", "15 min", "+6–10", "Group 40 search terms into pages. Decide which one each page should own."],
     ["data weak", "Write a measurable goal", "Funnels & data", "10 min", "+5–8", "Turn 3 vague fixes into goals with a metric, a target and a date."],
     ["copy", "Rewrite a failing push notification", "Copywriting", "10 min", "+4–6", "A push with 0.8% CTR. Write three that beat it."],
     ["ads", "Cut a ₹50k budget by 30%", "Paid ads", "15 min", "+6–9", "Five campaigns, one spreadsheet. Decide what to pause."],
     ["data", "Cohort retention in Sheets", "Funnels & data", "15 min", "+7–10", "Build a retention table from raw orders. Spot the drop-off week."]]
    .map(([cat, h, sk, d, pts, p]) => `<article class="card hover stack" data-cat="${cat}"><div class="row between"><span class="badge">${sk}</span><span class="mono t-sm green">${pts} pts</span></div><h3 class="t-h3">${h}</h3><p class="t-sm muted">${p}</p><div class="row between mt1"><span class="t-xs muted">${ic("clock")} ${d}</span><a class="btn btn-sm btn-dark" href="live.html">Start</a></div></article>`).join("")}
  <div class="empty hide span2" data-empty><div class="icon">${ic("bolt")}</div><h3 class="t-h3">No drills here</h3></div>
</div>
<div class="banner mt4"><span><strong>Why no courses?</strong> Watching videos doesn't move your rank. Doing the work does. Every drill is a task someone does in their first 90 days on the job.</span><a class="btn btn-sm" href="pricing.html?from=app">Unlimited drills with Pro</a></div>`,
});

module.exports = { pages: { "dashboard.html": dashboard, "arena.html": arena, "tournament.html": tournament, "live.html": live, "results.html": results, "drills.html": drills } };
