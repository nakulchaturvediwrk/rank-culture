const { barePage, ic, bar, tierBadge } = require("./layout");

const authSide = (title, body) => `
<aside class="auth-side">
  <div class="stack-lg">
    <span class="badge blue">Rank Culture</span>
    <h2 class="t-h1">${title}</h2>
    <p class="muted">${body}</p>
  </div>
  <div class="stack">
    <div class="row between t-sm"><span class="muted">This weekend</span><span class="badge red live">Live</span></div>
    <div class="list t-sm" style="border-top:1px solid #2A2B30">
      ${[["Growth Marketing Cup", "2,418"], ["SQL Sprint", "3,104"], ["Ops Case Showdown", "1,712"]].map(([n, c]) => `<div style="border-color:#2A2B30"><span>${n}</span><span class="mono">${c}</span></div>`).join("")}
    </div>
    <p class="t-xs muted">"I'm from a tier-3 college in Nagpur. Rank Culture got me 3 interviews in my first month." — Sneha P., #5 Sales</p>
  </div>
</aside>`;

const social = `
<div class="grid g2"><button class="btn" type="button" data-toast="Prototype: Google sign-in">${ic("user")} Google</button><button class="btn" type="button" data-toast="Prototype: LinkedIn sign-in">${ic("brief")} LinkedIn</button></div>
<div class="divider">or with email</div>`;

const login = barePage({
  title: "Log in",
  body: `
<div class="auth">${authSide("Welcome back, competitor.", "Your rank, your tournaments and your fast-tracks are waiting.")}
<div class="auth-form"><div class="stack-lg">
  <div class="stack"><h1 class="t-h1">Log in</h1><p class="muted t-sm">New here? <a class="link" href="signup.html">Create a free account</a></p></div>
  <div class="tabs" data-tabs role="tablist"><button class="on" data-tab="as-cand" role="tab" aria-selected="true">Candidate</button><button data-tab="as-rec" role="tab" aria-selected="false">Recruiter</button></div>
  <form class="stack" id="as-cand" data-go="dashboard.html" novalidate>
    ${social}
    <div class="field"><label for="l-email">Email</label><input class="input" id="l-email" type="email" required autocomplete="email" placeholder="you@example.com"><span class="err hint red hide">Enter a valid email</span></div>
    <div class="field"><div class="row between"><label for="l-pass">Password</label><a class="t-xs link" href="forgot-password.html">Forgot?</a></div>
      <div style="position:relative"><input class="input" id="l-pass" type="password" required autocomplete="current-password"><button type="button" class="btn btn-ghost btn-sm" style="position:absolute;right:4px;top:6px" data-reveal="#l-pass">Show</button></div><span class="err hint red hide">Enter your password</span></div>
    <label class="check"><input type="checkbox" checked> Keep me logged in on this device</label>
    <button class="btn btn-primary btn-lg btn-block" type="submit">Log in ${ic("arrow")}</button>
  </form>
  <form class="stack hide" id="as-rec" data-go="recruiter.html" novalidate>
    <div class="field"><label for="r-email">Work email</label><input class="input" id="r-email" type="email" required placeholder="you@company.com"><span class="err hint red hide">Use your work email</span></div>
    <div class="field"><label for="r-pass">Password</label><input class="input" id="r-pass" type="password" required><span class="err hint red hide">Enter your password</span></div>
    <button class="btn btn-dark btn-lg btn-block" type="submit">Open recruiter console</button>
    <p class="t-xs muted">Prototype: any email and password will work.</p>
  </form>
</div></div></div>`,
});

const signup = barePage({
  title: "Sign up",
  body: `
<div class="auth">${authSide("Fight to get hired. Not the traditional way.", "Free forever. No resume needed. Your first tournament could be this weekend.")}
<div class="auth-form"><div class="stack-lg">
  <div class="stack"><h1 class="t-h1">Get ranked free</h1><p class="muted t-sm">Already competing? <a class="link" href="login.html">Log in</a></p></div>
  <form class="stack" data-go="onboarding-1.html" novalidate>
    ${social}
    <div class="field"><label for="s-name">Full name</label><input class="input" id="s-name" required autocomplete="name"><span class="err hint red hide">Enter your name</span></div>
    <div class="field"><label for="s-email">Email</label><input class="input" id="s-email" type="email" required autocomplete="email"><span class="err hint red hide">Enter a valid email</span></div>
    <div class="grid g2">
      <div class="field"><label for="s-city">City</label><input class="input" id="s-city" required placeholder="e.g. Kota"><span class="err hint red hide">Enter your city</span></div>
      <div class="field"><label for="s-stage">I am</label><select class="input" id="s-stage"><option>In college</option><option>Graduated 0–2 yrs</option><option>Working 2+ yrs</option><option>Switching careers</option></select></div>
    </div>
    <div class="field"><label for="s-pass">Password</label><input class="input" id="s-pass" type="password" required autocomplete="new-password" minlength="8"><span class="hint">At least 8 characters</span><span class="err hint red hide">Choose a password</span></div>
    <label class="check"><input type="checkbox" required> <span>I agree to the <a class="link" href="terms.html">Terms</a> and <a class="link" href="privacy.html">Privacy policy</a>, including fair-play proctoring.</span></label>
    <button class="btn btn-primary btn-lg btn-block" type="submit">Create account ${ic("arrow")}</button>
    <p class="t-xs muted">Your profile is private until you choose to make it public.</p>
  </form>
</div></div></div>`,
});

