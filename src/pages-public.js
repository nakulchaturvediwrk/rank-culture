const { publicPage, barePage, ic, bar, tierBadge, logo } = require("./layout");

// ---------- Shared data ----------
const TOURNAMENTS = [
  { id: "growth", name: "Growth Marketing Cup", cat: "marketing", when: "Sat 25 Oct · 7:00 PM IST", dur: "60 min", players: 2418, cap: 3000, prize: "Interview fast-track at 6 companies + ₹50,000 pool", status: "open", tasks: "Write a launch email · Fix a leaky funnel · Pick the winning ad" },
  { id: "sql", name: "SQL Sprint", cat: "data", when: "Sun 26 Oct · 11:00 AM IST", dur: "45 min", players: 3104, cap: 4000, prize: "Analyst fast-track at 4 companies", status: "open", tasks: "Clean a messy sales table · Answer 5 business questions" },
  { id: "product", name: "Product Teardown Clash", cat: "product", when: "Wed 29 Oct · 8:00 PM IST", dur: "75 min", players: 1290, cap: 2000, prize: "APM interview at 3 startups + mentor session", status: "open", tasks: "Teardown a real app · Prioritise a backlog · Write a 1-page PRD" },
  { id: "sales", name: "Sales Pitch Arena", cat: "sales", when: "Fri 31 Oct · 6:30 PM IST", dur: "40 min", players: 980, cap: 1500, prize: "BDR offers from 5 SaaS teams", status: "open", tasks: "Cold email · Objection handling · Discovery call script" },
  { id: "ops", name: "Ops Case Showdown", cat: "ops", when: "Live now · ends 9:00 PM", dur: "60 min", players: 1712, cap: 2000, prize: "Ops associate fast-track at 3 D2C brands", status: "live", tasks: "Fix a delivery delay · Build a vendor scorecard" },
  { id: "design", name: "UI Craft Battle", cat: "design", when: "Sat 1 Nov · 4:00 PM IST", dur: "90 min", players: 760, cap: 1200, prize: "Design interviews at 4 product companies", status: "open", tasks: "Redesign a checkout · Critique a flow" },
  { id: "code", name: "Backend Bug Hunt", cat: "tech", when: "Sun 2 Nov · 10:00 AM IST", dur: "60 min", players: 4021, cap: 5000, prize: "SDE-1 fast-track at 7 companies", status: "open", tasks: "Find & fix 4 production bugs in a Node API" },
  { id: "hr", name: "People Ops Challenge", cat: "hr", when: "Ended · 18 Oct", dur: "45 min", players: 640, cap: 800, prize: "HR associate roles at 3 companies", status: "ended", tasks: "Draft a hiring plan · Handle an escalation" },
];

const LEADERS = [
  ["Riya Sharma", "Pune", "Growth Marketing", 968, "+24"],
  ["Kabir Nair", "Kochi", "Data Analytics", 955, "+11"],
  ["Ananya Iyer", "Bengaluru", "Product", 941, "+38"],
  ["Mohit Verma", "Jaipur", "Backend Engineering", 936, "+6"],
  ["Sneha Patil", "Nagpur", "Sales", 922, "+19"],
  ["Arjun Rao", "Hyderabad", "UI Design", 915, "-3"],
  ["Tanvi Joshi", "Indore", "Operations", 908, "+15"],
  ["Ishaan Gupta", "Lucknow", "Data Analytics", 899, "+9"],
  ["Meera Pillai", "Chennai", "People Ops", 891, "+21"],
  ["Dev Malhotra", "Delhi", "Backend Engineering", 887, "-1"],
];

const catLabel = { marketing: "Marketing", data: "Data", product: "Product", sales: "Sales", ops: "Operations", design: "Design", tech: "Tech", hr: "People Ops" };

const tournamentCard = (t, href = "tournament.html") => `
<article class="card hover" data-cat="${t.cat} ${t.status}">
  <div class="card-head">
    <span class="badge">${catLabel[t.cat]}</span>
    ${t.status === "live" ? '<span class="badge red live">Live</span>' : t.status === "ended" ? '<span class="badge">Ended</span>' : '<span class="badge green">Registration open</span>'}
  </div>
  <h3 class="t-h3">${t.name}</h3>
  <p class="t-sm muted mt1">${t.tasks}</p>
  <div class="list mt2 t-sm">
    <div><span class="muted">${ic("clock")}</span><span style="flex:1">${t.when}</span><span class="mono t-xs">${t.dur}</span></div>
    <div><span class="muted">${ic("medal")}</span><span style="flex:1">${t.prize}</span></div>
  </div>
  <div class="mt2">${bar(Math.round((t.players / t.cap) * 100), "blue thin")}<div class="row between mt1 t-xs"><span class="mono">${t.players.toLocaleString("en-IN")} registered</span><span class="muted">${(t.cap - t.players).toLocaleString("en-IN")} spots left</span></div></div>
  <a class="btn ${t.status === "live" ? "btn-primary" : t.status === "ended" ? "" : "btn-dark"} btn-block mt3" href="${t.status === "ended" ? "results.html" : href}">${t.status === "live" ? "Join live" : t.status === "ended" ? "See results" : "Register free"}</a>
</article>`;

