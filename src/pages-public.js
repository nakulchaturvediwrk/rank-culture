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
    <div class="card-head"><div><div class="label muted">Example rank card</div><div class="t-h3 mt1">What yours could look like</div><div class="t-sm muted">Growth Marketing · illustration, not a real player</div></div>${tierBadge(968)}</div>
    <div class="score"><span class="num">968</span><span class="of">/1000</span></div>
    <div class="label blue mt1">Legend tier · Growth Marketing</div>
    <div class="stack mt3 t-sm">
      <div><div class="row between"><span>Copywriting</span><span class="mono">98</span></div>${bar(98, "blue")}</div>
      <div><div class="row between"><span>Funnel analysis</span><span class="mono">95</span></div>${bar(95)}</div>
      <div><div class="row between"><span>Paid ads</span><span class="mono">91</span></div>${bar(91)}</div>
    </div>
    <div class="banner blue mt3 t-sm" style="padding:var(--s3)"><span>Every number comes from <strong>tournament and battle answers</strong> — nothing self-reported</span></div>
  </div>
</div></section>

<div class="marquee" aria-hidden="true"><div>${Array(2).fill(["Live battles every day", "Fastest Finger · 9 PM daily", "Saturday Showdown · 8 PM", "Knockout cups · Wed & Sun 7 PM", "Company-style packs: TCS · Infosys · Accenture · Deloitte · Amazon · Consulting", "Free to enter"].map(s => `<span>${s}</span>`).join("")).join("")}</div></div>

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
      <li>${ic("check")} Your score is the only filter. We never ask for your college</li>
      <li>${ic("check")} Quick timed drills on the skills where you lose points</li>
      <li>${ic("check")} Top ranks skip screening and go straight to interview</li>
      <li>${ic("check")} Every point is earned on the clock and scored on our server</li>
    </ul></div>
  </div>
</div></section>

<section class="section" id="how"><div class="container">
  <div class="sec-head"><h2 class="t-h1">How it works</h2><a class="link" href="how-it-works.html">Full breakdown →</a></div>
  <div class="grid g3">
    ${[["01", "Compete", "Join weekly tournaments built from real work — write the email, fix the funnel, clean the data. 40–90 minutes. Free.", "trophy"],
       ["02", "Rank up", "Get a verified score out of 1000 and a tier: Rookie → Contender → Challenger → Elite → Legend. Drills target your weakest skill.", "up"],
       ["03", "Get hired", "Top finishers win interview fast-tracks to pilot partner roles that skip resume screening. More hiring partners join every month.", "brief"]]
      .map(([n, h, p, i]) => `<div class="card card-lg"><div class="row between"><span class="mono t-h1 blue">${n}</span>${ic(i)}</div><h3 class="t-h2 mt3">${h}</h3><p class="t-body muted mt1">${p}</p></div>`).join("")}
  </div>
</div></section>

<section class="section"><div class="container">
  <div class="sec-head"><h2 class="t-h1">This week's tournaments</h2><a class="link" href="tournaments.html">All tournaments →</a></div>
  <div class="grid g3" id="home-t"><p class="muted">Loading this week's tournaments…</p></div>
</div></section>

