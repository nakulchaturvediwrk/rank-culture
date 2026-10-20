const { appPage, barePage, ic, bar, pageHead, tierBadge, ME } = require("./layout");
const { leaderTable } = require("./pages-public");

const JOBS = [
  { role: "Growth Associate", co: "Kirana Club", city: "Bengaluru", sal: "8–12 LPA", min: 700, cat: "marketing", type: "Full-time", fast: true },
  { role: "Performance Marketer", co: "Bluepine Foods", city: "Mumbai", sal: "10–14 LPA", min: 720, cat: "marketing", type: "Full-time", fast: true },
  { role: "Content Lead", co: "Paperlane", city: "Remote", sal: "12–16 LPA", min: 780, cat: "marketing", type: "Full-time", fast: false },
  { role: "Business Analyst", co: "Saltpan Labs", city: "Pune", sal: "7–10 LPA", min: 650, cat: "data", type: "Full-time", fast: true },
  { role: "APM", co: "Northwind D2C", city: "Gurugram", sal: "14–18 LPA", min: 800, cat: "product", type: "Full-time", fast: false },
  { role: "BDR", co: "Ledgerly", city: "Hyderabad", sal: "6–9 LPA + incentives", min: 600, cat: "sales", type: "Full-time", fast: true },
  { role: "Ops Associate", co: "Haldi & Co", city: "Jaipur", sal: "5–8 LPA", min: 600, cat: "ops", type: "Full-time", fast: true },
  { role: "Marketing Intern", co: "Paperlane", city: "Remote", sal: "₹25k / month", min: 500, cat: "marketing", type: "Internship", fast: false },
];
const jobRow = j => `
<article class="card hover" data-cat="${j.cat} ${j.type === "Internship" ? "intern" : "full"} ${ME.score >= j.min ? "qualify" : ""}">
  <div class="row between" style="align-items:flex-start">
    <div class="row" style="align-items:flex-start"><span class="avatar">${j.co.split(" ").map(w => w[0]).join("").slice(0, 2)}</span><div><a href="job.html"><h3 class="t-h3">${j.role}</h3></a><div class="t-sm muted">${j.co} · ${j.city} · ${j.type}</div></div></div>
    <div style="text-align:right"><div class="mono">${j.sal}</div>${j.fast ? '<span class="badge blue mt1">Fast-track</span>' : ""}</div>
  </div>
  <div class="row between mt3">
    <div class="t-sm"><span class="muted">Min. rank</span> <span class="mono">${j.min}</span> · <span class="${ME.score >= j.min ? "green" : "amber"}">${ME.score >= j.min ? `You qualify (+${ME.score - j.min})` : `${j.min - ME.score} pts short`}</span></div>
    <div class="row"><button class="btn btn-sm btn-ghost" data-toast="Saved">Save</button>${ME.score >= j.min ? `<a class="btn btn-sm btn-primary" href="job.html">Apply with rank</a>` : `<a class="btn btn-sm" href="drills.html">Close the gap</a>`}</div>
  </div>
</article>`;

const jobs = appPage({
  title: "Jobs",
  active: "jobs.html",
  body: `
${pageHead("Your rank is your resume", "Jobs", "Every role lists the minimum rank. If you're above it, you skip resume screening.")}
<div class="card mb3"><div class="row">
  <div style="flex:1;min-width:220px;position:relative"><input class="input" placeholder="Search role, company or city" data-search="#j-list" aria-label="Search jobs"></div>
  <div class="row" data-filter-group="#j-list" role="group" aria-label="Filter">
    ${[["all", "All"], ["qualify", "I qualify"], ["marketing", "Marketing"], ["data", "Data"], ["product", "Product"], ["sales", "Sales"], ["ops", "Ops"], ["intern", "Internships"]].map(([v, l], i) => `<button class="chip ${i === 0 ? "on" : ""}" data-value="${v}" aria-pressed="${i === 0}">${l}</button>`).join("")}
  </div>
</div></div>
<div class="stack" id="j-list">${JOBS.map(jobRow).join("")}
  <div class="empty hide" data-empty><div class="icon">${ic("search")}</div><h3 class="t-h3">No jobs match that</h3><p class="muted t-sm">Try a different filter, or set an alert and we'll ping you.</p><button class="btn" data-toast="Alert created">Create job alert</button></div>
</div>`,
});