// ---------- Landing ----------
const index = publicPage({
  title: "Fight to get hired",
  active: "",
  body: `
<section class="hero"><div class="container hero-grid">
  <div class="stack-lg">
    <span class="eyebrow badge blue">Built for India's youth</span>
    <h1 class="t-display">Whoever deserves it <span class="accent">gets hired.</span></h1>
    <p class="lead">No degree filters. No useless courses. Compete in skill tournaments built from real work, earn a verified rank, and get fast-tracked to interviews on proof alone.</p>
    <div class="row"><a class="btn btn-primary btn-lg" href="signup.html">Get ranked free ${ic("arrow")}</a><a class="btn btn-lg" href="tournaments.html">See tournaments</a></div>
    <div class="row t-sm muted"><span>${ic("check")} Free for candidates</span><span>${ic("check")} Private by default</span><span>${ic("check")} Any college, any city</span></div>
  </div>
  <div class="card card-lg" style="box-shadow:8px 8px 0 var(--ink)">
    <div class="card-head"><div><div class="label muted">Live rank card</div><div class="t-h3 mt1">Riya Sharma</div><div class="t-sm muted">Pune · Tier-3 college · Growth Marketing</div></div>${tierBadge(968)}</div>
    <div class="score"><span class="num">968</span><span class="of">/1000</span></div>
    <div class="label blue mt1">#1 in India · Growth Marketing</div>
    <div class="stack mt3 t-sm">
      <div><div class="row between"><span>Copywriting</span><span class="mono">98</span></div>${bar(98, "blue")}</div>
      <div><div class="row between"><span>Funnel analysis</span><span class="mono">95</span></div>${bar(95)}</div>
      <div><div class="row between"><span>Paid ads</span><span class="mono">91</span></div>${bar(91)}</div>
    </div>
    <div class="banner blue mt3 t-sm" style="padding:var(--s3)"><span><strong>3 interview fast-tracks</strong> won this month</span><span class="badge green">Hired</span></div>
  </div>
</div></section>

<div class="marquee" aria-hidden="true"><div>${Array(2).fill(["Growth Marketing Cup · 2,418 registered", "SQL Sprint · Sunday 11 AM", "Ops Case Showdown · LIVE", "Riya from Pune just hit #1", "Backend Bug Hunt · 7 companies hiring", "Product Teardown Clash · Wed 8 PM"].map(s => `<span>${s}</span>`).join("")).join("")}</div></div>

<section class="section"><div class="container">
  <div class="sec-head"><h2 class="t-h1">The old way is broken</h2><span class="label muted">Why Rank Culture exists</span></div>
  <div class="vs">
    <div><div class="label muted mb2">Traditional hiring</div><ul>
      <li>${ic("x")} Filtered out by college name before anyone reads your work</li>
      <li>${ic("x")} ₹40,000 certificate courses that recruiters ignore</li>
      <li>${ic("x")} 300 applications, 2 replies, zero feedback</li>
      <li>${ic("x")} Referrals and connections beat ability</li>
    </ul></div>
    <div><div class="label" style="color:#9DB1FF;margin-bottom:var(--s4)">Rank Culture</div><ul>
      <li>${ic("check")} Your score is the only filter. College is hidden from recruiters</li>
      <li>${ic("check")} 15-minute drills on real tasks, only where your rank is weak</li>
      <li>${ic("check")} Top ranks skip screening and go straight to interview</li>
      <li>${ic("check")} Every point is earned in a proctored tournament</li>
    </ul></div>
  </div>
</div></section>

<section class="section" id="how"><div class="container">
  <div class="sec-head"><h2 class="t-h1">How it works</h2><a class="link" href="how-it-works.html">Full breakdown →</a></div>
  <div class="grid g3">
    ${[["01", "Compete", "Join weekly tournaments built from real work — write the email, fix the funnel, clean the data. 40–90 minutes. Free.", "trophy"],
       ["02", "Rank up", "Get a verified score out of 1000 and a tier: Rookie → Contender → Challenger → Elite → Legend. Drills fix your weakest skill.", "up"],
       ["03", "Get hired", "Companies hire straight from the leaderboard. Top finishers win interview fast-tracks that skip resume screening.", "brief"]]
      .map(([n, h, p, i]) => `<div class="card card-lg"><div class="row between"><span class="mono t-h1 blue">${n}</span>${ic(i)}</div><h3 class="t-h2 mt3">${h}</h3><p class="t-body muted mt1">${p}</p></div>`).join("")}
  </div>
</div></section>

<section class="section"><div class="container">
  <div class="sec-head"><h2 class="t-h1">This week's tournaments</h2><a class="link" href="tournaments.html">All tournaments →</a></div>
  <div class="grid g3">${TOURNAMENTS.slice(0, 3).map(t => tournamentCard(t, "signup.html")).join("")}</div>
</div></section>

<section class="section"><div class="container grid g2" style="gap:var(--s7);align-items:start">
  <div class="stack">
    <div class="sec-head" style="margin-bottom:var(--s4)"><h2 class="t-h1">National leaderboard</h2></div>
    <div class="table-wrap"><table>
      <thead><tr><th>#</th><th>Name</th><th>Skill</th><th style="text-align:right">Score</th></tr></thead>
      <tbody>${LEADERS.slice(0, 5).map((l, i) => `<tr><td class="rank-pos">${String(i + 1).padStart(2, "0")}</td><td><strong>${l[0]}</strong><div class="t-xs muted">${l[1]}</div></td><td class="t-sm">${l[2]}</td><td class="mono" style="text-align:right">${l[3]}</td></tr>`).join("")}</tbody>
    </table></div>
    <a class="btn btn-block" href="leaderboard.html">View full leaderboard</a>
  </div>
  <div class="stack">
    <div class="sec-head" style="margin-bottom:var(--s4)"><h2 class="t-h1">The promise</h2></div>
    <div class="card dark card-lg stack">
      <p class="t-h2">"If you're ranked here, nobody can stop you from getting hired."</p>
      <p class="muted">That's the bar we hold ourselves to. If you finish a tournament in the top 10% and don't get at least one interview within 60 days, Pro is free for life.</p>
    </div>
    <div class="grid g2">
      <div class="card kpi"><div class="label muted">Candidates ranked</div><div class="v mt1">1.2 L</div></div>
      <div class="card kpi"><div class="label muted">Hiring partners</div><div class="v mt1">140</div></div>
      <div class="card kpi"><div class="label muted">From tier-2/3 cities</div><div class="v mt1">61%</div></div>
      <div class="card kpi"><div class="label muted">Median time to interview</div><div class="v mt1">9 days</div></div>
    </div>
    <p class="t-xs muted">Prototype figures shown for illustration.</p>
  </div>
</div></section>

<section class="section" style="background:var(--blue);color:#fff"><div class="container center stack-lg" style="display:flex;flex-direction:column;align-items:center">
  <h2 class="t-display">Your rank is waiting.</h2>
  <p class="t-body" style="max-width:52ch;color:#D5DDFF">Sign up in 60 seconds, pick your field, and enter your first tournament this weekend. Free forever for candidates.</p>
  <a class="btn btn-dark btn-lg" href="signup.html">Get ranked free ${ic("arrow")}</a>
</div></section>`,
});