const forgot = barePage({
  title: "Reset password",
  body: `
<div class="auth">${authSide("Locked out? Happens to the best.", "We'll send a reset link that works for 15 minutes.")}
<div class="auth-form"><div class="stack-lg">
  <a class="link" href="login.html">${ic("back")} Back to log in</a>
  <div class="steps"><div class="now"><div class="seg"></div><div class="label">1 · Email</div></div><div><div class="seg"></div><div class="label muted">2 · Check inbox</div></div><div><div class="seg"></div><div class="label muted">3 · New password</div></div></div>
  <div id="fp1" class="stack-lg">
    <div class="stack"><h1 class="t-h1">Reset password</h1><p class="muted">Enter the email on your account.</p></div>
    <div class="field"><label for="f-email">Email</label><input class="input" id="f-email" type="email" placeholder="you@example.com"></div>
    <button class="btn btn-primary btn-lg btn-block" onclick="document.getElementById('fp1').classList.add('hide');document.getElementById('fp2').classList.remove('hide');document.querySelectorAll('.steps>div')[1].className='now';document.querySelectorAll('.steps>div')[0].className='done'">Send reset link</button>
  </div>
  <div id="fp2" class="stack-lg hide">
    <div class="empty" style="padding:var(--s6)"><div class="icon">${ic("mail")}</div><h2 class="t-h2">Check your inbox</h2><p class="muted t-sm">We sent a link that expires in 15 minutes. Didn't get it? Check spam.</p></div>
    <button class="btn btn-block" data-toast="Link re-sent">Resend link</button>
    <button class="btn btn-primary btn-block" onclick="document.getElementById('fp2').classList.add('hide');document.getElementById('fp3').classList.remove('hide');document.querySelectorAll('.steps>div')[2].className='now';document.querySelectorAll('.steps>div')[1].className='done'">I clicked the link (prototype)</button>
  </div>
  <form id="fp3" class="stack-lg hide" data-go="login.html" data-toast-msg="Password updated — log in with your new password" novalidate>
    <h1 class="t-h1">New password</h1>
    <div class="field"><label for="np">New password</label><input class="input" id="np" type="password" required><span class="err hint red hide">Enter a new password</span></div>
    <div class="field"><label for="np2">Confirm</label><input class="input" id="np2" type="password" required><span class="err hint red hide">Confirm your password</span></div>
    <button class="btn btn-primary btn-lg btn-block" type="submit">Update password</button>
  </form>
</div></div></div>`,
});

// ---------- Onboarding ----------
const obShell = (step, body) => barePage({
  title: `Onboarding · Step ${step} of 3`,
  header: "none",
  body: `
<header class="header"><div class="container"><a class="logo" href="index.html"><svg viewBox="0 0 28 28"><rect width="28" height="28" fill="#0B0B0C"/><rect x="5" y="16" width="4.5" height="7" fill="#fff"/><rect x="11.75" y="11" width="4.5" height="12" fill="#fff"/><rect x="18.5" y="5" width="4.5" height="18" fill="#2D50CD"/></svg><span>Rank Culture</span></a><span class="label muted">Step ${step} of 3</span></div></header>
<div class="container section-sm" style="max-width:960px">
  <div class="steps mb3">${["Your field", "Your skills", "First tournament"].map((l, i) => `<div class="${i + 1 < step ? "done" : i + 1 === step ? "now" : ""}"><div class="seg"></div><div class="label ${i + 1 === step ? "" : "muted"}">${i + 1} · ${l}</div></div>`).join("")}</div>
  ${body}
</div>`,
});

