const { barePage, ic, bar, tierBadge, logo, logoFull } = require("./layout");

const authSide = (title, body) => `
<aside class="auth-side">
  <div class="stack-lg">
    <a href="index.html" aria-label="The Rank Culture — home">${logoFull(150)}</a>
    <h2 class="t-h1">${title}</h2>
    <p class="muted">${body}</p>
  </div>
  <div class="stack">
    <div class="label muted">How it works</div>
    <div class="list t-sm" style="border-top:1px solid #2A2B30">
      ${[["Compete", "Free tournaments & live battles"], ["Get ranked", "A verified score per skill"], ["Get hired", "Fast-tracks to partner roles"]].map(([n, c]) => `<div style="border-color:#2A2B30"><span>${n}</span><span class="muted">${c}</span></div>`).join("")}
    </div>
  </div>
</aside>`;

const googleBtn = `<button class="btn btn-lg btn-block" type="button" data-oauth="google"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.8z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"/></svg> Continue with Google</button>
<button class="btn btn-lg btn-block" type="button" data-oauth="github"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z"/></svg> Continue with GitHub</button>
<div class="divider">or with your email</div>`;

// Email + password is the main way in; a one-time sign-in link stays as a fallback.
const pwField = (id, label, auto, hint = "") => `<div class="field"><label for="${id}">${label}</label><div class="row" style="gap:var(--s2);flex-wrap:nowrap"><input class="input" id="${id}" type="password" required autocomplete="${auto}" minlength="8" maxlength="72" style="flex:1"><button class="btn" type="button" data-reveal="#${id}" aria-label="Show password">Show</button></div>${hint ? `<span class="hint t-xs muted">${hint}</span>` : ""}</div>`;
const PW_HINT = "At least 8 characters, with a letter and a number.";
const codeStep = (what) => `
<form class="stack hide" id="code-form" novalidate>
  <div class="card soft"><div class="row">${ic("mail")}<p class="t-sm">We emailed ${what} to <strong id="sent-to"></strong>. Type the code below (or open the link in the email on this device). It can take a minute — check spam too.</p></div></div>
  <div class="field"><label for="a-code">Code from the email</label><input class="input mono" id="a-code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="12345678"></div>
  <button class="btn btn-primary btn-block" type="submit">Continue ${ic("arrow")}</button>
  <div class="row between"><button class="btn btn-ghost btn-sm" type="button" id="a-resend">Resend email</button><button class="btn btn-ghost btn-sm" type="button" id="a-back">Use a different email</button></div>
</form>`;
const legalLine = `<p class="t-xs muted">By continuing you confirm you're 18 or older and agree to the <a class="link" href="terms.html">Terms</a> and <a class="link" href="privacy.html">Privacy policy</a>.</p>`;

const login = barePage({
  title: "Log in",
  body: `
<div class="auth">${authSide("Welcome back, competitor.", "Your rank, your tournaments and your fast-tracks are waiting.")}
<div class="auth-form"><div class="stack-lg">
  <a class="auth-mlogo" href="index.html" aria-label="The Rank Culture — home">${logoFull(88)}</a>
  <div class="stack"><h1 class="t-h1">Log in</h1><p class="muted t-sm">New here? <a class="link" href="signup.html">Create a free account</a></p></div>
  <div id="auth-msg"></div>
  <form class="stack" id="pw-form" novalidate>
    ${googleBtn}
    <div class="field"><label for="a-email">Email</label><input class="input" id="a-email" type="email" required autocomplete="username" placeholder="you@example.com"></div>
    ${pwField("a-pass", "Password", "current-password")}
    <div class="row between t-sm"><a class="link" href="forgot-password.html">Forgot password?</a><button class="link" type="button" id="a-link-mode">Log in with an email code instead</button></div>
    <button class="btn btn-primary btn-lg btn-block" type="submit">Log in ${ic("arrow")}</button>
    ${legalLine}
    <p class="t-xs muted">Recruiter? Employer accounts are invite-only during the pilot — <a class="link" href="contact.html?topic=employer">request access</a>.</p>
  </form>
  <form class="stack hide" id="otp-form" novalidate>
    <div class="field"><label for="a-email2">Email</label><input class="input" id="a-email2" type="email" required autocomplete="email" placeholder="you@example.com"></div>
    <button class="btn btn-primary btn-lg btn-block" type="submit">Email me a sign-in code ${ic("arrow")}</button>
    <button class="btn btn-ghost btn-block" type="button" id="a-pw-mode">Log in with a password instead</button>
  </form>
  ${codeStep("a one-time sign-in code")}
</div></div></div>`,
});