// ---------- How it works ----------
const howItWorks = publicPage({
  title: "How it works",
  active: "how-it-works.html",
  body: `
<section class="hero"><div class="container stack-lg">
  <span class="badge blue">How it works</span>
  <h1 class="t-display">Compete. Rank up.<br>Get hired.</h1>
  <p class="lead">Rank Culture replaces resumes and certificates with one thing recruiters actually trust: proof that you can do the job, scored against everyone else who wants it.</p>
</div></section>
<section class="section"><div class="container stack-lg">
  ${[["01", "Pick your field", "Marketing, data, product, sales, ops, design, tech or people ops. You can compete in more than one.", "Takes 60 seconds. No resume upload."],
     ["02", "Enter a tournament", "Every tournament is built with hiring partners from tasks their team does on the job. You do the work live, proctored, in 40–90 minutes.", "Example: you get a real (anonymised) funnel and 45 minutes to find the leak and write the fix."],
     ["03", "Get your verified score", "AI scoring plus a human reviewer panel grades your work on a 0–1000 scale. You see exactly where you lost points.", "Scores are final and can't be bought. Retake in 30 days."],
     ["04", "Close gaps with drills", "No courses. Drills are 15-minute real tasks targeted only at your weakest skill. Do one, earn points back.", "Average Challenger gains +38 points from 5 drills."],
     ["05", "Get fast-tracked", "Top finishers win interview fast-tracks: you skip screening and go straight to a real interview. Recruiters also search the leaderboard directly.", "College name is hidden from recruiters until interview."]]
    .map(([n, h, p, ex]) => `<div class="grid step-row"><div class="mono t-display blue">${n}</div><div class="stack"><h2 class="t-h2">${h}</h2><p class="t-body">${p}</p><p class="t-sm muted">${ex}</p></div></div>`).join("")}
</div></section>
<section class="section"><div class="container">
  <div class="sec-head"><h2 class="t-h1">The five tiers</h2><span class="label muted">Score out of 1000</span></div>
  <div class="grid g5">
    ${[["Rookie", "0–449", "Just starting. Every tournament teaches you something."], ["Contender", "450–649", "You can do the work. Drills will sharpen you."], ["Challenger", "650–799", "Visible to recruiters. Eligible for fast-tracks."], ["Elite", "800–899", "Top 5%. Companies message you first."], ["Legend", "900+", "Top 1%. Offers come to you."]]
      .map(([t, r, d], i) => `<div class="card ${i === 4 ? "dark" : i === 3 ? "blue" : ""}"><div class="label">${t}</div><div class="mono t-h3 mt1">${r}</div><p class="t-sm mt2 ${i > 2 ? "" : "muted"}">${d}</p></div>`).join("")}
  </div>
</div></section>
<section class="section"><div class="container grid g2" style="gap:var(--s7)">
  <div class="stack"><h2 class="t-h1">Questions</h2><p class="muted">Straight answers to what students ask most.</p></div>
  <div class="list">
    ${[["Is it really free?", "Yes. Tournaments, your rank and job applications are free forever. Pro (₹199/month) adds unlimited drills, detailed score breakdowns and priority fast-tracks."],
       ["Can someone cheat?", "Tournaments are proctored with webcam checks, tab monitoring and plagiarism detection. Flagged attempts are reviewed by a human before any score is published."],
       ["I'm from a tier-3 college. Does that matter?", "No. Recruiters can't see your college until they invite you to interview. 61% of our ranked candidates are from tier-2 and tier-3 cities."],
       ["What if I score low?", "Your score is private by default. Only you see it until you choose to make it public. Do drills, retake in 30 days."],
       ["Who builds the tasks?", "Our hiring partners and a panel of practitioners. Every task maps to work the role actually does in its first 90 days."]]
      .map(([q, a]) => `<details style="display:block;padding:var(--s4) 0;border-bottom:var(--border-thin)"><summary class="t-h3" style="cursor:pointer">${q}</summary><p class="muted mt1">${a}</p></details>`).join("")}
  </div>
</div></section>
<section class="section-sm"><div class="container row between"><h2 class="t-h2">Ready to see where you stand?</h2><a class="btn btn-primary btn-lg" href="signup.html">Get ranked free</a></div></section>`,
});