const job = appPage({
  title: "Growth Associate at Kirana Club",
  active: "jobs.html",
  body: `
<a class="link" href="jobs.html">${ic("back")} All jobs</a>
<div class="grid mt3" style="grid-template-columns:minmax(0,1fr) 360px;gap:var(--s6);align-items:start">
  <div class="stack-lg">
    <div class="card card-lg stack">
      <div class="row"><span class="avatar lg">KC</span><div><div class="row"><span class="badge">Verified partner</span><span class="badge blue">Fast-track</span></div><h1 class="t-h1 mt1">Growth Associate</h1><div class="muted">Kirana Club · Bengaluru (hybrid) · Full-time</div></div></div>
      <div class="grid g3 mt2"><div><div class="label muted">Salary</div><div class="mono t-h3">8–12 LPA</div></div><div><div class="label muted">Min. rank</div><div class="mono t-h3">700</div></div><div><div class="label muted">Hiring from</div><div class="t-sm mt1">Growth Marketing Cup</div></div></div>
    </div>
    <div class="card card-lg stack"><h2 class="t-h3">What you'll do</h2><ul class="stack" style="padding-left:20px"><li>Own WhatsApp and email campaigns to 2 lakh kirana store owners</li><li>Run weekly A/B tests and report what moved retention</li><li>Work with the founder on launch plans for new cities</li></ul></div>
    <div class="card card-lg stack"><h2 class="t-h3">What they test for</h2><p class="muted t-sm">These are the skills Kirana Club weights most. Your tournament scores in each:</p>
      ${[["Copywriting", 88, 75], ["Funnel analysis", 71, 70], ["Paid ads", 64, 55]].map(([s, me, need]) => `<div><div class="row between t-sm"><span>${s}</span><span><span class="mono">${me}</span> <span class="muted">/ need ${need}</span></span></div>${bar(me, me >= need ? "blue" : "")}</div>`).join("")}
    </div>
    <div class="card card-lg stack"><h2 class="t-h3">About Kirana Club</h2><p class="muted">A 60-person startup helping neighbourhood stores sell online. Series A. Fictional company for this prototype.</p>
      <div class="row t-sm"><span class="badge green">4.4 culture</span><span class="badge">Hired 6 via Rank Culture</span><a class="link" href="companies.html">Read reviews →</a></div></div>
  </div>
  <aside class="card card-lg stack" style="position:sticky;top:88px">
    <div class="label muted">Your match</div>
    <div class="score"><span class="num">742</span><span class="of">/ 700 needed</span></div>
    <span class="badge green">You qualify · skip screening</span>
    <p class="t-sm muted">Applying sends your rank card and task scores — not a resume. Your college stays hidden until interview.</p>
    <button class="btn btn-primary btn-lg btn-block" data-modal="apply-modal">Apply with my rank</button>
    <button class="btn btn-block" data-toast="Saved to your list">Save job</button>
  </aside>
</div>
<div class="modal" id="apply-modal" role="dialog" aria-modal="true" aria-labelledby="ap-h"><div class="card card-lg stack">
  <h2 class="t-h2" id="ap-h">Apply to Kirana Club</h2>
  <div class="list t-sm"><div><span>Rank card (742, Challenger)</span>${ic("check")}</div><div><span>Task scores from 3 tournaments</span>${ic("check")}</div><div><span>Work sample: launch email</span>${ic("check")}</div></div>
  <div class="field"><label for="ap-note">Note to the team (optional)</label><textarea class="input" id="ap-note" placeholder="One line on why this role"></textarea></div>
  <div class="row"><button class="btn" data-close-modal>Cancel</button><a class="btn btn-primary" href="applications.html?applied=1">Send application</a></div>
</div></div>
<style>@media(max-width:960px){.main>.grid{grid-template-columns:1fr!important}.main aside.card{position:static!important}}</style>`,
});