<section class="section"><div class="container grid g2" style="gap:var(--s7);align-items:start">
  <div class="stack">
    <div class="sec-head" style="margin-bottom:var(--s4)"><h2 class="t-h1">National leaderboard</h2></div>
    <div class="table-wrap"><table>
      <thead><tr><th>#</th><th>Name</th><th>Best domain</th><th style="text-align:right">Score</th></tr></thead>
      <tbody id="home-lb"><tr><td colspan="4" class="muted t-sm">Loading…</td></tr></tbody>
    </table></div>
    <a class="btn btn-block" href="leaderboard.html">View full leaderboard</a>
  </div>
  <div class="stack">
    <div class="sec-head" style="margin-bottom:var(--s4)"><h2 class="t-h1">The promise</h2></div>
    <div class="card dark card-lg stack">
      <p class="t-h2">"If you're ranked here, nobody can stop you from getting hired."</p>
      <p class="muted">That's the bar we hold ourselves to. Every rank is earned on the clock, on real work — so a high one means something to the people hiring.</p>
    </div>
    <div class="grid g2">
      <div class="card kpi"><div class="label muted">Players ranked</div><div class="v mt1" data-stat="ranked">—</div></div>
      <div class="card kpi"><div class="label muted">Tournament & battle entries</div><div class="v mt1" data-stat="played">—</div></div>
      <div class="card kpi"><div class="label muted">Questions in the bank</div><div class="v mt1" data-stat="questions">—</div></div>
      <div class="card kpi"><div class="label muted">Live events this week</div><div class="v mt1" data-stat="events">—</div></div>
    </div>
    <p class="t-xs muted">Live numbers from the platform. Rank Culture is in its pilot, so these start small.</p>
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
     ["02", "Enter a tournament", "Every tournament is built from tasks the role does on the job. You do the work live, on a timer that runs on our server, in 40–90 minutes.", "Example: you get a real (anonymised) funnel and 45 minutes to find the leak and write the fix."],
     ["03", "Get your verified score", "Multiple-choice tasks are scored instantly on our server (written answers are saved but not scored during the pilot). You get a score out of 1000 and see exactly where you lost points.", "Scores can't be bought or edited. One attempt per tournament."],
     ["04", "Close gaps with drills", "No courses. Drills are short timed rounds on the skill where you lose the most points, against practice bots. Every answer feeds your skill stats.", "Free and unlimited during the pilot."],
     ["05", "Get fast-tracked", "Top finishers win interview fast-tracks: you skip screening and go straight to a real interview. ", "We don't ask for your college. Your rank comes only from your work."]]
    .map(([n, h, p, ex]) => `<div class="grid step-row"><div class="mono t-display blue">${n}</div><div class="stack"><h2 class="t-h2">${h}</h2><p class="t-body">${p}</p><p class="t-sm muted">${ex}</p></div></div>`).join("")}
</div></section>
<section class="section"><div class="container">
  <div class="sec-head"><h2 class="t-h1">The five tiers</h2><span class="label muted">Score out of 1000</span></div>
  <div class="grid g5">
    ${[["Rookie", "0–449", "Just starting. Every tournament teaches you something."], ["Contender", "450–649", "You can do the work. Drills will sharpen you."], ["Challenger", "650–799", "Clears the bar for most fast-track roles."], ["Elite", "800–899", "Strong, consistent work. First in line for fast-tracks."], ["Legend", "900+", "Exceptional work. The top of the board."]]
      .map(([t, r, d], i) => `<div class="card ${i === 4 ? "dark" : i === 3 ? "blue" : ""}"><div class="label">${t}</div><div class="mono t-h3 mt1">${r}</div><p class="t-sm mt2 ${i > 2 ? "" : "muted"}">${d}</p></div>`).join("")}
  </div>