// ---------- Tournaments (public) ----------
const tournamentsPublic = publicPage({
  title: "Tournaments",
  active: "tournaments.html",
  body: `
<section class="hero" style="padding-bottom:var(--s7)"><div class="container stack">
  <span class="badge red live">1 tournament live now</span>
  <h1 class="t-display">Tournaments</h1>
  <p class="lead">Real work, real time, real ranks. Every tournament is free to enter. Top finishers win interview fast-tracks with hiring partners.</p>
</div></section>
<section class="section"><div class="container">
  <div class="row between mb3">
    <div class="row" data-filter-group="#t-grid" role="group" aria-label="Filter by field">
      <button class="chip on" data-value="all" aria-pressed="true">All</button>
      ${Object.entries(catLabel).map(([k, v]) => `<button class="chip" data-value="${k}" aria-pressed="false">${v}</button>`).join("")}
    </div>
  </div>
  <div class="grid g3" id="t-grid">${TOURNAMENTS.map(t => tournamentCard(t, "signup.html")).join("")}
    <div class="empty hide span2" data-empty><div class="icon">${ic("trophy")}</div><h3 class="t-h3">No tournaments in this field this week</h3><p class="muted t-sm">New ones drop every Monday. Turn on alerts after you sign up.</p></div>
  </div>
</div></section>`,
});