const signup = barePage({
  title: "Sign up",
  body: `
<div class="auth">${authSide("Fight to get hired. Not the traditional way.", "Free forever. No resume needed. Your first tournament could be this weekend.")}
<div class="auth-form"><div class="stack-lg">
  <a class="auth-mlogo" href="index.html" aria-label="The Rank Culture — home">${logoFull(88)}</a>
  <div class="stack"><h1 class="t-h1">Get ranked free</h1><p class="muted t-sm">Already competing? <a class="link" href="login.html">Log in</a></p></div>
  <div id="auth-msg"></div>
  <form class="stack" id="pw-form" novalidate>
    ${googleBtn}
    <div class="field"><label for="a-name">Full name</label><input class="input" id="a-name" required autocomplete="name" maxlength="80"></div>
    <div class="field"><label for="a-email">Email</label><input class="input" id="a-email" type="email" required autocomplete="email" placeholder="you@example.com"></div>
    ${pwField("a-pass", "Create a password", "new-password", PW_HINT)}
    <label class="check"><input type="checkbox" id="a-terms"> <span>I'm 18 or older and agree to the <a class="link" href="terms.html">Terms</a> and <a class="link" href="privacy.html">Privacy policy</a>, including fair-play checks.</span></label>
    <button class="btn btn-primary btn-lg btn-block" type="submit">Create account ${ic("arrow")}</button>
    <p class="t-xs muted">Your profile is private until you choose to make it public.</p>
  </form>
  ${codeStep("a one-time code to confirm your email")}
</div></div></div>`,
});

const forgot = barePage({
  title: "Reset your password",
  body: `
<div class="auth">${authSide("Locked out? Happens to everyone.", "We'll send you a one-time code. Enter it with your new password and you're back in — your rank and history stay as they are.")}
<div class="auth-form"><div class="stack-lg">
  <a class="auth-mlogo" href="index.html" aria-label="The Rank Culture — home">${logoFull(88)}</a>
  <a class="link" href="login.html">${ic("back")} Back to log in</a>
  <div class="stack"><h1 class="t-h1">Reset your password</h1><p class="muted">Signed up with Google or GitHub, or never set a password? This sets one for you.</p></div>
  <div id="auth-msg"></div>
  <div class="tabs hide" role="tablist" id="rp-via"><button class="on" type="button" role="tab" aria-selected="true" data-via="email">Email</button><button type="button" role="tab" aria-selected="false" data-via="phone">Phone</button></div>
  <form class="stack" id="reset-form" novalidate>
    <div class="field" id="rp-email-f"><label for="a-email">Email you signed up with</label><input class="input" id="a-email" type="email" required autocomplete="email" placeholder="you@example.com"></div>
    <div class="field hide" id="rp-phone-f"><label for="a-phone">Mobile number on your account</label><div class="row" style="gap:var(--s2);flex-wrap:nowrap"><span class="input" style="flex:none;width:auto">+91</span><input class="input" id="a-phone" type="tel" inputmode="tel" autocomplete="tel-national" maxlength="14" placeholder="98765 43210" style="flex:1"></div><span class="hint t-xs muted">Works if you've added and verified this number in Settings.</span></div>
    <button class="btn btn-primary btn-lg btn-block" type="submit">Send me a code ${ic("arrow")}</button>
  </form>
  <form class="stack hide" id="rp-code-form" novalidate>
    <div class="card soft"><div class="row">${ic("mail")}<p class="t-sm">If an account exists for <strong id="sent-to"></strong>, we've sent it a one-time code. It can take a minute — check spam too.</p></div></div>
    <div class="field"><label for="rp-code">Code</label><input class="input mono" id="rp-code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="12345678"></div>
    ${pwField("np-pass", "New password", "new-password", PW_HINT)}
    ${pwField("np-pass2", "Type it again", "new-password")}
    <button class="btn btn-primary btn-lg btn-block" type="submit">Reset password and log in ${ic("arrow")}</button>
    <div class="row between"><button class="btn btn-ghost btn-sm" type="button" id="rp-resend">Resend code</button><button class="btn btn-ghost btn-sm" type="button" id="rp-back">Start again</button></div>
  </form>
  <p class="t-sm muted">Lost access to your email and phone? <a class="link" href="contact.html">Contact support</a>.</p>
</div></div></div>`,
});

