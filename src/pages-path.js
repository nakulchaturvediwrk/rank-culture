// Job-ready path, weekly review and site feedback. Bodies are rendered/bound by src/rc-path.js.
const { appPage, barePage, publicPage, pageHead } = require("./layout");
module.exports = { pages: {
  "path.html": appPage({ title: "My path", active: "path.html", body: `<p class="muted">Loading…</p>` }),
  "review.html": barePage({ title: "Weekly review", body: `<div class="container section-sm"><p class="muted">Loading…</p></div>` }),
  "feedback.html": publicPage({ title: "Feedback", desc: "Tell us what to fix or build next on Rank Culture.", body: `
<section class="section-sm"><div class="container" style="max-width:720px">
  ${pageHead("Feedback", "Help us build the next tournament", "Every note is read before we write next week's tournaments and drills. Bugs, confusing questions, skills you want — all of it.")}
  <form class="card card-lg stack" id="site-fb" data-target="" novalidate>
    <h2 class="t-h3">How is Rank Culture working for you?</h2>
    <div class="row" role="group" aria-label="Rating">${[1, 2, 3, 4, 5].map(v => `<button type="button" class="chip" data-rate="${v}" aria-pressed="false" aria-label="${v} out of 5">${"★".repeat(v)}</button>`).join("")}</div>
    <div class="field"><label for="fb-site">What should we change or add?</label><textarea class="input" id="fb-site" rows="5" maxlength="1000" placeholder="e.g. More SQL interview questions, the timer feels too short, a bug on the results page…"></textarea></div>
    <p class="t-xs muted" id="fb-note">Don't include passwords or personal details.</p>
    <div class="row"><button class="btn btn-primary" type="submit">Send feedback</button><a class="btn btn-ghost" href="contact.html">Need a reply? Contact us</a></div>
  </form>
</div></section>` }),
} };