// ---------- Leaderboard (public) ----------
const leaderTable = (me = false) => `
<div class="row between mb3">
  <div class="row" role="group" aria-label="Field">${["All fields", "Marketing", "Data", "Product", "Tech", "Sales", "Ops", "Design"].map((x, i) => `<button class="chip ${i === 0 ? "on" : ""}" data-toast="Showing ${x}">${x}</button>`).join("")}</div>
  <select class="input" style="width:auto;min-height:36px" aria-label="Region" onchange="toast('Region: '+this.value)"><option>All India</option><option>Maharashtra</option><option>Karnataka</option><option>Delhi NCR</option><option>Tamil Nadu</option></select>
</div>
<div class="table-wrap"><table>
  <thead><tr><th>Rank</th><th>Candidate</th><th>Field</th><th>Tier</th><th style="text-align:right">Score</th><th style="text-align:right">7-day</th></tr></thead>
  <tbody>
    ${LEADERS.map((l, i) => `<tr><td class="rank-pos">${String(i + 1).padStart(2, "0")}</td><td><a href="profile.html?view=public"><strong>${l[0]}</strong></a><div class="t-xs muted">${l[1]}</div></td><td class="t-sm">${l[2]}</td><td>${tierBadge(l[3])}</td><td class="mono" style="text-align:right">${l[3]}</td><td class="mono t-sm ${l[4].startsWith("-") ? "red" : "green"}" style="text-align:right">${l[4]}</td></tr>`).join("")}
    ${me ? `<tr><td colspan="6" class="center t-xs muted">· · ·</td></tr><tr class="me"><td class="rank-pos">8,412</td><td><strong>Aarav Mehta (you)</strong><div class="t-xs muted">Mumbai</div></td><td class="t-sm">Growth Marketing</td><td>${tierBadge(742)}</td><td class="mono" style="text-align:right">742</td><td class="mono t-sm green" style="text-align:right">+42</td></tr>` : ""}
  </tbody>
</table></div>`;

const leaderboard = publicPage({
  title: "Leaderboard",
  active: "leaderboard.html",
  body: `
<section class="hero" style="padding-bottom:var(--s7)"><div class="container stack">
  <span class="badge blue">Updated after every tournament</span>
  <h1 class="t-display">National leaderboard</h1>
  <p class="lead">Every score here was earned in a proctored tournament. Names are shown only for candidates who chose to go public.</p>
</div></section>
<section class="section"><div class="container">${leaderTable(false)}
  <div class="banner blue mt4"><span><strong>Want your name here?</strong> The next tournament starts Saturday.</span><a class="btn btn-primary" href="signup.html">Get ranked free</a></div>
</div></section>`,
});

// ---------- Employers ----------
const employers = publicPage({
  title: "Hire by rank",
  active: "employers.html",
  body: `
<section class="hero"><div class="container hero-grid">
  <div class="stack-lg">
    <span class="badge dark">For employers</span>
    <h1 class="t-display">Hire people who already did the job.</h1>
    <p class="lead">Stop screening 2,000 resumes for 10 interviews. Search a ranked pool of candidates who've proven the exact skill in a proctored tournament, or host your own.</p>
    <div class="row"><a class="btn btn-primary btn-lg" href="recruiter.html">Open recruiter console</a><a class="btn btn-lg" href="contact.html">Talk to us</a></div>
  </div>
  <div class="grid g2">
    <div class="card kpi"><div class="label muted">Time to shortlist</div><div class="v mt1">2 days</div><p class="t-xs muted mt1">vs 3 weeks average</p></div>
    <div class="card kpi"><div class="label muted">Interview → offer</div><div class="v mt1">1 in 3</div><p class="t-xs muted mt1">vs 1 in 12 industry</p></div>
    <div class="card kpi dark span2"><div class="label" style="color:#9DB1FF">Bias removed</div><p class="t-h3 mt1">College, gender and age hidden until you invite to interview.</p></div>
  </div>
</div></section>
<section class="section"><div class="container">
  <div class="sec-head"><h2 class="t-h1">Two ways to hire</h2></div>
  <div class="grid g2">
    <div class="card card-lg stack"><span class="mono t-h1 blue">A</span><h3 class="t-h2">Search the leaderboard</h3><p class="muted">Filter by skill, score, tier and city. See exactly how each candidate performed, task by task. Message directly.</p><a class="btn" href="recruiter.html">Try talent search</a></div>
    <div class="card card-lg stack dark"><span class="mono t-h1" style="color:#9DB1FF">B</span><h3 class="t-h2">Host a hiring tournament</h3><p class="muted">Turn your real work into a 60-minute tournament. Thousands compete; you interview the top 20. Your brand gets in front of every participant.</p><a class="btn btn-primary" href="host-tournament.html">Host a tournament</a></div>
  </div>
</div></section>
<section class="section"><div class="container">
  <div class="sec-head"><h2 class="t-h1">Pricing for teams</h2></div>
  <div class="grid g3">
    ${[["Starter", "Free", ["5 candidate unlocks / month", "Leaderboard search", "Direct messaging"]],
       ["Growth", "₹14,999/mo", ["50 unlocks / month", "1 hosted tournament / quarter", "Score breakdowns + work samples", "ATS export"]],
       ["Enterprise", "Custom", ["Unlimited unlocks", "Monthly hosted tournaments", "Custom task design with our panel", "Campus-free hiring programme"]]]
      .map(([n, p, f], i) => `<div class="card card-lg ${i === 1 ? "blue" : ""} stack"><div class="label">${n}</div><div class="mono t-h1">${p}</div><ul style="list-style:none" class="stack t-sm">${f.map(x => `<li class="row">${ic("check")}${x}</li>`).join("")}</ul><a class="btn ${i === 1 ? "btn-dark" : ""} btn-block" href="contact.html">${i === 2 ? "Contact sales" : "Get started"}</a></div>`).join("")}
  </div>
</div></section>`,
});