// ---------- Applications (pipeline + empty state) ----------
const stage = (h, items) => `<div class="stack"><div class="row between"><span class="label">${h}</span><span class="mono t-xs muted">${items.length}</span></div>${items.length ? items.map(([r, c, d, b]) => `<div class="card" style="padding:var(--s4)"><strong class="t-sm">${r}</strong><div class="t-xs muted">${c}</div><div class="row between mt2"><span class="t-xs muted">${d}</span>${b}</div></div>`).join("") : `<div class="card t-sm muted center" style="border-style:dashed">Nothing yet</div>`}</div>`;
const applications = appPage({
  title: "Applications",
  active: "applications.html",
  body: `
<div class="banner blue mb3 hide" id="applied-b"><span><strong>Application sent to Kirana Club.</strong> Fast-track roles reply within 7 days.</span></div>
<script>if(location.search.includes('applied'))document.getElementById('applied-b').classList.remove('hide')</script>
${pageHead("Track everything", "Applications", "", `<a class="btn" href="applications-empty.html">View empty state</a>`)}
<div class="grid g4">
  ${stage("Applied", [["Marketing Analyst", "Loop Health", "3 days ago", '<span class="badge">Applied</span>'], ["Growth Associate", "Kirana Club", "Just now", '<span class="badge">Applied</span>']])}
  ${stage("In review", [["Performance Marketer", "Bluepine Foods", "Viewed your rank", '<span class="badge amber">Review</span>']])}
  ${stage("Interview", [["Growth Associate", "Saltpan Labs", "Thu 23 Oct · 4 PM", '<span class="badge green">Fast-track</span>']])}
  ${stage("Offer", [])}
</div>
<div class="card card-lg mt4"><div class="row between"><div><h2 class="t-h3">Your response rate</h2><p class="t-sm muted">Fast-track applications get replies 6× more often.</p></div><div class="row"><div class="kpi"><div class="label muted">Fast-track</div><div class="v">83%</div></div><div class="kpi"><div class="label muted">Standard</div><div class="v">14%</div></div></div></div></div>`,
});
const applicationsEmpty = appPage({
  title: "Applications",
  active: "applications.html",
  body: `
${pageHead("Track everything", "Applications", "", `<a class="btn" href="applications.html">View with data</a>`)}
<div class="empty"><div class="icon">${ic("file")}</div><h2 class="t-h2">No applications yet</h2><p class="muted" style="max-width:48ch">You qualify for 14 jobs right now with your rank of 742. Applying takes one click — no resume needed.</p><div class="row"><a class="btn btn-primary" href="jobs.html">See jobs I qualify for</a><a class="btn" href="arena.html">Raise my rank first</a></div></div>`,
});