</div></section>
<section class="section"><div class="container grid g2" style="gap:var(--s7)">
  <div class="stack"><h2 class="t-h1">Questions</h2><p class="muted">Straight answers to what students ask most.</p></div>
  <div class="list">
    ${[["Is it really free?", "Yes. Tournaments, battles, drills, your rank and job applications are free. A paid Pro plan may come after the pilot — nothing is for sale today."],
       ["Can someone cheat?", "The timer runs on our server, prompts only unlock when your timer starts, answer keys never reach your browser and tab switches are recorded with your entry. Any score can be disputed."],
       ["I'm from a tier-3 college. Does that matter?", "No. We don't ask for your college. Your rank comes only from what you do in tournaments and battles."],
       ["What if I score low?", "Your score is private by default. Only you see it until you choose to make it public. Practise with drills and battles, then enter the next tournament."],
       ["Who builds the tasks?", "We write them with working practitioners, based on what the role does in its first 90 days. Pilot hiring partners will add their own."]]
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
  <span class="badge red live" data-live-count>Tournaments live now</span>
  <h1 class="t-display">Tournaments</h1>
  <p class="lead">Real work, real time, real ranks. Every tournament is free to enter. Top finishers win interview fast-tracks to pilot partner roles.</p>
</div></section>
<section class="section"><div class="container">
  <div class="row between mb3">
    <div class="row" data-filter-group="#t-grid" role="group" aria-label="Filter by field">
      <button class="chip on" data-value="all" aria-pressed="true">All</button>
      ${Object.entries(catLabel).map(([k, v]) => `<button class="chip" data-value="${k}" aria-pressed="false">${v}</button>`).join("")}
    </div>
  </div>
  <div class="grid g3" id="t-grid"><p class="muted">Loading tournaments…</p>
    <div class="empty hide span2" data-empty><div class="icon">${ic("trophy")}</div><h3 class="t-h3">No tournaments in this field this week</h3><p class="muted t-sm">New ones are added every week.</p></div>
  </div>
</div></section>`,
});

// ---------- Leaderboard (public) ----------
const leaderTable = (me = false) => `
<div class="row between mb3">
  <div class="row" role="group" aria-label="Field">${["All fields", "Marketing", "Data", "Product", "Tech", "Sales", "Ops", "Design"].map((x, i) => `<button class="chip ${i === 0 ? "on" : ""}" data-toast="Showing ${x}">${x}</button>`).join("")}</div>
  <select class="input" style="width:auto;min-height:36px" aria-label="Region"><option>All India</option><option>Maharashtra</option><option>Karnataka</option><option>Delhi NCR</option><option>Tamil Nadu</option></select>
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
  <span class="badge blue">Live · updated after every tournament and battle</span>
  <h1 class="t-display">National leaderboard</h1>
  <p class="lead">Overall, by domain, by skill and in the battle arena. Names are shown only for people who chose to go public.</p>
</div></section>
<section class="section"><div class="container"><div id="lb-root"><p class="muted">Loading the leaderboard…</p></div>
  <div class="banner blue mt4"><span><strong>Want your name here?</strong> Tournaments and battles run every day.</span><a class="btn btn-primary" href="signup.html">Get ranked free</a></div>
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
    <p class="lead">Stop screening thousands of resumes for ten interviews. Hire from candidates who proved the exact skill in a timed, server-scored tournament — or host your own.</p>
    <div class="row"><a class="btn btn-primary btn-lg" href="contact.html?topic=employer">Join the hiring pilot</a><a class="btn btn-lg" href="recruiter.html">See a console preview</a></div>
    <p class="t-sm muted">Prefer email? Write to <a class="link" href="mailto:talks@rankculture.in">talks@rankculture.in</a>.</p>
  </div>
  <div class="grid g2">
    <div class="card kpi"><div class="label muted">Proof, not paper</div><p class="t-body mt1" style="font-weight:600">Every score comes from timed, server-scored work.</p></div>
    <div class="card kpi"><div class="label muted">Pilot</div><p class="t-body mt1" style="font-weight:600">Free for our first hiring partners.</p></div>
    <div class="card kpi dark span2"><div class="label" style="color:#9DB1FF">No pedigree filter</div><p class="t-h3 mt1">We don't collect college, gender or age. Candidates are ranked only on the work.</p></div>
  </div>
</div></section>
<section class="section"><div class="container">
  <div class="sec-head"><h2 class="t-h1">Two ways to hire</h2></div>
  <div class="grid g2">
    <div class="card card-lg stack"><span class="mono t-h1 blue">A</span><h3 class="t-h2">Search the leaderboard</h3><p class="muted">Filter by skill, score, tier and city. See exactly how each candidate performed, task by task. Opens to pilot partners soon.</p><a class="btn" href="recruiter.html">Preview talent search</a></div>
    <div class="card card-lg stack dark"><span class="mono t-h1" style="color:#9DB1FF">B</span><h3 class="t-h2">Host a hiring tournament</h3><p class="muted">Turn your real work into a 60-minute tournament. Candidates compete on it; you interview the top finishers.</p><a class="btn btn-primary" href="contact.html?topic=employer">Plan a tournament with us</a></div>
  </div>
</div></section>
<section class="section"><div class="container">
  <div class="sec-head"><h2 class="t-h1">Planned pricing for teams</h2><span class="label muted">Free during the pilot</span></div>
  <div class="grid g3">
    ${[["Starter", "Free", ["5 candidate unlocks / month", "Leaderboard search", "Direct messaging"]],
       ["Growth", "₹14,999/mo", ["50 unlocks / month", "1 hosted tournament / quarter", "Score breakdowns + work samples", "ATS export"]],
       ["Enterprise", "Custom", ["Unlimited unlocks", "Monthly hosted tournaments", "Custom task design with our panel", "Campus-free hiring programme"]]]
      .map(([n, p, f], i) => `<div class="card card-lg ${i === 1 ? "blue" : ""} stack"><div class="label">${n}</div><div class="mono t-h1">${p}</div><ul style="list-style:none" class="stack t-sm">${f.map(x => `<li class="row">${ic("check")}${x}</li>`).join("")}</ul><a class="btn ${i === 1 ? "btn-dark" : ""} btn-block" href="contact.html?topic=employer">${i === 2 ? "Talk to us" : "Join the pilot"}</a></div>`).join("")}
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
      <ul style="list-style:none" class="stack t-sm">${["All tournaments and battles", "Verified rank + tier", "Apply to all jobs", "Unlimited practice drills", "Public profile"].map(x => `<li class="row">${ic("check")}${x}</li>`).join("")}</ul>
      <a class="btn btn-block" href="signup.html">Start free</a></div>
    <div class="card card-lg blue stack" style="box-shadow:8px 8px 0 var(--ink)"><div class="row between"><div class="label">Pro</div><span class="badge dark">Coming soon</span></div><div><span class="mono t-display">₹199</span><span class="t-sm"> / month</span></div><p class="t-sm muted">₹99 with student ID.</p>
      <ul style="list-style:none" class="stack t-sm">${["Everything in Free", "Personal drill plans", "Deeper score analytics", "Priority fast-track queue", "See who viewed your rank"].map(x => `<li class="row">${ic("check")}${x}</li>`).join("")}</ul>
      <button class="btn btn-dark btn-block" data-modal="upgrade-modal">Join the Pro waitlist</button></div>
    <div class="card card-lg dark stack"><div class="label" style="color:#9DB1FF">Campus</div><div class="mono t-display">Free</div><p class="muted t-sm">For placement cells and college clubs.</p>
      <ul style="list-style:none" class="stack t-sm">${["Private college tournaments", "Batch rank reports", "Pro for every student at ₹49", "Placement officer dashboard"].map(x => `<li class="row">${ic("check")}${x}</li>`).join("")}</ul>
      <a class="btn btn-primary btn-block" href="contact.html?topic=college">Bring to my college</a><p class="t-xs" style="color:#A9ABB5">or email <a class="link" style="color:#9DB1FF" href="mailto:campus@rankculture.in">campus@rankculture.in</a></p></div>
  </div>
  <p class="t-xs muted center mt4">Planned prices, including GST. Pro and Campus aren't on sale during the pilot — everything you need to compete and get ranked is free.</p>
</div></section>
<div class="modal" id="upgrade-modal" role="dialog" aria-modal="true" aria-labelledby="up-h"><div class="card card-lg stack">
  <div class="row between"><h2 class="t-h2" id="up-h">Pro is coming after the pilot</h2><button class="icon-btn" data-close-modal aria-label="Close">${ic("x")}</button></div>
  <p class="t-sm muted">Nothing is for sale yet and we won't ask for payment. Everything you need to compete, get ranked and apply is free. Tell us you're interested and we'll email you when Pro opens.</p>
  <div class="row"><a class="btn btn-primary" href="contact.html?topic=pro-waitlist">Tell me when it opens</a><button class="btn" data-close-modal>Close</button></div>
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
    <p>Make ability visible and comparable. Tournaments built from real work. Scores that are timed, explainable and hard to fake. A leaderboard companies hire from.</p>
    <p>And instead of courses, drills: quick timed rounds on exactly the skill holding your rank back.</p></div>
</div></section>
<section class="section"><div class="container">
  <div class="sec-head"><h2 class="t-h1">What we believe</h2></div>
  <div class="grid g4">
    ${[["Merit over pedigree", "Your rank is earned. College and connections don't add points."], ["Practice over courses", "You learn by doing the work, not by watching someone talk about it."], ["Transparent scoring", "You see every point you lost and why."], ["Private by default", "Your score is yours. You choose who sees it."]].map(([h, p]) => `<div class="card"><h3 class="t-h3">${h}</h3><p class="t-sm muted mt1">${p}</p></div>`).join("")}
  </div>
</div></section>
<section class="section"><div class="container grid g2" style="gap:var(--s7);align-items:center">
  <div class="stack"><div class="label muted">Founder</div><h2 class="t-h1">Nakul Chaturvedi</h2><p class="muted">Civil engineer from NIT Surat who worked his way into founder's-office roles across fintech, media and real estate — and saw first-hand how much talent gets filtered out before anyone looks at the work.</p>
    <div class="row"><a class="link" href="https://www.linkedin.com/in/nakulchaturvediwork" target="_blank" rel="noopener">LinkedIn →</a><a class="link" href="mailto:talks@rankculture.in">talks@rankculture.in →</a></div></div>
  <div class="card dark card-lg"><p class="t-h2">"We're not building another job board. We're building the arena."</p></div>
</div></section>`,
});

// ---------- Contact ----------
const TOPICS = [["candidate", "Candidate — account or tournament help"], ["dispute", "Dispute a score"], ["employer", "Employer / hiring pilot"], ["college", "College placement cell"], ["pro-waitlist", "Tell me when Pro opens"], ["investor", "Investor / mentor"], ["press", "Press"], ["other", "Something else"]];
const contact = publicPage({
  title: "Contact & support",
  active: "",
  body: `
<section class="hero" style="padding-bottom:var(--s7)"><div class="container stack">
  <span class="badge blue">A real person reads every message</span>
  <h1 class="t-display">Contact & support</h1>
</div></section>
<section class="section"><div class="container grid g2" style="gap:var(--s7);align-items:start">
  <div id="c-wrap"><form class="card card-lg stack" id="c-form" novalidate>
    <div id="c-msg-box"></div>
    <div class="field"><label for="c-topic">What's it about?</label><select class="input" id="c-topic">${TOPICS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></div>
    <div class="field"><label for="c-name">Name</label><input class="input" id="c-name" maxlength="80" required autocomplete="name"></div>
    <div class="field"><label for="c-email">Email</label><input class="input" id="c-email" type="email" maxlength="254" required autocomplete="email"></div>
    <div class="field"><label for="c-msg">Message</label><textarea class="input" id="c-msg" maxlength="4000" required></textarea><span class="hint t-xs muted">For a score dispute, name the tournament and the task.</span></div>
    <button class="btn btn-primary btn-lg" type="submit">Send message</button>
  </form></div>
  <div class="stack">
    ${[["Candidates", "Account help, sign-in trouble, tournament or battle issues."], ["Score disputes", "Tell us the tournament and task. We re-check it and reply with what we found."], ["Employers & colleges", "Join the hiring pilot or run a private tournament for your campus."], ["Your data", "Export or delete everything yourself in Settings → Data, or ask us here."]]
      .map(([h, p]) => `<div class="card"><h3 class="t-h3">${h}</h3><p class="t-sm muted mt1">${p}</p></div>`).join("")}
    <div class="card stack"><h3 class="t-h3">Email us directly</h3>
      ${[["support@rankculture.in", "Account help, score disputes, your data"], ["talks@rankculture.in", "Employers, investors, mentors and press"], ["campus@rankculture.in", "College placement cells and clubs"]]
        .map(([a, d]) => `<div><a class="link t-sm" style="text-transform:none" href="mailto:${a}">${a}</a><p class="t-xs muted">${d}</p></div>`).join("")}
    </div>
    <p class="t-xs muted">We usually reply within two working days, to the email you give here.</p>
  </div>
</div></section>`,
});

// ---------- Legal ----------
const legal = (title, eyebrow, sections) => publicPage({
  title, active: "",
  body: `
<section class="hero" style="padding-bottom:var(--s7)"><div class="container stack">
  <span class="badge">${eyebrow}</span><h1 class="t-display">${title}</h1><p class="t-sm muted">Effective 8 November 2026 · Rank Culture is in its pilot. We'll tell signed-up users before these change in any important way.</p>
</div></section>
<section class="section"><div class="container grid" style="grid-template-columns:240px 1fr;gap:var(--s7);align-items:start">
  <nav class="card hide-m" style="position:sticky;top:88px"><div class="label muted mb2">Sections</div><div class="stack t-sm">${sections.map((s, i) => `<a href="#s${i}">${String(i + 1).padStart(2, "0")} ${s[0]}</a>`).join("")}</div></nav>
  <div class="stack-lg" style="max-width:68ch">${sections.map((s, i) => `<section id="s${i}" class="stack"><h2 class="t-h2">${String(i + 1).padStart(2, "0")} · ${s[0]}</h2>${s[1].map(p => `<p>${p}</p>`).join("")}</section>`).join("")}</div>
</div></section>
<style>@media(max-width:960px){.section .container.grid{grid-template-columns:1fr!important}}</style>`,
});

const terms = legal("Terms of service", "Legal", [
  ["Who we are", ["Rank Culture is a skill-ranking platform run by its founder, Nakul Chaturvedi, from India. You compete in timed tournaments and live battles, earn a rank, and can apply to roles with it. By creating an account you agree to these terms and to our <a class=\"link\" href=\"privacy.html\">privacy policy</a>."]],
  ["Who can join", ["You must be 18 or older and give us an email address you control. One account per person."]],
  ["Fair play", ["Do the work yourself — no outside help, no AI tools unless a task says so, and no sharing tournament questions or answers.", "Don't run more than one account, throw battles to boost someone's rating, or try to get around the timer or our systems.", "The timer runs on our server and tab switches are recorded with your entry. If we find cheating we can void scores, remove ratings and suspend accounts. You can ask us to review that decision through the contact form or at <a class=\"link\" href=\"mailto:support@rankculture.in\">support@rankculture.in</a>."]],
  ["How scoring works", ["Multiple-choice tasks and battle questions are scored automatically on our server. Written answers are saved with your entry but don't count toward your score during the pilot.", "If you think a score is wrong, tell us within 7 days through the <a class=\"link\" href=\"contact.html?topic=dispute\">contact form</a>. We'll re-check it and reply.", "Scores can't be bought, transferred or edited by you. Each tournament allows one attempt."]],
  ["Jobs and fast-tracks", ["During the pilot, the companies and roles on the jobs board are fictional examples and applications are not sent to any employer. We'll say clearly when a real partner role goes live.", "A fast-track means your application skips resume screening. It is not a promise of an interview or a job — employers make their own hiring decisions."]],
  ["Battles, rooms and hosted events", ["If you host an event, you're responsible for its name and who you invite. We can rename or remove events that are offensive or misleading.", "Practice bots fill empty seats; games against bots and private rooms don't change your arena rating."]],
  ["Company-style practice packs", ["Practice packs are original questions written by us in the style of each company's publicly described test format. They are not real test questions and aren't made, endorsed or checked by those companies."]],
  ["Your content", ["You own the answers you write. You let us store and score them, show them to you, and — only when you apply to a role — share your rank and task scores with that employer."]],
  ["Payments", ["Nothing on Rank Culture is for sale during the pilot and we won't ask for payment details. If we introduce paid plans we'll publish their terms first."]],
  ["Ending your account", ["You can delete your account any time in Settings → Data. It is deleted straight away. We can suspend accounts that break these terms."]],
  ["The pilot", ["Rank Culture is new and provided as it is. Features may change, and events can be cancelled or rescheduled. To the extent the law allows, we aren't liable for indirect losses from using the service."]],
  ["Contact", ["Questions about these terms? <a class=\"link\" href=\"contact.html?topic=other\">Send us a message</a> or email <a class=\"link\" href=\"mailto:support@rankculture.in\">support@rankculture.in</a>."]],
]);
const privacy = legal("Privacy policy", "Legal", [
  ["The short version", ["Your profile and scores are private by default. You choose whether your name appears on public leaderboards. We don't sell your data, show ads or use tracking cookies."]],
  ["What we collect", ["Account details: your email, the name you give us, and — if you sign in with GitHub or Google — the name on that account. If you set a password, our sign-in provider stores only a salted hash of it; nobody at Rank Culture can see it.", "Profile details you choose to add: city, career stage, main field, skills and your visibility settings.", "Activity: tournament answers (including written answers), when you started and submitted, how many times you switched tabs during a tournament, battle answers and how fast you gave them, your ratings and skill stats, and job applications with any note you add.", "Your job-ready goal (field and months), your path level, your practice answers and the interview answers you write, so we can track your progress and improve the coaching.", "Messages you send us through the contact form, and feedback and ratings you leave on tournaments, drills, battles and practice sets.", "Security data: our sign-in provider logs your IP address and browser details when you sign in, to protect accounts."]],
  ["What others can see", ["Other players in a battle see your first name and last initial and your score in that battle.", "Leaderboards show your name only if your visibility is set to Everyone; otherwise you appear as \"Hidden competitor\". Your city is shown only if you also turn on Show my city.", "\"Recruiters only\" visibility is stored for when the recruiter console opens; no recruiter can see your profile today. When you apply to a role, that employer will see your rank, task scores and note."]],
  ["Where it's stored", ["Your data is stored by Supabase (database and sign-in) in its Mumbai region, and the site is served by Vercel. Sign-in and password-reset emails (with one-time codes) are sent through Resend, from its Tokyo region. These providers process data only to run Rank Culture.", "To protect against data loss, a backup copy of account and activity data (never passwords) is saved to Rank Culture's private Google Drive after every 50 new sign-ups and once a week. Backups are read-only and only the founder can open them."]],
  ["On your device", ["We keep your sign-in session and any tournament answers you haven't submitted yet in your browser's storage, so a refresh doesn't lose your work. We use no advertising or analytics cookies."]],
  ["How long we keep it", ["We keep your data while your account exists. Deleting your account in Settings → Data removes your profile, ranks, entries, battle history, applications and messages straight away; copies in our providers' backups expire within their normal backup cycle, and our own Google Drive backups are kept for up to 12 months and then deleted.", "Messages sent without an account are kept for up to 12 months."]],
  ["Your rights", ["Under India's Digital Personal Data Protection Act, 2023 you can access, correct and erase your data and raise a grievance. Export or delete everything yourself in Settings → Data, correct your profile in Settings → Account, or <a class=\"link\" href=\"contact.html?topic=other\">contact us</a>. Our grievance contact is the founder, Nakul Chaturvedi: email <a class=\"link\" href=\"mailto:support@rankculture.in\">support@rankculture.in</a> or use the same form.", "You must be 18 or older to use Rank Culture."]],
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