// ---------- Pricing ----------
const pricing = publicPage({
  title: "Pricing",
  active: "pricing.html",
  body: `
<section class="hero" style="padding-bottom:var(--s7)"><div class="container stack center" style="display:flex;flex-direction:column;align-items:center">
  <span class="badge blue">Simple pricing</span>
  <h1 class="t-display">Competing is free. Forever.</h1>
  <p class="lead">Pay only if you want to rank up faster. Students with a valid college ID get Pro at half price.</p>
</div></section>
<section class="section"><div class="container">
  <div class="grid g3">
    <div class="card card-lg stack"><div class="label">Free</div><div class="mono t-display">₹0</div><p class="muted t-sm">Everything you need to get ranked and hired.</p>
      <ul style="list-style:none" class="stack t-sm">${["All tournaments", "Verified rank + tier", "Apply to all jobs", "3 drills a week", "Public profile"].map(x => `<li class="row">${ic("check")}${x}</li>`).join("")}</ul>
      <a class="btn btn-block" href="signup.html">Start free</a></div>
    <div class="card card-lg blue stack" style="box-shadow:8px 8px 0 var(--ink)"><div class="row between"><div class="label">Pro</div><span class="badge dark">Most picked</span></div><div><span class="mono t-display">₹199</span><span class="t-sm"> / month</span></div><p class="t-sm muted">₹99 with student ID.</p>
      <ul style="list-style:none" class="stack t-sm">${["Everything in Free", "Unlimited drills", "Task-by-task score breakdown", "Priority fast-track queue", "See who viewed your rank", "Top-10% interview guarantee"].map(x => `<li class="row">${ic("check")}${x}</li>`).join("")}</ul>
      <button class="btn btn-dark btn-block" data-modal="upgrade-modal">Go Pro</button></div>
    <div class="card card-lg dark stack"><div class="label" style="color:#9DB1FF">Campus</div><div class="mono t-display">Free</div><p class="muted t-sm">For placement cells and college clubs.</p>
      <ul style="list-style:none" class="stack t-sm">${["Private college tournaments", "Batch rank reports", "Pro for every student at ₹49", "Placement officer dashboard"].map(x => `<li class="row">${ic("check")}${x}</li>`).join("")}</ul>
      <a class="btn btn-primary btn-block" href="contact.html">Bring to my college</a></div>
  </div>
  <p class="t-xs muted center mt4">Prices include GST. Cancel anytime from Settings. Top-10% guarantee: finish a tournament in the top 10%, get no interview in 60 days, and Pro is free for life.</p>
</div></section>
<div class="modal" id="upgrade-modal" role="dialog" aria-modal="true" aria-labelledby="up-h"><div class="card card-lg stack">
  <div class="row between"><h2 class="t-h2" id="up-h">Go Pro</h2><button class="icon-btn" data-close-modal aria-label="Close">${ic("x")}</button></div>
  <div class="grid g2">
    <button class="option selected" aria-pressed="true"><div class="label">Monthly</div><div class="mono t-h3 mt1">₹199</div></button>
    <button class="option"><div class="label">Yearly · save 33%</div><div class="mono t-h3 mt1">₹1,599</div></button>
  </div>
  <p class="t-sm muted">Payment is disabled in this prototype. In production this opens UPI / card checkout.</p>
  <button class="btn btn-primary btn-block btn-lg" data-close-modal data-toast="Prototype: payment would open here">Continue to pay</button>
</div></div>`,
});