const ob1 = obShell(1, `
<div class="stack-lg">
  <div class="stack"><h1 class="t-h1">What do you want to get hired for?</h1><p class="lead">Pick your main field. You can compete in others later.</p></div>
  <div class="grid g3" data-options="single" data-next="#ob1-next">
    ${[["Marketing", "Growth, content, performance, brand", "up"], ["Data & analytics", "SQL, Excel, dashboards, insights", "chart"], ["Product", "APM, PM, product ops", "target"], ["Sales", "BDR, account exec, partnerships", "send"], ["Operations", "Supply chain, D2C ops, founder's office", "grid"], ["Design", "UI, UX, visual, motion", "star"], ["Tech", "Backend, frontend, QA, DevOps", "bolt"], ["People ops", "Recruiting, HRBP, L&D", "users"], ["Finance", "FP&A, analyst, CA track", "file"]]
      .map(([h, p, i]) => `<button class="option" aria-pressed="false"><div class="row between"><span class="t-h3">${h}</span>${ic(i)}</div><p class="t-sm muted mt1">${p}</p></button>`).join("")}
  </div>
  <div class="row between bt" style="padding-top:var(--s5)"><a class="btn btn-ghost" href="signup.html">${ic("back")} Back</a><a class="btn btn-primary btn-lg" id="ob1-next" href="onboarding-2.html" disabled>Continue ${ic("arrow")}</a></div>
</div>`);

const ob2 = obShell(2, `
<div class="stack-lg">
  <div class="stack"><h1 class="t-h1">Which skills do you already have?</h1><p class="lead">Pick everything you've actually used. We'll suggest tournaments that test these first. <span class="mono"><span id="ob2-count">0</span> selected</span></p></div>
  <div class="grid g4" data-options="multi" data-next="#ob2-next" data-count="#ob2-count">
    ${["Copywriting", "SEO", "Meta ads", "Google ads", "Email marketing", "Funnel analysis", "Excel", "SQL", "Google Analytics", "Canva", "Social media", "Influencer marketing", "Market research", "Presentations", "Notion / docs", "A/B testing"]
      .map(s => `<button class="option" style="padding:var(--s4)" aria-pressed="false"><span class="t-sm" style="font-weight:700">${s}</span></button>`).join("")}
  </div>
  <div class="card soft"><div class="row">${ic("shield")}<p class="t-sm">These are just a starting point. Your score only comes from tournaments — nothing you tick here counts as points.</p></div></div>
  <div class="row between bt" style="padding-top:var(--s5)"><a class="btn btn-ghost" href="onboarding-1.html">${ic("back")} Back</a><a class="btn btn-primary btn-lg" id="ob2-next" href="onboarding-3.html" disabled>Continue ${ic("arrow")}</a></div>
</div>`);

const ob3 = obShell(3, `
<div class="stack-lg">
  <div class="stack"><h1 class="t-h1">Pick your first tournament</h1><p class="lead">This sets your starting rank. Don't overthink it — you can retake any format after 30 days.</p></div>
  <div class="grid g2" data-options="single" data-next="#ob3-next">
    ${[["Growth Marketing Cup", "Sat 25 Oct · 7:00 PM", "60 min", "Best match for your skills", true], ["Placement Sprint (practice)", "Any time", "20 min", "Warm-up. Doesn't affect rank.", false], ["SQL Sprint", "Sun 26 Oct · 11:00 AM", "45 min", "Tests your Excel + SQL", false], ["Product Teardown Clash", "Wed 29 Oct · 8:00 PM", "75 min", "Stretch pick", false]]
      .map(([n, w, d, why, rec]) => `<button class="option" aria-pressed="false"><div class="row between"><span class="t-h3">${n}</span>${rec ? '<span class="badge blue">Recommended</span>' : ""}</div><div class="row t-sm muted mt1"><span>${ic("clock")} ${w}</span><span class="mono">${d}</span></div><p class="t-sm mt1">${why}</p></button>`).join("")}
  </div>
  <div class="row between bt" style="padding-top:var(--s5)"><a class="btn btn-ghost" href="onboarding-2.html">${ic("back")} Back</a><div class="row"><a class="btn" href="dashboard.html">Skip for now</a><a class="btn btn-primary btn-lg" id="ob3-next" href="dashboard.html?welcome=1" disabled>Register & finish ${ic("arrow")}</a></div></div>
</div>`);

module.exports = { pages: { "login.html": login, "signup.html": signup, "forgot-password.html": forgot, "onboarding-1.html": ob1, "onboarding-2.html": ob2, "onboarding-3.html": ob3 } };
