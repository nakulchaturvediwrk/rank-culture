// Job-ready path, feedback cards and the weekly review page. Plugged into the page handlers in rc.js.
module.exports = function install(H, c) {
  const { sb, $, $$, esc, q, render, toast, busy, friendly, main, params, ic, pageHead, FIELDS, n, bar } = c;

  const LEVELS = ["Foundation", "Core", "Applied", "Advanced", "Interview-ready"];
  const levelName = l => (l >= 6 ? "Job-ready" : LEVELS[l - 1]);
  const SELF = [["0", "Missed it"], ["1", "Weak"], ["2", "Okay"], ["3", "Good"], ["4", "Interview-ready"]];
  const STATUS = { ahead: ["Ahead of plan", "green"], on_track: ["On track", "blue"], behind: ["Behind plan", "amber"], done: ["Job-ready ✓", "green"] };
  const fieldOpts = sel => Object.entries(FIELDS).map(([k, v]) => `<option value="${k}"${k === sel ? " selected" : ""}>${esc(v)}</option>`).join("");
  const monthOpts = sel => Array.from({ length: 10 }, (_, i) => i + 3).map(m => `<option value="${m}"${m === sel ? " selected" : ""}>${m} months</option>`).join("");

  // ---------- Feedback card (tournaments, drills, battles, path sets) ----------
  const fbCard = (kind, target, title) => `<form class="card stack" data-fb="${esc(kind)}" data-target="${esc(target || "")}" novalidate>
    <h2 class="t-h3">${esc(title || "How was this?")}</h2>
    <p class="t-sm muted">Your feedback shapes next week's tournaments and drills.</p>
    <div class="row" role="group" aria-label="Rating">${[1, 2, 3, 4, 5].map(v => `<button type="button" class="chip" data-rate="${v}" aria-pressed="false" aria-label="${v} out of 5">${"★".repeat(v)}</button>`).join("")}</div>
    <div class="field"><label class="sr" for="fb-${esc(kind)}">What should we change?</label><textarea class="input" id="fb-${esc(kind)}" rows="2" maxlength="1000" placeholder="Too easy? Confusing question? A skill you want next week?"></textarea></div>
    <div class="row"><button class="btn btn-sm btn-dark" type="submit">Send feedback</button></div></form>`;
  const fillFeedback = (root = document) => {
    $$("[data-fb-slot]", root).forEach(s => { s.outerHTML = fbCard(s.dataset.kind, s.dataset.target, s.dataset.title); });
    $$("form[data-fb]", root).forEach(f => {
      if (f.dataset.bound) return; f.dataset.bound = "1";
      let rating = null;
      $$("[data-rate]", f).forEach(b => b.addEventListener("click", () => {
        rating = Number(b.dataset.rate);
        $$("[data-rate]", f).forEach(x => { const on = Number(x.dataset.rate) === rating; x.classList.toggle("on", on); x.setAttribute("aria-pressed", String(on)); });
      }));
      f.addEventListener("submit", async e => {
        e.preventDefault();
        const text = $("textarea", f).value.trim(), btn = $("button[type=submit]", f);
        if (!rating && !text) return toast("Pick a rating or write a line");
        busy(btn, true, "Sending…");
        try {
          await q(sb.rpc("send_feedback", { p_kind: f.dataset.fb, p_target: f.dataset.target || null, p_rating: rating, p_comment: text || null, p_page: location.pathname.split("/").pop() || "index.html" }));
          f.innerHTML = `<h2 class="t-h3">Thanks — got it.</h2><p class="t-sm muted">We read every note before building next week's tournaments.</p>`;
        } catch (err) { busy(btn, false); toast(friendly(err)); }
      });
    });
  };
  c.fbCard = fbCard; c.fillFeedback = fillFeedback;

  // Results page: add a feedback card once the result has rendered.
  const wrap = (page, after) => { const orig = H[page]; H[page] = async (...a) => { if (orig) await orig(...a); try { await after(...a); } catch (e) { console.error(e); } }; };
  wrap("results.html", () => fillFeedback(main()));

  // ---------- Site-wide feedback page ----------
  H["feedback.html"] = async signedIn => {
    const f = $("#site-fb"); if (!f) return;
    f.dataset.fb = "site"; fillFeedback(f.parentElement);
    if (!signedIn) $("#fb-note").textContent = "You're not signed in — that's fine. Sign in if you'd like us to be able to follow up.";
  };

  // ---------- Dashboard: path summary card ----------
  wrap("dashboard.html", async () => {
    const st = await q(sb.rpc("path_state")), m = main(); if (!m) return;
    const box = document.createElement("div"); box.className = "mb3";
    box.innerHTML = st
      ? `<a class="card row between" href="path.html" style="gap:var(--s4)"><span class="stack" style="gap:var(--s1)"><span class="label muted">My path · ${esc(FIELDS[st.field] || st.field)} · week ${st.week} of ${st.weeks}</span><strong>${st.level >= 6 ? "You've finished the path — keep sharp with weekly tournaments" : `Level ${st.level}: ${levelName(st.level)}`}</strong></span><span class="row" style="gap:var(--s2)"><span class="badge ${STATUS[st.status][1]}">${STATUS[st.status][0]}</span><span class="btn btn-sm btn-primary">Practise</span></span></a>`
      : `<a class="card row between" href="path.html"><span><strong>Set your job-ready goal</strong><br><span class="t-sm muted">Pick a field and 3–12 months. We'll build your week-by-week path.</span></span><span class="btn btn-sm btn-primary">Set goal</span></a>`;
    const anchor = $(".page-head", m) || m.firstElementChild; if (anchor) anchor.after(box); else m.prepend(box);
  });

  // ---------- My path ----------
  H["path.html"] = async () => {
    const me = c.me();
    const goalForm = (st, intro) => `<form class="card card-lg stack" id="goal" novalidate>${intro}
      <div class="grid g2"><div class="field"><label for="g-field">I want to get hired in</label><select class="input" id="g-field">${fieldOpts(st ? st.field : me.profile.field || "data")}</select></div>
      <div class="field"><label for="g-months">Job-ready in</label><select class="input" id="g-months">${monthOpts(st ? st.months : 6)}</select></div></div>
      ${st ? '<p class="t-xs muted">Changing your field restarts the path at Foundation. Changing only the months keeps your level.</p>' : ""}
      <div class="row"><button class="btn btn-primary" type="submit">${st ? "Update goal" : "Build my path"}</button></div></form>`;
    const bindGoal = () => $("#goal").addEventListener("submit", async e => {
      e.preventDefault(); const b = $("#goal button[type=submit]"); busy(b, true, "Saving…");
      try { await q(sb.rpc("set_path", { p_field: $("#g-field").value, p_months: Number($("#g-months").value) })); location.reload(); }
      catch (err) { busy(b, false); toast(friendly(err)); }
    });

    const st = await q(sb.rpc("path_state"));
    if (!st) {
      render(`${pageHead("My path", "Get job-ready, step by step", "Tell us the role and your timeline. You'll climb five levels — from basics to interview rounds — with questions that get harder only when you're ready.")}
        ${goalForm(null, '<h2 class="t-h3">Set your goal</h2>')}`);
      return bindGoal();
    }

    const ladder = LEVELS.map((l, i) => { const k = i + 1, cur = k === st.level, done = k < st.level;
      return `<div class="card stack" style="gap:var(--s1);${cur ? "border-color:var(--blue);box-shadow:4px 4px 0 var(--blue)" : ""}"><span class="label ${done ? "green" : cur ? "blue" : "muted"}">${done ? "✓ Done" : cur ? "You are here" : `Level ${k}`}</span><strong>${l}</strong></div>`; }).join("");
    const pctMcq = Math.min(100, Math.round(100 * st.mcq_done / st.mcq_needed));
    const weekPct = Math.min(100, Math.round(100 * st.done_this_week / Math.max(1, st.weekly_target)));
    render(`${pageHead(`My path · ${esc(FIELDS[st.field] || st.field)}`, st.level >= 6 ? "You're job-ready" : `Level ${st.level}: ${levelName(st.level)}`,
        `Week ${st.week} of ${st.weeks} on your ${st.months}-month plan. Questions get harder only when you've mastered this level.`,
        `<span class="badge ${STATUS[st.status][1]}">${STATUS[st.status][0]}</span>`)}
      <div class="grid g3 mb3" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">${ladder}</div>
      <div class="grid g3 mb3">
        <div class="card card-lg stack span2"><h2 class="t-h3">${st.level >= 6 ? "Keep your edge" : `To reach ${levelName(st.level + 1)}`}</h2>
          ${st.level >= 6 ? '<p class="t-sm muted">You cleared all five levels. Weekly tournaments and battles keep your rank fresh for recruiters.</p>' : `
          <div class="stack" style="gap:var(--s2)"><div class="row between t-sm"><span>Questions answered at this level</span><span class="mono">${st.mcq_done}/${st.mcq_needed}</span></div>${bar(pctMcq, pctMcq >= 100 ? "blue" : "")}</div>
          <div class="row between t-sm"><span>Accuracy on your last 20 (need ${st.accuracy_needed}%)</span><span class="mono ${st.accuracy >= st.accuracy_needed ? "green" : ""}">${st.mcq_done ? st.accuracy + "%" : "—"}</span></div>
          ${st.interview_needed ? `<div class="row between t-sm"><span>Interview answers rated Good or better</span><span class="mono">${st.interview_ok}/${st.interview_needed}</span></div>` : ""}`}
          <div class="row"><button class="btn btn-primary btn-lg" id="go-set">${ic("play")} Start a practice set</button><span class="t-xs muted">${st.left_mcq + st.left_interview > 0 ? `${n(st.left_mcq + st.left_interview)} new questions waiting at this level` : "New questions arrive every Monday"}</span></div></div>
        <div class="card card-lg dark stack"><div class="label" style="color:#9DB1FF">This week</div>
          <div class="score"><span class="num">${st.done_this_week}</span><span class="of">/ ${st.weekly_target}</span></div>
          <div class="bar" style="border-color:#fff;background:transparent"><i style="width:${weekPct}%;background:var(--blue)"></i></div>
          <p class="t-sm muted">${st.status === "behind" ? "You're behind plan — a few extra sets this week catches you up." : "Questions to stay on your timeline."}</p></div>
      </div>
      <div id="practice"></div>
      <details class="card mt3"><summary class="t-h3">Change my goal</summary><div class="mt2">${goalForm(st, "")}</div></details>`);
    bindGoal();
    $("#go-set").addEventListener("click", () => runSet(st));
  };

  // One practice set: 10 items, instant feedback, interview items with model answers + self-check.
  async function runSet(st0) {
    const box = $("#practice"), btn = $("#go-set"); busy(btn, true, "Loading…");
    let items;
    try { items = await q(sb.rpc("path_next", { p_count: 10 })); } catch (e) { busy(btn, false); return toast(friendly(e)); }
    busy(btn, false);
    if (!items.length) { box.innerHTML = `<div class="banner mb3"><span><strong>You've answered everything at this level for now.</strong> New questions arrive every Monday, and anything you got wrong comes back for review the next day.</span></div>`; return; }
    let i = 0, right = 0, mcqs = 0, leveled = false, state = st0;
    box.scrollIntoView({ behavior: "smooth", block: "start" });
    const finish = () => {
      box.innerHTML = `<div class="card card-lg stack mb3"><div class="label muted">Set complete</div><h2 class="t-h2">${mcqs ? `${right}/${mcqs} correct` : "Interview practice done"}</h2>
        ${leveled ? `<div class="banner blue"><span><strong>Level up!</strong> You're now at ${esc(levelName(state.level))}. Questions get harder from here.</span></div>` : ""}
        <div class="row"><button class="btn btn-primary" id="again">Another set</button><a class="btn" href="path.html">Back to my path</a></div></div>
        <div data-fb-slot data-kind="path" data-target="${esc(state.field)}:${state.level}" data-title="How was this set?"></div>`;
      fillFeedback(box);
      $("#again").addEventListener("click", () => runSet(state));
    };
    const show = () => {
      if (i >= items.length) return finish();
      const it = items[i], head = `<div class="row between"><span class="label muted">Question ${i + 1} of ${items.length} · ${esc(it.skill)}</span><span class="badge">${esc(levelName(it.level))}</span></div>`;
      const ctx = `${it.context ? `<p class="t-sm muted">${esc(it.context)}</p>` : ""}${it.table_data && it.table_data.head ? `<div class="table-wrap"><table><thead><tr>${it.table_data.head.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${(it.table_data.rows || []).map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : ""}`;
      if (it.kind === "mcq") {
        box.innerHTML = `<div class="card card-lg stack mb3">${head}<h2 class="t-h3">${esc(it.prompt)}</h2>${ctx}
          <div class="stack" id="opts">${it.options.map((o, k) => `<button class="option" data-k="${k}"><span class="mono">${"ABCDEF"[k]}</span> ${esc(o)}</button>`).join("")}</div><div id="why"></div></div>`;
        $$("#opts .option").forEach(b => b.addEventListener("click", async () => {
          $$("#opts .option").forEach(x => { x.disabled = true; });
          try {
            const r = await q(sb.rpc("path_answer", { p_item: it.id, p_choice: Number(b.dataset.k) }));
            mcqs++; if (r.correct) right++; if (r.leveled_up) leveled = true; state = r.state;
            $$("#opts .option").forEach(x => { const k = Number(x.dataset.k); if (k === r.answer) x.classList.add("selected"); if (k === Number(b.dataset.k) && !r.correct) x.style.borderColor = "var(--red)"; });
            $("#why").innerHTML = `<div class="banner ${r.correct ? "green" : "red"} mt2"><span><strong>${r.correct ? "Correct." : `Not quite — the answer is ${"ABCDEF"[r.answer]}.`}</strong> ${esc(r.explanation || "")}</span><button class="btn btn-sm btn-primary" id="nx">Next ${ic("arrow")}</button></div>`;
            $("#nx").addEventListener("click", () => { i++; show(); }); $("#nx").focus();
          } catch (e) { $$("#opts .option").forEach(x => { x.disabled = false; }); toast(friendly(e)); }
        }));
      } else {
        box.innerHTML = `<div class="card card-lg stack mb3">${head}<div class="label blue">Interview round</div><h2 class="t-h3">${esc(it.prompt)}</h2>${ctx}
          ${it.rubric && it.rubric.length ? `<p class="t-xs muted">Interviewers look for: ${it.rubric.map(esc).join(" · ")}</p>` : ""}
          <div class="field"><label for="iv-a">Your answer (as you'd say it in the interview)</label><textarea class="input" id="iv-a" rows="7" maxlength="4000" placeholder="Aim for 120–250 words. Use a clear structure."></textarea><p class="t-xs muted" id="iv-count">0 words</p></div>
          <div class="row"><button class="btn btn-primary" id="iv-go">Check against a model answer</button><button class="btn btn-ghost" id="iv-skip">Skip</button></div><div id="iv-out"></div></div>`;
        const ta = $("#iv-a");
        ta.addEventListener("input", () => { $("#iv-count").textContent = `${(ta.value.trim().match(/\S+/g) || []).length} words`; });
        $("#iv-skip").addEventListener("click", () => { i++; show(); });
        $("#iv-go").addEventListener("click", async () => {
          const ans = ta.value.trim(), b = $("#iv-go");
          if (ans.length < 40) { ta.classList.add("error"); return toast("Write a proper answer first — a few sentences, as you'd say it"); }
          busy(b, true, "Checking…");
          try {
            const r = await q(sb.rpc("path_reveal", { p_item: it.id, p_answer: ans }));
            ta.readOnly = true; b.remove(); $("#iv-skip").remove();
            const low = ans.toLowerCase(), words = (ans.match(/\S+/g) || []).length;
            const hits = (r.key_points || []).map(k => ({ label: k.label, hit: (k.words || []).some(w => low.includes(String(w).toLowerCase())) }));
            const cover = hits.length ? Math.round(100 * hits.filter(h => h.hit).length / hits.length) : null;
            const tips = [];
            if (words < 80) tips.push("Too short for an interview answer — aim for 120–250 words.");
            if (words > 350) tips.push("Long — interviewers lose the thread past ~2 minutes. Cut to the strongest points.");
            if (!/\d/.test(ans)) tips.push("Add at least one number (a %, ₹, count or time). Numbers make answers credible.");
            if (hits.length && cover < 50) tips.push("You missed most of the key points below — compare with the model answer.");
            $("#iv-out").innerHTML = `<div class="grid g2 mt2" style="align-items:start">
              <div class="stack">${cover != null ? `<div class="row between"><strong>Key points covered</strong><span class="mono">${cover}%</span></div>${bar(cover, cover >= 75 ? "blue" : "")}
                <ul class="stack t-sm" style="gap:var(--s1)">${hits.map(h => `<li>${h.hit ? "✓" : "✗"} ${esc(h.label)}</li>`).join("")}</ul>` : ""}
                ${tips.length ? `<div class="banner amber"><span>${tips.map(esc).join("<br>")}</span></div>` : '<div class="banner green"><span>Good length, specific and structured. Now compare the detail.</span></div>'}
                ${(r.rubric || []).length ? `<div><strong class="t-sm">Rubric</strong><ul class="t-sm muted">${r.rubric.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}</div>
              <div class="card stack" style="background:var(--paper)"><strong class="t-sm">Model answer</strong><p class="t-sm" style="white-space:pre-line">${esc(r.model_answer)}</p>${r.explanation ? `<p class="t-xs muted">${esc(r.explanation)}</p>` : ""}</div></div>
              <div class="stack mt2"><strong class="t-sm">Be honest — how close was yours?</strong><div class="row" role="group" aria-label="Self check">${SELF.map(([v, l]) => `<button class="chip" data-self="${v}">${l}</button>`).join("")}</div></div>`;
            $$("[data-self]").forEach(sb2 => sb2.addEventListener("click", async () => {
              $$("[data-self]").forEach(x => { x.disabled = true; });
              try { const s = await q(sb.rpc("path_self_score", { p_item: it.id, p_score: Number(sb2.dataset.self) })); if (s.leveled_up) leveled = true; state = s.state; i++; show(); }
              catch (e) { $$("[data-self]").forEach(x => { x.disabled = false; }); toast(friendly(e)); }
            }));
          } catch (e) { busy(b, false); toast(friendly(e)); }
        });
      }
    };
    show();
  }

  // ---------- Weekly review page (link from the Sunday email) ----------
  H["review.html"] = async () => {
    const id = params().get("b"), tok = params().get("t"), m = main();
    const view = async (data) => {
      const p = data.payload, st = data.status;
      const badge = { draft: ["Waiting for you — goes live Monday 10:00 IST unless you hold it", "amber"], approved: ["Approved", "blue"], held: ["On hold — won't go live", "red"], published: ["Live on rankculture.in", "green"], failed: ["Couldn't publish: " + (data.publish_error || ""), "red"] }[st] || [st, ""];
      const byField = {}; p.path_items.forEach(x => { (byField[x.domain] = byField[x.domain] || []).push(x); });
      render(`<div class="container section-sm">${pageHead(`Weekly review · week of ${esc(data.week_start)}`, "Next week's tournaments", data.summary ? esc(data.summary) : "", "")}
        <div class="banner ${badge[1]} mb3"><span><strong>${esc(badge[0])}</strong></span>
          <span class="row">${st === "draft" || st === "approved" ? `<button class="btn btn-primary btn-sm" data-act="approve">Approve & publish now</button><button class="btn btn-sm" data-act="hold">Hold</button>` : st === "held" ? `<button class="btn btn-sm" data-act="release">Release (publish Monday)</button><button class="btn btn-primary btn-sm" data-act="approve">Approve & publish now</button>` : ""}</span></div>
        <div class="grid g3 mb3"><div class="card"><div class="label muted">Tournaments</div><div class="t-h2 mono">${p.tournaments.length}</div></div><div class="card"><div class="label muted">Practice questions</div><div class="t-h2 mono">${p.path_items.filter(x => x.kind === "mcq").length}</div></div><div class="card"><div class="label muted">Interview questions</div><div class="t-h2 mono">${p.path_items.filter(x => x.kind === "interview").length}</div></div></div>
        ${p.feedback_notes ? `<div class="card stack mb3"><h2 class="t-h3">What students said — and what changed</h2><p class="t-sm" style="white-space:pre-line">${esc(p.feedback_notes)}</p></div>` : ""}
        <h2 class="t-h2 mb2">Tournaments</h2>
        <div class="stack mb4">${p.tournaments.map(t => `<details class="card" open><summary class="row between"><span><span class="badge">${esc(FIELDS[t.cat] || t.cat)}</span> <strong>${esc(t.name)}</strong></span><span class="t-xs muted mono">${esc(new Date(t.opens_at).toLocaleDateString("en-IN"))} → ${esc(new Date(t.closes_at).toLocaleDateString("en-IN"))} · ${t.duration_min} min</span></summary>
          <p class="t-sm muted mt1">${esc(t.blurb)}</p>
          <ol class="stack mt2">${t.questions.map(qq => `<li class="stack" style="gap:var(--s1)"><div class="row between"><strong class="t-sm">${esc(qq.label)}</strong><span class="mono t-xs">${qq.kind === "mcq" ? qq.points + " pts" : "written · not scored"}</span></div><p class="t-sm">${esc(qq.prompt)}</p>${qq.context ? `<p class="t-xs muted">${esc(qq.context)}</p>` : ""}
            ${qq.options ? `<ul class="t-sm">${qq.options.map((o, k) => `<li>${k === qq.correct ? "✅ <strong>" + esc(o) + "</strong>" : esc(o)}</li>`).join("")}</ul>` : ""}${qq.why ? `<p class="t-xs muted">Why: ${esc(qq.why)}</p>` : ""}</li>`).join("")}</ol></details>`).join("")}</div>
        <h2 class="t-h2 mb2">New practice for the job-ready path</h2>
        <div class="stack">${Object.entries(byField).map(([f, xs]) => `<details class="card"><summary><strong>${esc(FIELDS[f] || f)}</strong> <span class="t-xs muted">${xs.length} questions · levels ${[...new Set(xs.map(x => x.level))].sort().join(", ")}</span></summary>
          <ol class="stack mt2">${xs.sort((a, b) => a.level - b.level).map(x => `<li class="stack" style="gap:var(--s1)"><span class="t-xs muted">L${x.level} ${esc(levelName(x.level))} · ${esc(x.skill)} · ${x.kind === "mcq" ? "MCQ" : "Interview"}</span><p class="t-sm">${esc(x.prompt)}</p>
            ${x.kind === "mcq" ? `<ul class="t-sm">${x.options.map((o, k) => `<li>${k === x.correct ? "✅ <strong>" + esc(o) + "</strong>" : esc(o)}</li>`).join("")}</ul>${x.explanation ? `<p class="t-xs muted">${esc(x.explanation)}</p>` : ""}` : `<p class="t-xs muted" style="white-space:pre-line"><strong>Model answer:</strong> ${esc(x.model_answer)}</p>`}</li>`).join("")}</ol></details>`).join("")}</div></div>`, m);
      $$("[data-act]").forEach(b => b.addEventListener("click", async () => {
        busy(b, true, "Working…");
        try { view(await q(sb.rpc("decide_batch", { p_batch: id, p_token: tok, p_action: b.dataset.act }))); toast(b.dataset.act === "approve" ? "Published — it's live" : b.dataset.act === "hold" ? "Held — nothing goes live" : "Released for Monday"); }
        catch (e) { busy(b, false); toast(friendly(e)); }
      }));
      const act = params().get("do");
      if (act && !view.didAct && (st === "draft" || st === "held")) { view.didAct = true; const b = $(`[data-act="${act === "approve" ? "approve" : act === "hold" ? "hold" : ""}"]`); if (b) b.scrollIntoView({ block: "center" }); }
    };
    if (!id || !tok) return render(`<div class="container section-sm"><div class="empty"><h1 class="t-h2">Review link missing</h1><p class="muted">Open the link from the Sunday email.</p></div></div>`, m);
    await view(await q(sb.rpc("review_batch", { p_batch: id, p_token: tok })));
  };
};