// ---------- About ----------
const about = publicPage({
  title: "About",
  active: "about.html",
  body: `
<section class="hero"><div class="container stack-lg">
  <span class="badge blue">Our mission</span>
  <h1 class="t-display">Bring rank culture<br>to hiring.</h1>
  <p class="lead">In sport, nobody asks which college a champion went to. You play, you win, you rise. We're bringing that to careers — so a student in Kota competes on the same field as one in South Delhi.</p>
</div></section>
<section class="section"><div class="container grid g2" style="gap:var(--s7)">
  <div class="stack"><h2 class="t-h1">The problem</h2>
    <p>Every year, about 1 crore young Indians enter the job market. Most get filtered out by college name, a CGPA cut-off or a keyword scanner — before a human sees what they can do.</p>
    <p>The fix on offer is usually another paid course. A certificate that recruiters don't trust either.</p></div>
  <div class="stack"><h2 class="t-h1">Our answer</h2>
    <p>Make ability visible and comparable. Tournaments built from real work. Scores that are proctored, explainable and hard to fake. A leaderboard companies hire from.</p>
    <p>And instead of courses, drills: tiny real tasks that fix exactly the skill holding your rank back.</p></div>
</div></section>
<section class="section"><div class="container">
  <div class="sec-head"><h2 class="t-h1">What we believe</h2></div>
  <div class="grid g4">
    ${[["Merit over pedigree", "Your rank is earned. College and connections don't add points."], ["Practice over courses", "You learn by doing the work, not by watching someone talk about it."], ["Transparent scoring", "You see every point you lost and why."], ["Private by default", "Your score is yours. You choose who sees it."]].map(([h, p]) => `<div class="card"><h3 class="t-h3">${h}</h3><p class="t-sm muted mt1">${p}</p></div>`).join("")}
  </div>
</div></section>
<section class="section"><div class="container grid g2" style="gap:var(--s7);align-items:center">
  <div class="stack"><div class="label muted">Founder</div><h2 class="t-h1">Nakul Chaturvedi</h2><p class="muted">Civil engineer from NIT Surat who worked his way into founder's-office roles across fintech, media and real estate — and saw first-hand how much talent gets filtered out before anyone looks at the work.</p>
    <div class="row"><a class="link" href="https://www.linkedin.com/in/nakulchaturvediwork" target="_blank" rel="noopener">LinkedIn →</a><a class="link" href="contact.html">Get in touch →</a></div></div>
  <div class="card dark card-lg"><p class="t-h2">"We're not building another job board. We're building the arena."</p></div>
</div></section>`,
});

// ---------- Contact ----------
const contact = publicPage({
  title: "Contact & support",
  active: "",
  body: `
<section class="hero" style="padding-bottom:var(--s7)"><div class="container stack">
  <span class="badge blue">We reply within 24 hours</span>
  <h1 class="t-display">Contact & support</h1>
</div></section>
<section class="section"><div class="container grid g2" style="gap:var(--s7);align-items:start">
  <form class="card card-lg stack" data-go="contact.html?sent=1" data-toast-msg="Message sent — we'll reply within 24 hours" novalidate>
    <div class="field"><label for="c-topic">I'm a</label><select class="input" id="c-topic"><option>Candidate</option><option>Employer / recruiter</option><option>College placement cell</option><option>Investor / mentor</option><option>Press</option></select></div>
    <div class="field"><label for="c-name">Name</label><input class="input" id="c-name" required autocomplete="name"><span class="err hint red hide">Please enter your name</span></div>
    <div class="field"><label for="c-email">Email</label><input class="input" id="c-email" type="email" required autocomplete="email"><span class="err hint red hide">Enter a valid email</span></div>
    <div class="field"><label for="c-msg">Message</label><textarea class="input" id="c-msg" required></textarea><span class="err hint red hide">Tell us a little more</span></div>
    <button class="btn btn-primary btn-lg" type="submit">Send message</button>
  </form>
  <div class="stack">
    ${[["Candidates", "Score disputes, account help, tournament issues.", "help@rankculture.in"], ["Employers", "Talent search, hosting tournaments, pricing.", "hire@rankculture.in"], ["Colleges", "Campus tournaments and placement dashboards.", "campus@rankculture.in"], ["Mentors & investors", "Want to help shape the product?", "nakul@rankculture.in"]]
      .map(([h, p, e]) => `<div class="card"><div class="row between"><h3 class="t-h3">${h}</h3>${ic("mail")}</div><p class="t-sm muted mt1">${p}</p><p class="mono t-sm mt2">${e}</p></div>`).join("")}
    <p class="t-xs muted">Email addresses shown are placeholders for the prototype.</p>
  </div>
</div></section>`,
});