const resetPw = barePage({
  title: "Set a new password",
  body: `
<div class="auth">${authSide("Almost there.", "Choose a new password and you're back in.")}
<div class="auth-form"><div class="stack-lg">
  <a class="auth-mlogo" href="index.html" aria-label="The Rank Culture — home">${logoFull(88)}</a>
  <div class="stack"><h1 class="t-h1">Set a new password</h1><p class="muted t-sm" id="np-for">Checking your reset link…</p></div>
  <div id="auth-msg"></div>
  <form class="stack hide" id="np-form" novalidate>
    ${pwField("np-pass", "New password", "new-password", PW_HINT)}
    ${pwField("np-pass2", "Type it again", "new-password")}
    <button class="btn btn-primary btn-lg btn-block" type="submit">Save password and continue ${ic("arrow")}</button>
  </form>
</div></div></div>`,
});

const callback = barePage({ title: "Signing you in", header: "public", body: `<div class="container section-sm"><p class="muted">Signing you in…</p></div>` });
const mfa = barePage({ title: "Two-step verification", header: "public", body: `<div class="container section-sm"><p class="muted">Loading…</p></div>` });

// ---------- Onboarding ----------
const obShell = (step, body) => barePage({
  title: `Onboarding · Step ${step} of 3`,
  header: "none",
  body: `
<header class="header"><div class="container">${logo()}<span class="label muted">Step ${step} of 3</span></div></header>
<div class="container section-sm" style="max-width:960px">
  <div class="steps mb3">${["Your field", "Your skills", "First tournament"].map((l, i) => `<div class="${i + 1 < step ? "done" : i + 1 === step ? "now" : ""}"><div class="seg"></div><div class="label ${i + 1 === step ? "" : "muted"}">${i + 1} · ${l}</div></div>`).join("")}</div>
  ${body}
</div>`,
});

const ob1 = obShell(1, `
<div class="stack-lg">
  <div class="stack"><h1 class="t-h1">What do you want to get hired for?</h1><p class="lead">Pick your main field. You can compete in others later.</p></div>
  <div class="grid g2"><div class="field"><label for="ob-city">City</label><input class="input" id="ob-city" maxlength="60" placeholder="e.g. Kota" autocomplete="address-level2"></div>
    <div class="field"><label for="ob-stage">I am</label><select class="input" id="ob-stage"><option value="college">In college</option><option value="grad_0_2">Graduated 0–2 yrs</option><option value="working_2_plus">Working 2+ yrs</option><option value="switching">Switching careers</option></select></div></div>
  <div class="grid g3" data-options="single" data-next="#ob1-next">
    ${[["Marketing", "Growth, content, performance, brand", "up"], ["Data & analytics", "SQL, Excel, dashboards, insights", "chart"], ["Product", "APM, PM, product ops", "target"], ["Sales", "BDR, account exec, partnerships", "send"], ["Operations", "Supply chain, D2C ops, founder's office", "grid"], ["Design", "UI, UX, visual, motion", "star"], ["Tech", "Backend, frontend, QA, DevOps", "bolt"], ["People ops", "Recruiting, HRBP, L&D", "users"], ["Finance", "FP&A, analyst, CA track", "file"]]
      .map(([h, p, i]) => `<button class="option" aria-pressed="false"><div class="row between"><span class="t-h3">${h}</span>${ic(i)}</div><p class="t-sm muted mt1">${p}</p></button>`).join("")}
  </div>
  <div class="row between bt" style="padding-top:var(--s5)"><span></span><a class="btn btn-primary btn-lg" id="ob1-next" href="onboarding-2.html" disabled>Continue ${ic("arrow")}</a></div>
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
  <div class="row between bt" style="padding-top:var(--s5)"><a class="btn btn-ghost" href="onboarding-2.html">${ic("back")} Back</a><div class="row"><a class="btn" href="dashboard.html" id="ob3-skip">Skip for now</a><a class="btn btn-primary btn-lg" id="ob3-next" href="dashboard.html?welcome=1" disabled>Register & finish ${ic("arrow")}</a></div></div>
</div>`);

module.exports = { pages: { "login.html": login, "signup.html": signup, "forgot-password.html": forgot, "reset-password.html": resetPw, "onboarding-1.html": ob1, "onboarding-2.html": ob2, "onboarding-3.html": ob3, "auth-callback.html": callback, "mfa.html": mfa } };