// ---------- Leaderboard (in app, with "you") ----------
const leaderboardApp = appPage({
  title: "Leaderboard",
  active: "leaderboard-app.html",
  body: `
${pageHead("Updated after every tournament", "Leaderboard", "", `<span class="badge blue">You: #8,412 · Top 8%</span>`)}
<div class="grid g3 mb3">
  <div class="card kpi"><div class="label muted">Your national rank</div><div class="v mt1">#8,412</div><div class="t-xs green">${ic("up")} 412 places this week</div></div>
  <div class="card kpi"><div class="label muted">In Mumbai</div><div class="v mt1">#611</div></div>
  <div class="card kpi"><div class="label muted">To reach Top 5%</div><div class="v mt1">+31 pts</div></div>
</div>
${leaderTable(true)}`,
});

// ---------- Profile (own + public view) ----------
const profile = appPage({
  title: "Aarav Mehta",
  active: "profile.html",
  body: `
<div class="card card-lg mb3"><div class="grid g2" style="align-items:center">
  <div class="row" style="align-items:flex-start"><span class="avatar lg">AM</span><div class="stack"><div class="row">${tierBadge(742)}<span class="badge">Public profile</span></div><h1 class="t-h1">Aarav Mehta</h1><p class="muted">Growth marketer · Mumbai · Open to full-time</p><div class="row t-sm"><span class="badge">Copywriting</span><span class="badge">Funnels</span><span class="badge">Meta ads</span></div></div></div>
  <div class="row" style="justify-content:flex-end"><div class="score"><span class="num">742</span><span class="of">/1000</span></div></div>
</div>
<div class="row mt3"><button class="btn btn-primary" data-toast="Profile link copied">${ic("send")} Share profile</button><a class="btn" href="settings.html">Edit visibility</a><button class="btn btn-ghost" data-toast="Rank card downloaded (prototype)">Download rank card</button></div></div>
<div class="grid g3">
  <div class="card card-lg span2"><h2 class="t-h3 mb2">Verified skill scores</h2><div class="stack">${[["Copywriting", 88], ["Email marketing", 82], ["Funnel analysis", 71], ["Paid ads", 64], ["SEO", 52]].map(([s, v]) => `<div><div class="row between t-sm"><span>${s}</span><span class="mono">${v}/100</span></div>${bar(v, v > 80 ? "blue" : "")}</div>`).join("")}</div></div>
  <div class="card card-lg"><h2 class="t-h3 mb2">Tournament history</h2><div class="list t-sm">${[["Growth Marketing Cup S3W5", "Top 12%", 731], ["SQL Sprint S3W4", "Top 22%", 618], ["Growth Marketing Cup S3W2", "Top 19%", 690]].map(([n, p, s]) => `<div><span>${n}<br><span class="t-xs muted">${p}</span></span><span class="mono">${s}</span></div>`).join("")}</div></div>
</div>
<div class="card card-lg mt3"><h2 class="t-h3 mb2">Work samples</h2><div class="grid g3">${[["Launch email — protein bar", "Scored 280/300"], ["Funnel teardown — D2C checkout", "Scored 312/400"], ["Push notification rewrite", "Drill · +6 pts"]].map(([h, s]) => `<div class="card" style="background:var(--paper)"><div class="label muted">Work sample</div><p class="t-sm mt1"><strong>${h}</strong></p><p class="t-xs muted mt1">${s}</p><button class="link t-xs mt2" data-toast="Opening sample (prototype)">View →</button></div>`).join("")}</div></div>`,
});

// ---------- Messages ----------
const threads = [
  ["t1", "Kirana Club", "Priya (Hiring lead)", "Thu 4 PM works — sending the invite now.", "2m", [["them", "Hi Aarav, saw your launch email from the Cup — loved the hook. Can we do a 30-min call?"], ["me", "Thanks Priya! Happy to. Thursday or Friday afternoon works."], ["them", "Thu 4 PM works — sending the invite now."]]],
  ["t2", "Bluepine Foods", "Rohan (Marketing head)", "We're reviewing your funnel answer this week.", "1h", [["them", "Hi Aarav — we're reviewing your funnel answer this week. Will update by Friday."]]],
  ["t3", "Rank Culture", "Support", "Your score dispute was reviewed.", "2d", [["them", "Your dispute for Task 2 was reviewed by a second grader. Score unchanged at 312/400. Reason: answer didn't include a target metric."]]],
];
const messages = appPage({
  title: "Messages",
  active: "messages.html",
  body: `
${pageHead("Recruiters reach you here", "Messages", "")}
<div class="inbox">
  <div class="inbox-list">${threads.map(([id, co, who, last, t], i) => `<button data-thread="${id}" class="${i === 0 ? "on" : ""}"><span class="avatar">${co.split(" ").map(w => w[0]).join("").slice(0, 2)}</span><span style="flex:1;min-width:0"><span class="row between"><strong class="t-sm">${co}</strong><span class="t-xs muted">${t}</span></span><span class="t-xs muted" style="display:block">${who}</span><span class="t-xs" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${last}</span></span></button>`).join("")}</div>
  ${threads.map(([id, co, who, , , msgs], i) => `<div class="thread thread-pane ${i ? "hide" : ""}" id="${id}"><div class="row between" style="padding:var(--s4);border-bottom:var(--border)"><div><strong>${co}</strong><div class="t-xs muted">${who}</div></div>${i === 0 ? '<span class="badge green">Interview Thu</span>' : ""}</div><div class="thread-body">${msgs.map(([w, m]) => `<div class="msg ${w === "me" ? "me" : ""}">${m}</div>`).join("")}</div><form class="thread-input" data-send><input class="input" placeholder="Write a message" aria-label="Message"><button class="btn btn-primary" type="submit">${ic("send")}</button></form></div>`).join("")}
</div>`,
});

// ---------- Notifications ----------
const notifications = appPage({
  title: "Notifications",
  active: "",
  body: `
${pageHead("3 unread", "Notifications", "", `<button class="btn btn-sm" data-toast="All marked as read">Mark all read</button><a class="btn btn-sm btn-ghost" href="settings.html">Settings</a>`)}
<div class="card" style="padding:0">
  <div class="list" style="padding:0 var(--s5)">
    ${[["trophy", "Growth Marketing Cup starts in 1 hour", "Webcam check opens 15 min before.", "Just now", true, "tournament.html"],
       ["brief", "Kirana Club invited you to interview", "Thu 23 Oct · 4 PM. Fast-track from your rank.", "2h", true, "messages.html"],
       ["up", "You passed 412 people this week", "You're now #8,412 in Growth Marketing.", "1d", true, "leaderboard-app.html"],
       ["bolt", "New drill for your weak spot: SEO", "Fix a page that ranks #14. 15 min.", "2d", false, "drills.html"],
       ["shield", "Score dispute reviewed", "Task 2 score unchanged at 312/400.", "2d", false, "messages.html"]]
      .map(([i, h, p, t, unread, href]) => `<a href="${href}" style="${unread ? "box-shadow:inset 4px 0 0 var(--blue);padding-left:var(--s4)" : ""}"><span class="row" style="align-items:flex-start">${ic(i)}<span><strong class="t-sm">${h}</strong><br><span class="t-sm muted">${p}</span></span></span><span class="t-xs muted nowrap">${t}</span></a>`).join("")}
  </div>
</div>`,
});

// ---------- Rank feed ----------
const network = appPage({
  title: "Rank feed",
  active: "network.html",
  body: `
${pageHead("What's moving", "Rank feed", "Rank-ups, hires and tournament wins from people in your fields.")}
<div class="grid" style="grid-template-columns:minmax(0,1fr) 320px;gap:var(--s6);align-items:start">
  <div class="stack">
    ${[["RS", "Riya Sharma", "Pune", "Hit #1 in Growth Marketing", "Scored 968 in Growth Marketing Cup S3W5. First person from her college to reach Legend.", "2h", 214],
       ["KC", "Kirana Club", "Hiring partner", "Hired 4 people from SQL Sprint", "All four came in through fast-tracks. Average time from tournament to offer: 11 days.", "5h", 98],
       ["MV", "Mohit Verma", "Jaipur", "Ranked up to Legend in Backend", "From Contender to Legend in 4 months, entirely through tournaments and drills.", "1d", 341],
       ["SP", "Sneha Patil", "Nagpur", "Accepted an offer at Ledgerly", "BDR role, 9 LPA. Came in at #5 in Sales Pitch Arena.", "2d", 512]]
      .map(([a, n, s, h, p, t, k]) => `<article class="card card-lg stack"><div class="row between"><div class="row"><span class="avatar">${a}</span><div><strong>${n}</strong><div class="t-xs muted">${s} · ${t}</div></div></div><span class="badge blue">${h.includes("Hired") || h.includes("offer") ? "Hire" : "Rank-up"}</span></div><h2 class="t-h3">${h}</h2><p class="t-sm muted">${p}</p><div class="row"><button class="btn btn-sm" data-toast="Respect given">${ic("star")} Respect · ${k}</button><button class="btn btn-sm btn-ghost" data-toast="Link copied">Share</button></div></article>`).join("")}
  </div>
  <aside class="stack">
    <div class="card dark stack"><div class="label" style="color:#9DB1FF">Your week</div><div class="mono t-h1">+42</div><p class="muted t-sm">Points gained. You're 31 away from Top 5%.</p></div>
    <div class="card stack"><h3 class="t-h3">Company reviews</h3><p class="t-sm muted">See how partners treat candidates, from people they've hired.</p><a class="btn btn-sm btn-block" href="companies.html">Browse reviews</a></div>
  </aside>
</div>
<style>@media(max-width:960px){.main>.grid{grid-template-columns:1fr!important}}</style>`,
});

const companies = appPage({
  title: "Company reviews",
  active: "network.html",
  body: `
${pageHead("From people they actually hired", "Company reviews", "Only candidates hired through Rank Culture can review. Fictional companies for the prototype.")}
<div class="grid g2">
  ${[["Kirana Club", "Bengaluru · Retail tech", 4.4, [["Interview fairness", 4.6], ["Growth", 4.5], ["Work-life", 3.9]], "They actually read my tournament answers before the call. Interview was about my work, not my college.", 6],
     ["Bluepine Foods", "Mumbai · D2C", 4.1, [["Interview fairness", 4.2], ["Growth", 4.0], ["Work-life", 4.1]], "Fast process. Got the offer 9 days after the Cup.", 3],
     ["Saltpan Labs", "Pune · SaaS", 4.7, [["Interview fairness", 4.9], ["Growth", 4.6], ["Work-life", 4.5]], "Best onboarding I've had. Manager is a former Legend-tier analyst.", 8],
     ["Ledgerly", "Hyderabad · Fintech", 3.8, [["Interview fairness", 4.0], ["Growth", 4.1], ["Work-life", 3.2]], "Targets are aggressive but incentives are real.", 5]]
    .map(([n, s, r, m, q, h]) => `<article class="card card-lg stack"><div class="row between"><div class="row"><span class="avatar">${n.split(" ").map(w => w[0]).join("").slice(0, 2)}</span><div><h2 class="t-h3">${n}</h2><div class="t-xs muted">${s}</div></div></div><div class="mono t-h2">${r}</div></div>${m.map(([l, v]) => `<div><div class="row between t-xs"><span>${l}</span><span class="mono">${v}</span></div>${bar(v * 20, "thin")}</div>`).join("")}<p class="t-sm">"${q}"</p><div class="row between t-xs muted"><span>Hired ${h} via Rank Culture</span><a class="link" href="jobs.html">Open roles →</a></div></article>`).join("")}
</div>`,
});

// ---------- Settings ----------
const toggleRow = (h, p, on, label) => `<div><span><strong class="t-sm">${h}</strong><br><span class="t-sm muted">${p}</span></span><button class="toggle" role="switch" aria-checked="${on}" aria-label="${h}" data-label="${label || h}"></button></div>`;
const settings = appPage({
  title: "Settings",
  active: "settings.html",
  body: `
${pageHead("Your data, your call", "Settings", "")}
<div class="tabs mb3" data-tabs role="tablist">${[["s-vis", "Visibility"], ["s-acc", "Account"], ["s-not", "Notifications"], ["s-plan", "Plan"], ["s-data", "Data"]].map(([id, l], i) => `<button class="${i === 0 ? "on" : ""}" data-tab="${id}" role="tab" aria-selected="${i === 0}">${l}</button>`).join("")}</div>
<div id="s-vis" class="stack-lg">
  <div class="card card-lg"><h2 class="t-h3 mb2">Who can see my rank</h2>
    <div class="grid g3" data-options="single">${[["Only me", "Private. Nobody sees your score."], ["Recruiters only", "Verified hiring partners can find you."], ["Everyone", "Shown on the public leaderboard."]].map(([h, p], i) => `<button class="option ${i === 1 ? "selected" : ""}" aria-pressed="${i === 1}"><strong>${h}</strong><p class="t-sm muted mt1">${p}</p></button>`).join("")}</div></div>
  <div class="card card-lg"><div class="list">${toggleRow("Hide my college from recruiters", "Shown only after you accept an interview.", true)}${toggleRow("Show my city", "Helps local recruiters find you.", true)}${toggleRow("Open to work badge", "Recruiters see you're actively looking.", true)}${toggleRow("Let recruiters see work samples", "Your tournament answers, anonymised.", false)}</div></div>
</div>
<div id="s-acc" class="hide card card-lg stack" style="max-width:640px">
  <div class="field"><label for="a-n">Name</label><input class="input" id="a-n" value="Aarav Mehta"></div>
  <div class="field"><label for="a-e">Email</label><input class="input" id="a-e" value="aarav@example.com"></div>
  <div class="field"><label for="a-c">City</label><input class="input" id="a-c" value="Mumbai"></div>
  <div class="row"><button class="btn btn-primary" data-toast="Saved">Save changes</button><a class="btn" href="forgot-password.html">Change password</a></div>
</div>
<div id="s-not" class="hide card card-lg"><div class="list">${toggleRow("Tournament reminders", "1 hour and 15 minutes before.", true)}${toggleRow("Recruiter messages", "Email + WhatsApp.", true)}${toggleRow("Weekly rank report", "Every Monday.", true)}${toggleRow("New drills for weak spots", "", false)}</div></div>
<div id="s-plan" class="hide card card-lg stack" style="max-width:640px"><div class="row between"><div><div class="label muted">Current plan</div><div class="t-h2">Free</div></div><a class="btn btn-primary" href="pricing.html?from=app">Go Pro · ₹199</a></div><p class="t-sm muted">3 of 3 free drills left this week. Resets Monday.</p></div>
<div id="s-data" class="hide card card-lg stack" style="max-width:640px"><p class="t-sm">Download everything we hold about you, or delete your account. Deletion is permanent after 30 days.</p><div class="row"><button class="btn" data-toast="Export started — we'll email you">Export my data</button><button class="btn" style="border-color:var(--red);color:var(--red)" data-modal="del-modal">Delete account</button></div></div>
<div class="modal" id="del-modal" role="dialog" aria-modal="true" aria-labelledby="del-h"><div class="card card-lg stack"><h2 class="t-h2" id="del-h">Delete your account?</h2><p class="muted">Your rank, tournament history and applications will be deleted after 30 days. You can cancel by logging in before then.</p><div class="row"><button class="btn" data-close-modal>Cancel</button><a class="btn btn-dark" href="index.html">Delete</a></div></div></div>`,
});

// ---------- System states ----------
const loading = appPage({
  title: "Loading",
  active: "dashboard.html",
  body: `
<div class="banner blue mb3 t-sm"><span>Prototype: this is the loading state. It turns into the dashboard in a couple of seconds.</span></div>
<div data-reveal-after="loaded" data-ms="2600" class="stack-lg" aria-busy="true" aria-label="Loading">
  <div class="skel" style="height:46px;width:320px"></div>
  <div class="grid g3"><div class="skel span2" style="height:220px"></div><div class="skel" style="height:220px"></div></div>
  <div class="grid g2"><div class="skel" style="height:180px"></div><div class="skel" style="height:180px"></div></div>
  <div class="grid g3"><div class="skel" style="height:260px"></div><div class="skel" style="height:260px"></div><div class="skel" style="height:260px"></div></div>
</div>
<div id="loaded" class="hide empty"><div class="icon">${ic("check")}</div><h2 class="t-h2">Loaded</h2><a class="btn btn-primary" href="dashboard.html">Go to dashboard</a></div>`,
});
const offline = barePage({
  title: "Connection lost",
  header: "app",
  body: `
<section class="section" style="min-height:calc(100vh - 64px);display:flex;align-items:center"><div class="container" style="max-width:720px">
  <div class="card card-lg stack-lg" style="box-shadow:8px 8px 0 var(--ink)">
    <div class="row between"><span class="badge red">Connection lost</span><span class="t-sm muted">Retrying in <span class="mono" data-retry>15</span>s</span></div>
    <div class="icon" style="width:56px;height:56px;border:var(--border);display:flex;align-items:center;justify-content:center">${ic("wifi")}</div>
    <h1 class="t-h1">We can't reach the server</h1>
    <p class="lead">Your answers are saved on this device. The timer is paused for up to 5 minutes while you reconnect — you won't lose time.</p>
    <div class="list t-sm"><div><span>Answers saved locally</span><span class="green">${ic("check")}</span></div><div><span>Timer paused</span><span class="mono">4:51 left</span></div><div><span>Proctoring</span><span class="amber">Paused</span></div></div>
    <div class="row"><a class="btn btn-primary" href="live.html">Retry now</a><a class="btn" href="contact.html">Contact support</a></div>
  </div>
</div></section>`,
});

module.exports = { pages: { "jobs.html": jobs, "job.html": job, "applications.html": applications, "applications-empty.html": applicationsEmpty, "leaderboard-app.html": leaderboardApp, "profile.html": profile, "messages.html": messages, "notifications.html": notifications, "network.html": network, "companies.html": companies, "settings.html": settings, "loading.html": loading, "offline.html": offline } };