// ---------- Legal ----------
const legal = (title, eyebrow, sections) => publicPage({
  title, active: "",
  body: `
<section class="hero" style="padding-bottom:var(--s7)"><div class="container stack">
  <span class="badge">${eyebrow}</span><h1 class="t-display">${title}</h1><p class="t-sm muted">Effective 1 October 2026 · Prototype draft — to be reviewed by counsel before launch.</p>
</div></section>
<section class="section"><div class="container grid" style="grid-template-columns:240px 1fr;gap:var(--s7);align-items:start">
  <nav class="card hide-m" style="position:sticky;top:88px"><div class="label muted mb2">Sections</div><div class="stack t-sm">${sections.map((s, i) => `<a href="#s${i}">${String(i + 1).padStart(2, "0")} ${s[0]}</a>`).join("")}</div></nav>
  <div class="stack-lg" style="max-width:68ch">${sections.map((s, i) => `<section id="s${i}" class="stack"><h2 class="t-h2">${String(i + 1).padStart(2, "0")} · ${s[0]}</h2>${s[1].map(p => `<p>${p}</p>`).join("")}</section>`).join("")}</div>
</div></section>
<style>@media(max-width:960px){.section .container.grid{grid-template-columns:1fr!important}}</style>`,
});

const terms = legal("Terms of service", "Legal", [
  ["Who we are", ["Rank Culture runs skill tournaments and a verified ranking for candidates, and lets employers find and hire them. By creating an account you agree to these terms."]],
  ["Fair play", ["You must complete tournaments yourself, without outside help, AI tools (unless a task allows them) or shared answers.", "We proctor tournaments with webcam checks, tab monitoring and plagiarism detection. Confirmed cheating means your score is voided and your account may be banned."]],
  ["Your score", ["Scores are given by our AI grader and human reviewers. You can dispute any score within 7 days from your results page.", "Scores can't be bought, transferred or edited. You can retake a tournament format after 30 days."]],
  ["Fast-tracks", ["A fast-track guarantees an interview, not a job. Employers make their own hiring decisions."]],
  ["Payments", ["Pro is billed monthly or yearly and can be cancelled anytime. Refunds follow Indian consumer law."]],
  ["Ending your account", ["You can delete your account from Settings at any time. We delete your data within 30 days."]],
]);
const privacy = legal("Privacy policy", "Legal", [
  ["The short version", ["Your profile and scores are private by default. You decide who sees them. We never sell your data."]],
  ["What we collect", ["Account details (name, email, city), your tournament answers and scores, and proctoring data during a tournament (webcam snapshots and browser activity)."]],
  ["What recruiters see", ["Only what you make visible: your score, tier, skill breakdown and work samples. Your college, gender and age stay hidden until you accept an interview invite."]],
  ["Proctoring data", ["Webcam snapshots are kept for 30 days for dispute review, then deleted."]],
  ["Your rights", ["Under India's Digital Personal Data Protection Act you can access, correct, export or erase your data. Use Settings → Data, or email privacy@rankculture.in."]],
]);

// ---------- 404 ----------
const notFound = barePage({
  title: "Page not found",
  body: `
<section class="section" style="min-height:calc(100vh - 64px);display:flex;align-items:center"><div class="container grid g2" style="gap:var(--s7);align-items:center">
  <div class="stack-lg">
    <span class="badge">Error 404</span>
    <div class="score"><span class="num">404</span><span class="of">/ not found</span></div>
  </div>
  <div class="stack-lg">
    <h1 class="t-h1">This page didn't make the cut.</h1>
    <p class="lead">The tournament, job or page you're looking for has ended, been filled or moved.</p>
    <div class="row"><a class="btn btn-primary" href="index.html">Go home</a><a class="btn" href="tournaments.html">Browse tournaments</a><a class="btn" href="jobs.html">Browse jobs</a></div>
  </div>
</div></section>`,
});

module.exports = {
  pages: {
    "index.html": index, "how-it-works.html": howItWorks, "tournaments.html": tournamentsPublic,
    "leaderboard.html": leaderboard, "employers.html": employers, "pricing.html": pricing,
    "about.html": about, "contact.html": contact, "terms.html": terms, "privacy.html": privacy, "404.html": notFound,
  },
  TOURNAMENTS, LEADERS, catLabel, tournamentCard, leaderTable,
};
