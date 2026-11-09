// Battles, knockouts and leaderboards. Plugged into the page handlers in rc.js.
module.exports = function install(H, c) {
  const { sb, $, $$, esc, q, render, toast, busy, friendly, modal, main, params, go, ic, pageHead, tierBadge, FIELDS, n, fmt, errorState, bar } = c;
  const DOMAINS = { mixed: "All fields", marketing: "Marketing", data: "Data", product: "Product", sales: "Sales", ops: "Operations", design: "Design", tech: "Tech", hr: "People Ops" };
  const SIZES = [[2, "1v1 Duel", "Head to head. 7 questions."], [4, "4-player", "Squad battle. 8 questions."], [6, "6-player", "Bigger lobby, same clock."], [10, "10-player", "Max chaos. 8 questions."]];
  const EXTRA = { aptitude: "Aptitude", workstyle: "Work style", consulting: "Consulting" };
  let PACKS = [];
  const loadPacks = async () => { if (!PACKS.length) { try { PACKS = await q(sb.rpc("packs_list")); } catch (e) { PACKS = []; } } return PACKS; };
  const label = d => { if (d && d.startsWith("pack:")) { const p = PACKS.find(x => "pack:" + x.id === d); return p ? p.name : "Company pack"; } return DOMAINS[d] || FIELDS[d] || EXTRA[d] || d; };
  const packOf = d => (d && d.startsWith("pack:") ? PACKS.find(x => "pack:" + x.id === d) : null);
  const disclaimer = p => `Original practice questions in the style of ${esc(p.company)}'s publicly described test format. Not affiliated with or endorsed by ${esc(p.company)}; real tests change, so check their careers site.`;
  const domainSel = (id, val, withMixed = true) => `<select class="input" id="${id}" style="min-height:44px"><optgroup label="Job skills">${Object.entries(DOMAINS).filter(([k]) => withMixed || k !== "mixed").map(([k, v]) => `<option value="${k}"${k === val ? " selected" : ""}>${v}</option>`).join("")}</optgroup>${PACKS.length ? `<optgroup label="Company-style packs">${PACKS.map(p => `<option value="pack:${esc(p.id)}"${"pack:" + p.id === val ? " selected" : ""}>${esc(p.name)}</option>`).join("")}</optgroup>` : ""}</select>`;
  const typeLabel = t => (t === "fff" ? "Fastest Finger" : t === "knockout" ? "Knockout" : "Showdown");
  const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0"); };
  const until = (iso, now) => { const ms = new Date(iso) - now; return ms > 86400000 ? fmt(iso) : ms > 0 ? "in " + mmss(ms) : "now"; };
  const copy = async (text, msg) => { try { await navigator.clipboard.writeText(text); toast(msg || "Copied"); } catch (e) { toast(text); } };
  const ordinal = k => k + (k % 10 === 1 && k % 100 !== 11 ? "st" : k % 10 === 2 && k % 100 !== 12 ? "nd" : k % 10 === 3 && k % 100 !== 13 ? "rd" : "th");

  // ---------- Leaderboards ----------
  const KINDS = [["overall", "Overall"], ["domain", "By domain"], ["skill", "By skill"], ["arena", "Battle arena"]];
  const NOTE = {
    overall: () => "Each person's best tournament rating across all domains (0–1000).",
    domain: k => `Tournament rating in ${esc(FIELDS[k] || k)} (0–1000). Moves after every ranked tournament.`,
    skill: k => `Accuracy on every tournament and battle question tagged ${esc(k)}, smoothed so a lucky streak doesn't top the board. Needs 3+ questions to appear.`,
    arena: () => "Battle Elo from 1v1 and group battles with at least two real players. Everyone starts at 1200. Bot practice doesn't count.",
  };
  async function leaderboard(root, signedIn, base) {
    const p = params(), kind = KINDS.some(k => k[0] === p.get("k")) ? p.get("k") : "overall";
    const skills = await q(sb.rpc("skills_list"));
    let key = p.get("key") || "";
    const me = signedIn && c.me();
    if (kind === "domain" && !FIELDS[key]) key = me ? c.bestField() : "marketing";
    if (kind === "skill" && !skills.some(s => s.skill === key)) key = (skills[0] || {}).skill || "";
    const myCity = me && me.profile.city && me.profile.show_city ? me.profile.city : "";
    const city = (p.get("city") || "").slice(0, 60);
    const rows = await q(sb.rpc("leaderboard_v2", { p_kind: kind, p_key: key || null, p_city: city || null, p_limit: 50 }));
    const url = o => `${base}?${new URLSearchParams(Object.assign({ k: kind, key, city }, o)).toString()}`;
    const total = rows.length ? Number(rows[0].total) : 0, mine = rows.find(r => r.is_me);
    const byDomain = {}; skills.forEach(s => { (byDomain[s.domain] = byDomain[s.domain] || []).push(s.skill); });
    const tierCol = kind === "overall" || kind === "domain";
    render(`<div class="tabs mb3" role="tablist">${KINDS.map(([k, l]) => `<a class="${k === kind ? "on" : ""}" href="${url({ k, key: "" })}" role="tab" aria-selected="${k === kind}">${l}</a>`).join("")}</div>
    <div class="row between mb3" style="gap:var(--s3)">
      <div class="row" style="gap:var(--s3);flex:1;min-width:240px">
        ${kind === "domain" ? `<label class="sr" for="lb-key">Domain</label><select class="input" id="lb-key" style="max-width:260px;min-height:44px">${Object.entries(FIELDS).map(([k, v]) => `<option value="${k}"${k === key ? " selected" : ""}>${esc(v)}</option>`).join("")}</select>` : ""}
        ${kind === "skill" ? `<label class="sr" for="lb-key">Skill</label><select class="input" id="lb-key" style="max-width:300px;min-height:44px">${Object.entries(byDomain).map(([d, list]) => `<optgroup label="${esc(FIELDS[d] || EXTRA[d] || d)}">${list.map(s => `<option${s === key ? " selected" : ""}>${esc(s)}</option>`).join("")}</optgroup>`).join("")}</select>` : ""}
      </div>
      ${signedIn ? `<div class="row" role="group" aria-label="Region"><a class="chip ${city ? "" : "on"}" href="${url({ city: "" })}">All India</a>${myCity ? `<a class="chip ${city ? "on" : ""}" href="${url({ city: myCity })}">${esc(myCity)}</a>` : ""}</div>`
        : `<form class="row" id="lb-city" style="gap:var(--s2)"><input class="input" name="city" placeholder="Filter by city" value="${esc(city)}" style="max-width:200px;min-height:44px" aria-label="City"><button class="btn">Filter</button>${city ? `<a class="btn btn-ghost" href="${url({ city: "" })}">Clear</a>` : ""}</form>`}
    </div>
    ${mine ? `<div class="grid g3 mb3"><div class="card kpi"><div class="label muted">Your rank</div><div class="v mt1">#${n(mine.place)}</div><div class="t-xs muted">of ${n(total)}${city ? " in " + esc(city) : ""}</div></div><div class="card kpi"><div class="label muted">Your score</div><div class="v mt1">${mine.score}</div></div><div class="card kpi"><div class="label muted">Top</div><div class="v mt1">${Math.max(1, Math.round(Number(mine.place) / total * 100))}%</div></div></div>` : ""}
    <p class="t-sm muted mb2">${NOTE[kind](key)}</p>
    ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Rank</th><th>Competitor</th><th>${kind === "overall" ? "Best domain" : kind === "skill" ? "Record" : "Played"}</th>${tierCol ? "<th>Tier</th>" : ""}<th style="text-align:right">${kind === "arena" ? "Rating" : "Score"}</th></tr></thead><tbody>
      ${rows.map((r, i) => `${i > 0 && Number(r.place) > Number(rows[i - 1].place) + 1 ? `<tr><td colspan="${tierCol ? 5 : 4}" class="center t-xs muted">· · ·</td></tr>` : ""}<tr${r.is_me ? ' class="me"' : ""}><td class="rank-pos">${String(r.place).padStart(2, "0")}</td><td><strong>${esc(r.name)}</strong>${r.city ? `<div class="t-xs muted">${esc(r.city)}</div>` : ""}</td><td class="t-sm">${esc(kind === "overall" ? FIELDS[r.detail] || r.detail : r.detail)}</td>${tierCol ? `<td>${tierBadge(r.score)}</td>` : ""}<td class="mono" style="text-align:right">${r.score}</td></tr>`).join("")}
    </tbody></table></div><p class="t-xs muted mt2">"Hidden competitor" means a ranked player who keeps their name private. ${signedIn ? `Show yours in <a class="link" href="settings.html">Settings → Visibility</a>.` : ""}</p>`
      : `<div class="empty"><div class="icon">${ic("chart")}</div><h3 class="t-h3">Nobody ranked here yet${city ? " in " + esc(city) : ""}</h3><p class="muted t-sm">${kind === "arena" ? "Win a battle against a real opponent to get on this board." : "Play a tournament or battle to be the first."}</p><a class="btn btn-primary" href="${signedIn ? (kind === "arena" || kind === "skill" ? "battles.html" : "arena.html") : "signup.html"}">${signedIn ? "Compete now" : "Get ranked free"}</a></div>`}`, root);
    const sel = $("#lb-key", root); if (sel) sel.addEventListener("change", () => { location.href = url({ key: sel.value }); });
    const f = $("#lb-city", root); if (f) f.addEventListener("submit", e => { e.preventDefault(); location.href = url({ city: f.city.value.trim() }); });
  }
  H["leaderboard-app.html"] = async () => {
    render(`${pageHead("Global rankings", "Leaderboards", "Overall, by domain, by skill and in the battle arena.")}<div id="lb-root"></div>`);
    await leaderboard($("#lb-root"), true, "leaderboard-app.html");
  };
  // Homepage preview: top 5 overall, live.
  c.homeBoard = async () => {
    const tb = $("#home-lb"); if (!tb) return;
    try {
      const rows = (await q(sb.rpc("leaderboard_v2", { p_kind: "overall", p_limit: 5 }))).filter(r => Number(r.place) <= 5);
      tb.innerHTML = rows.length ? rows.map(r => `<tr><td class="rank-pos">${String(r.place).padStart(2, "0")}</td><td><strong>${esc(r.name)}</strong>${r.city ? `<div class="t-xs muted">${esc(r.city)}</div>` : ""}</td><td class="t-sm">${esc(FIELDS[r.detail] || r.detail)}</td><td class="mono" style="text-align:right">${r.score}</td></tr>`).join("")
        : `<tr><td colspan="4" class="t-sm muted">No one's ranked yet — the first tournament winner takes #1.</td></tr>`;
    } catch (e) { tb.innerHTML = `<tr><td colspan="4" class="t-sm muted">Leaderboard unavailable right now.</td></tr>`; }
  };
  H["leaderboard.html"] = async signedIn => { const r = $("#lb-root"); if (r) await leaderboard(r, signedIn, "leaderboard.html"); };


  // ---------- Drills ----------
  // Short timed rounds against practice bots in the field (or company pack) where you lose the most points.
  const startDrill = async (btn, domain) => {
    busy(btn, true, "Starting…");
    try { const id = await q(sb.rpc("battle_room", { p_size: 4, p_scoring: "classic", p_domain: domain })); await q(sb.rpc("battle_start_now", { p_id: id, p_fill: true })); location.href = `battle.html?id=${id}`; }
    catch (e) { busy(btn, false); toast(friendly(e)); }
  };
  H["drills.html"] = async () => {
    const [stats] = await Promise.all([q(sb.from("skill_stats").select("skill, domain, attempted, correct")), loadPacks()]);
    const weak = stats.filter(x => x.attempted >= 2).map(x => Object.assign(x, { acc: x.correct / x.attempted })).sort((a, b) => a.acc - b.acc || b.attempted - a.attempted).slice(0, 6);
    const dom = d => (DOMAINS[d] && d !== "mixed" ? d : "mixed");
    const me = c.me(), mine = me.profile.field && DOMAINS[me.profile.field] ? me.profile.field : "mixed";
    render(`${pageHead("No courses. Just reps.", "Drills", "Quick timed rounds — 8 questions, 20 seconds each — against practice bots. Free and unlimited during the pilot. Drills don't change your rank, but every answer feeds your skill stats.")}
    ${weak.length ? `<div class="card card-lg dark stack mb3"><div class="label" style="color:#9DB1FF">Recommended for you</div><h2 class="t-h2">${esc(weak[0].skill)} is costing you the most points</h2><p class="muted t-sm">You've got ${weak[0].correct} of ${weak[0].attempted} right in ${esc(weak[0].skill)}. A drill in ${esc(label(dom(weak[0].domain)))} gives you more reps on it.</p><div class="row"><button class="btn btn-primary" data-drill="${esc(dom(weak[0].domain))}">${ic("play")} Start a drill</button></div></div>
    <h2 class="t-h3 mb2">Your weakest skills</h2><div class="grid g3 mb3">${weak.map(x => `<div class="card stack"><div class="row between"><strong>${esc(x.skill)}</strong><span class="mono t-sm">${x.correct}/${x.attempted}</span></div>${bar(Math.round(x.acc * 100), x.acc >= .8 ? "blue" : "")}<div class="row between"><span class="t-xs muted">${esc(label(dom(x.domain)))}</span><button class="btn btn-sm" data-drill="${esc(dom(x.domain))}">Drill</button></div></div>`).join("")}</div>`
      : `<div class="banner blue mb3"><span><strong>No skill data yet.</strong> Play a tournament, a battle or any drill below — we'll then point you at the skills where you lose points.</span></div>`}
    <h2 class="t-h3 mb2">Drill a field</h2>
    <div class="grid g3 mb3">${Object.entries(DOMAINS).map(([k, v]) => `<div class="card row between"><span><strong>${esc(v)}</strong>${k === mine ? '<br><span class="t-xs muted">Your main field</span>' : ""}</span><button class="btn btn-sm ${k === mine ? "btn-primary" : ""}" data-drill="${k}">Start</button></div>`).join("")}</div>
    ${PACKS.length ? `<h2 class="t-h3 mb2">Company-style practice</h2><div class="grid g3">${PACKS.map(p => `<div class="card row between"><span><strong>${esc(p.name)}</strong><br><span class="t-xs muted">${n(p.questions)} questions</span></span><button class="btn btn-sm" data-drill="pack:${esc(p.id)}">Start</button></div>`).join("")}</div><p class="t-xs muted mt2">Original practice questions in each company's publicly described format. Not affiliated with or endorsed by those companies.</p>` : ""}`);
    $$("[data-drill]").forEach(b => b.addEventListener("click", () => startDrill(b, b.dataset.drill)));
  };

  // ---------- Battles hub ----------
  H["battles.html"] = async () => {
    const [hub] = await Promise.all([q(sb.rpc("battle_hub")), loadPacks()]), now = Date.now(), me = c.me();
    let mode = "classic", dom = me.profile.field && DOMAINS[me.profile.field] ? me.profile.field : "mixed";
    const rt = hub.rating;
    const evRow = e => {
      const href = e.type === "knockout" ? `knockout.html?id=${esc(e.id)}` : `battle.html?id=${esc(e.id)}`;
      const live = e.status === "live" || e.status === "running";
      return `<div class="card row between" style="gap:var(--s4)"><div class="stack" style="gap:var(--s1);flex:1;min-width:220px">
        <div class="row" style="gap:var(--s2)"><span class="badge ${e.type === "knockout" ? "blue" : e.type === "fff" ? "amber" : ""}">${typeLabel(e.type)}</span><span class="badge">${esc(label(e.domain))}</span>${e.is_private ? '<span class="badge">Private</span>' : ""}${live ? '<span class="badge red live">Live</span>' : ""}</div>
        <div><strong>${esc(e.title)}</strong></div><div class="t-sm muted">${live ? "Happening now" : fmt(e.starts_at)} · ${n(e.count)}${e.type === "knockout" ? ` of ${e.size} entered` : ` joined`}${e.code ? ` · code <span class="mono">${esc(e.code)}</span>` : ""}</div></div>
        ${e.joined ? `<a class="btn ${live ? "btn-primary" : ""}" href="${href}">${live ? "Enter" : "Joined ✓ · Open"}</a>` : live ? `<a class="btn" href="${href}">${e.type === "knockout" ? "Watch bracket" : "View"}</a>` : `<button class="btn btn-dark" data-ev-join="${esc(e.type)}:${esc(e.id)}">Join</button>`}</div>`;
    };
    const local = d => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 16); };
    render(`${pageHead("Live skill battles", "Battles", "Same questions, same clock. Fast, correct answers win — and every answer feeds your skill rankings.", `<button class="btn" data-modal="code-modal">${ic("lock")} Join with code</button><a class="btn" href="leaderboard-app.html?k=arena">${ic("chart")} Arena board</a>`)}
    ${hub.active.length ? `<div class="banner blue mb3"><span><strong>You're in a battle:</strong> ${esc(hub.active[0].title || "Battle")} · ${esc(hub.active[0].status)}</span><a class="btn btn-primary btn-sm" href="battle.html?id=${esc(hub.active[0].id)}">Rejoin</a></div>` : ""}
    <div class="grid g3"><div class="card card-lg span2 stack-lg">
      <div class="row between" style="gap:var(--s3)"><h2 class="t-h3">Quick match</h2>
        <div class="row" style="gap:var(--s3)"><div class="row" role="group" aria-label="Mode" id="qm-mode"><button class="chip on" data-mode="classic" aria-pressed="true">Classic</button><button class="chip" data-mode="fff" aria-pressed="false">Fastest finger</button></div>
        <label class="sr" for="qm-dom">Domain</label>${domainSel("qm-dom", dom)}</div></div>
      <p class="t-sm muted" id="qm-help">Classic: 100 points per correct answer plus up to 100 for speed.</p>
      <div class="grid g2">${SIZES.map(([s, h, d]) => `<div class="card stack" style="gap:var(--s2)"><div class="row between"><strong>${h}</strong>${ic(s === 2 ? "swords" : "users")}</div><p class="t-xs muted">${d}</p><div class="row" style="gap:var(--s2)"><button class="btn btn-primary btn-sm" data-quick="${s}">Find match</button><button class="btn btn-ghost btn-sm" data-room="${s}">Private room</button></div></div>`).join("")}</div>
      <p class="t-xs muted">No opponent yet? After 20 seconds you can fill empty seats with practice bots. Bot games and private rooms don't change your arena rating, but every answer counts towards your skill stats.</p>
    </div>
    <div class="card card-lg dark stack"><div class="label" style="color:#9DB1FF">Arena rating</div>
      <div class="score"><span class="num">${rt ? rt.rating : 1200}</span></div>
      <p class="t-sm muted">${rt && rt.played ? `#${n(hub.arena_place)} in the arena · ${rt.wins} win${rt.wins === 1 ? "" : "s"} from ${rt.played} rated battle${rt.played === 1 ? "" : "s"}` : "Starts at 1200. Beat real players to climb."}</p>
      <a class="btn btn-primary btn-block" href="leaderboard-app.html?k=arena">See the arena leaderboard</a></div></div>

    ${PACKS.length ? `<div class="sec-head mt4" style="margin-bottom:var(--s3)"><h2 class="t-h2">Company-style practice</h2></div>
    <p class="t-sm muted mb3" style="max-width:70ch">Original questions written to match each company's publicly described test format, so you can practise the real thing against the clock. None of these companies wrote, supplied or endorse these questions.</p>
    <div class="grid g3">${PACKS.map(p => `<div class="card stack"><div class="row between"><span class="badge">${esc(p.company)}</span><span class="mono t-xs muted">${n(p.questions)} Qs</span></div>
      <h3 class="t-h3">${esc(p.name)}</h3><p class="t-sm muted">${esc(p.blurb)}</p><p class="t-xs muted">${esc(p.sections)}</p>
      <div class="row" style="gap:var(--s2)"><button class="btn btn-primary btn-sm" data-pack-solo="${esc(p.id)}">Practise vs bots</button><button class="btn btn-sm" data-pack-duel="${esc(p.id)}">Find a 1v1</button></div>
      ${/^https:\/\//.test(p.source_url || "") ? `<a class="link t-xs" href="${esc(p.source_url)}" target="_blank" rel="noopener noreferrer">Where the format comes from ↗</a>` : ""}</div>`).join("")}</div>` : ""}

    <div class="sec-head mt4" style="margin-bottom:var(--s5)"><h2 class="t-h2">Showdowns, fastest finger & knockouts</h2></div>
    <div class="stack">${hub.events.length ? hub.events.map(evRow).join("") : '<p class="muted">Nothing scheduled this week yet — host one below.</p>'}</div>

    <div class="grid g2 mt4" style="align-items:start">
      <form class="card card-lg stack" id="host-form" novalidate><h2 class="t-h3">Host an event</h2><p class="t-sm muted">For your college, team or friends. Private — players join with your invite code.</p>
        <div class="grid g2"><div class="field"><label for="h-type">Format</label><select class="input" id="h-type"><option value="showdown">Showdown · everyone at once</option><option value="fff">Fastest finger · first correct wins</option><option value="knockout">Knockout bracket · 1v1 rounds</option></select></div>
        <div class="field"><label for="h-dom">Domain</label>${domainSel("h-dom", dom)}</div></div>
        <div class="field"><label for="h-title">Event name</label><input class="input" id="h-title" maxlength="60" placeholder="e.g. SVNIT Marketing Cup"></div>
        <div class="grid g2"><div class="field"><label for="h-at">Starts</label><input class="input" id="h-at" type="datetime-local" value="${local(new Date(now + 3600000))}"></div>
        <div class="field"><label for="h-size">Max players</label><select class="input" id="h-size"></select></div></div>
        <button class="btn btn-primary" type="submit">Create event</button><div id="host-out"></div></form>
      <div class="card card-lg stack"><h2 class="t-h3">How scoring works</h2><ul class="stack t-sm" style="padding-left:20px">
        <li><strong>Classic</strong> — 20 seconds per question. Correct = 100 points + up to 100 for speed.</li>
        <li><strong>Fastest finger</strong> — 15 seconds. Only the first correct answer scores, so speed is everything.</li>
        <li><strong>Showdowns</strong> — scheduled live events for hundreds of players, with a live leaderboard.</li>
        <li><strong>Knockouts</strong> — seeded by arena rating. 5-question duels; the winner advances until one champion is left.</li>
        <li>Arena rating moves only in public matches, scheduled events and knockouts with at least two real players — private rooms are for practice.</li><li>Ties break on total answer time. The answer key never reaches your browser.</li></ul></div></div>

    <div class="mt4"><h2 class="t-h3 mb2">Your recent battles</h2>${hub.recent.length ? `<div class="table-wrap"><table><thead><tr><th>Battle</th><th>Mode</th><th>Finish</th><th style="text-align:right">Rating</th></tr></thead><tbody>${hub.recent.map(r => `<tr><td><a class="link" href="battle.html?id=${esc(r.id)}">${esc(r.title || "Battle")}</a><div class="t-xs muted">${esc(label(r.domain))}</div></td><td class="t-sm">${r.scoring === "fff" ? "Fastest finger" : "Classic"}</td><td class="mono">${ordinal(r.place)} / ${r.count}</td><td class="mono ${r.delta > 0 ? "green" : r.delta < 0 ? "red" : "muted"}" style="text-align:right">${r.delta == null ? "Practice" : (r.delta > 0 ? "+" : "") + r.delta}</td></tr>`).join("")}</tbody></table></div>` : '<p class="muted t-sm">No battles yet. Pick a size above and go.</p>'}</div>
    ${modal("code-modal", "Join with a code", `<form class="stack" id="code-form"><div class="field"><label for="j-code">Invite code</label><input class="input mono" id="j-code" maxlength="8" autocomplete="off" style="text-transform:uppercase"></div><div class="row"><button class="btn" type="button" data-close-modal>Cancel</button><button class="btn btn-primary" type="submit">Join</button></div></form>`)}`);

    const help = $("#qm-help");
    $$("#qm-mode .chip").forEach(b => b.addEventListener("click", () => {
      mode = b.dataset.mode; $$("#qm-mode .chip").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", String(x === b)); });
      help.textContent = mode === "fff" ? "Fastest finger: only the first correct answer to each question scores 100." : "Classic: 100 points per correct answer plus up to 100 for speed.";
    }));
    $("#qm-dom").addEventListener("change", e => { dom = e.target.value; });
    const launch = async (btn, fn, size) => { busy(btn, true, "Finding…"); try { const id = await q(sb.rpc(fn, { p_size: size, p_scoring: mode, p_domain: dom })); location.href = `battle.html?id=${id}`; } catch (e) { busy(btn, false); toast(friendly(e)); } };
    $$("[data-quick]").forEach(b => b.addEventListener("click", () => launch(b, "battle_quick", Number(b.dataset.quick))));
    $$("[data-pack-solo]").forEach(b => b.addEventListener("click", async () => {
      busy(b, true, "Starting…");
      try { const id = await q(sb.rpc("battle_room", { p_size: 4, p_scoring: "classic", p_domain: "pack:" + b.dataset.packSolo })); await q(sb.rpc("battle_start_now", { p_id: id, p_fill: true })); location.href = `battle.html?id=${id}`; }
      catch (e) { busy(b, false); toast(friendly(e)); }
    }));
    $$("[data-pack-duel]").forEach(b => b.addEventListener("click", async () => {
      busy(b, true, "Finding…");
      try { const id = await q(sb.rpc("battle_quick", { p_size: 2, p_scoring: "classic", p_domain: "pack:" + b.dataset.packDuel })); location.href = `battle.html?id=${id}`; }
      catch (e) { busy(b, false); toast(friendly(e)); }
    }));
    $$("[data-room]").forEach(b => b.addEventListener("click", () => launch(b, "battle_room", Number(b.dataset.room))));
    $$("[data-ev-join]").forEach(b => b.addEventListener("click", async () => {
      const [type, id] = b.dataset.evJoin.split(":"); busy(b, true, "Joining…");
      try { if (type === "knockout") { await q(sb.rpc("ko_join", { p_id: id })); location.href = `knockout.html?id=${id}`; } else { await q(sb.rpc("battle_join", { p_id: id })); location.href = `battle.html?id=${id}`; } }
      catch (e) { busy(b, false); toast(friendly(e)); }
    }));
    $("#code-form").addEventListener("submit", async e => {
      e.preventDefault(); const code = $("#j-code").value.trim().toUpperCase(); if (code.length < 4) return toast("Enter the invite code");
      const btn = $("#code-form button[type=submit]"); busy(btn, true, "Joining…");
      try { const id = await q(sb.rpc("battle_join", { p_code: code })); location.href = `battle.html?id=${id}`; }
      catch (e1) { try { const id = await q(sb.rpc("ko_join", { p_code: code })); location.href = `knockout.html?id=${id}`; } catch (e2) { busy(btn, false); toast(/no knockout/.test(e2.message) ? friendly(e1) : friendly(e2)); } }
    });
    const sizeSel = $("#h-size"), typeSel = $("#h-type");
    const fillSizes = () => { sizeSel.innerHTML = (typeSel.value === "knockout" ? [4, 8, 16, 32] : [10, 25, 50, 100, 250, 500]).map(s => `<option${s === (typeSel.value === "knockout" ? 8 : 50) ? " selected" : ""}>${s}</option>`).join(""); };
    typeSel.addEventListener("change", fillSizes); fillSizes();
    $("#host-form").addEventListener("submit", async e => {
      e.preventDefault(); const btn = $("#host-form button[type=submit]"), at = new Date($("#h-at").value);
      if (isNaN(at)) return toast("Pick a start time");
      busy(btn, true, "Creating…");
      try {
        const r = await q(sb.rpc("host_event", { p_type: typeSel.value, p_domain: $("#h-dom").value, p_starts_at: at.toISOString(), p_size: Number(sizeSel.value), p_title: $("#h-title").value }));
        const link = `${location.origin}/battle.html?code=${r.code}`;
        busy(btn, false);
        $("#host-out").innerHTML = `<div class="banner blue"><span>Created. Invite code <strong class="mono">${esc(r.code)}</strong> — share the link so people can join.</span><div class="row"><button class="btn btn-sm" type="button" id="host-copy">Copy invite link</button><a class="btn btn-sm btn-primary" href="${r.type === "knockout" ? "knockout" : "battle"}.html?id=${esc(r.id)}">Open</a></div></div>`;
        $("#host-copy").addEventListener("click", () => copy(`Join my Rank Culture ${typeLabel(r.type)} "${$("#h-title").value}" — ${link}`, "Invite link copied"));
      } catch (err) { busy(btn, false); toast(friendly(err)); }
    });
  };

  // ---------- Live battle ----------
  H["battle.html"] = async () => {
    let id = params().get("id"); const code = params().get("code");
    if (code) {
      try { id = await q(sb.rpc("battle_join", { p_code: code })); }
      catch (e) { try { const k = await q(sb.rpc("ko_join", { p_code: code })); return go(`knockout.html?id=${k}`); } catch (e2) { throw /no knockout/.test(e2.message) ? e : e2; } }
      history.replaceState(null, "", `battle.html?id=${id}`);
    }
    if (!id) return go("battles.html");
    await loadPacks();
    const root = main();
    let st = null, offset = 0, phase = "", pollT = null, sending = false; const mine = {};
    const now = () => Date.now() + offset;
    root.innerHTML = `<div class="stack-lg"><div class="card dark row between" style="gap:var(--s4)" id="bt-top"></div><div class="grid rc-split"><div class="stack-lg"><div id="bt-stage" class="stack-lg"></div><p class="t-xs muted hide" id="bt-disc"></p></div><aside class="card card-lg stack rc-sticky" id="bt-board"></aside></div></div>`;
    const top = $("#bt-top"), stage = $("#bt-stage"), board = $("#bt-board");

    const timerTarget = () => {
      if (!st) return null;
      if (st.status === "waiting" && st.scheduled_at) return st.scheduled_at;
      if (st.status === "live" && now() < new Date(st.started_at)) return st.started_at;
      if (st.question) return st.question.ends_at;
      if (st.reveal) return st.reveal.next_at;
      return null;
    };
    const drawTop = () => {
      const idx = st.question ? st.question.index : st.reveal ? st.reveal.index : null;
      top.innerHTML = `<div class="stack" style="gap:var(--s1)"><div class="label" style="color:#9DB1FF">${esc(st.title || "Battle")}${st.knockout_id ? " · Knockout" : ""}</div>
        <div class="row t-sm" style="gap:var(--s2)"><span class="badge">${st.scoring === "fff" ? "Fastest finger" : "Classic"}</span><span class="badge">${esc(label(st.domain))}</span>${st.status === "live" ? '<span class="badge red live">Live</span>' : ""}${st.status === "live" && !st.ranked ? '<span class="badge">Practice · unranked</span>' : ""}</div></div>
        ${idx != null ? `<div class="q-dots" aria-label="Questions">${Array.from({ length: st.n_q }, (_, i) => `<span class="${i < idx ? "done" : i === idx ? "cur" : ""}">${i + 1}</span>`).join("")}</div>` : ""}
        <div class="timer" id="bt-timer" aria-live="off">${timerTarget() ? "--:--" : ""}</div>`;
    };
    const drawBoard = () => {
      const fin = st.status === "finished";
      board.innerHTML = `<div class="row between"><h2 class="t-h3">${fin ? "Final standings" : "Live scores"}</h2><span class="mono t-xs muted">${n(st.count)} player${st.count === 1 ? "" : "s"}</span></div>
        ${st.players.length ? `<div class="list t-sm">${st.players.map(p => `<div${p.me ? ' style="background:var(--blue-soft);margin:0 calc(-1*var(--s3));padding-left:var(--s3);padding-right:var(--s3)"' : ""}><span class="row" style="gap:var(--s2)"><span class="mono" style="width:28px">${st.status === "waiting" ? "—" : "#" + p.place}</span><strong>${esc(p.name)}</strong>${p.me ? '<span class="badge blue">You</span>' : ""}${p.bot ? '<span class="badge">Bot</span>' : ""}</span><span class="mono">${st.status === "waiting" ? "" : p.score}${fin && p.delta != null ? ` <span class="${p.delta >= 0 ? "green" : "red"} t-xs">${p.delta >= 0 ? "+" : ""}${p.delta}</span>` : ""}</span></div>`).join("")}</div>` : '<p class="muted t-sm">No one here yet.</p>'}`;
    };
    const optBtn = (o, k, cls, dis) => `<button class="option bt-opt ${cls}" data-k="${k}" ${dis ? "disabled" : ""} aria-pressed="${cls.includes("selected")}"><span class="key">${"ABCDEF"[k]}</span>${esc(o)}</button>`;
    const drawStage = () => {
      const s = st, meIn = s.me != null;
      if (s.status === "waiting") {
        const seats = Array.from({ length: Math.min(s.size, 24) }, (_, i) => s.players[i]);
        const canBots = meIn && s.kind === "quick" && (s.host || now() - new Date(s.created_at) > 20000);
        const link = s.code ? `${location.origin}/battle.html?code=${s.code}` : "";
        stage.innerHTML = `<div class="card card-lg stack-lg"><div class="stack"><div class="label muted">${s.scheduled_at ? "Scheduled event" : "Lobby"}</div>
          <h1 class="t-h2">${s.scheduled_at ? `Starts <span id="bt-when">${until(s.scheduled_at, now())}</span>` : s.count < s.size ? `Waiting for players · ${s.count}/${s.size}` : "Starting…"}</h1>
          <p class="muted t-sm">${s.scheduled_at ? `${fmt(s.scheduled_at)}. Keep this page open — it starts automatically.${s.kind === "knockout_match" ? " Miss it and you forfeit the match." : " If fewer than 2 people show up, practice bots fill in."}` : "The battle starts the moment every seat is filled."}</p></div>
          ${s.kind !== "showdown" || s.count <= 24 ? `<div class="seat-grid">${seats.map(p => p ? `<div class="seat"><span class="avatar">${esc(p.name.slice(0, 2).toUpperCase())}</span><span class="t-sm"><strong>${esc(p.name)}</strong>${p.me ? " (you)" : ""}</span></div>` : `<div class="seat empty t-sm">Open seat</div>`).join("")}</div>` : `<p class="t-sm"><strong>${n(s.count)}</strong> players joined.</p>`}
          ${link ? `<div class="banner blue"><span>Invite code <strong class="mono">${esc(s.code)}</strong></span><button class="btn btn-sm" id="bt-copy">Copy invite link</button></div>` : ""}
          <div class="row">${meIn ? `${s.kind === "quick" ? `<button class="btn btn-primary" id="bt-bots" ${canBots ? "" : "disabled"}>${ic("play")} Start${s.count < s.size ? " — fill with bots" : ""}</button>${s.count >= 2 && s.count < s.size && canBots ? `<button class="btn" id="bt-now">Start with ${s.count} players</button>` : ""}` : ""}${s.kind !== "knockout_match" ? `<button class="btn btn-ghost" id="bt-leave">Leave</button>` : ""}` : `<button class="btn btn-primary" id="bt-join">Join this ${s.kind === "showdown" ? "event" : "battle"}</button>`}</div>
          ${meIn && s.kind === "quick" && !canBots ? '<p class="t-xs muted">You can start with bots after 20 seconds if nobody joins.</p>' : ""}</div>`;
        const cp = $("#bt-copy"); if (cp) cp.addEventListener("click", () => copy(`Battle me on Rank Culture — ${link}`, "Invite link copied"));
        const start = async (fill, b) => { busy(b, true, "Starting…"); try { await q(sb.rpc("battle_start_now", { p_id: id, p_fill: fill })); poll(true); } catch (e) { busy(b, false); toast(friendly(e)); } };
        const bb = $("#bt-bots"); if (bb) bb.addEventListener("click", () => start(true, bb));
        const bn = $("#bt-now"); if (bn) bn.addEventListener("click", () => start(false, bn));
        const lv = $("#bt-leave"); if (lv) lv.addEventListener("click", async () => { try { await q(sb.rpc("battle_leave", { p_id: id })); } catch (e) {} location.href = "battles.html"; });
        const jn = $("#bt-join"); if (jn) jn.addEventListener("click", async () => { busy(jn, true, "Joining…"); try { await q(sb.rpc("battle_join", { p_id: id })); poll(true); } catch (e) { busy(jn, false); toast(friendly(e)); } });
        return;
      }
      if (s.status === "cancelled") {
        stage.innerHTML = `<div class="empty"><div class="icon">${ic("x")}</div><h2 class="t-h2">This battle didn't go ahead</h2><p class="muted t-sm">Nobody else joined in time, or the event was cancelled.</p><a class="btn btn-primary" href="battles.html">Back to battles</a></div>`;
        return;
      }
      if (s.status === "finished") {
        const mine = s.players.find(p => p.me);
        stage.innerHTML = `<div class="card dark card-lg stack" style="box-shadow:8px 8px 0 var(--blue)"><div class="label" style="color:#9DB1FF">${esc(s.title || "Battle")} · Final</div>
          ${mine ? `<div class="score"><span class="num">${ordinal(mine.place)}</span><span class="of">of ${s.count}</span></div><p>${mine.place === 1 ? "You won. " : ""}<strong class="mono">${mine.score}</strong> points · ${mine.correct}/${s.n_q} correct.${mine.delta != null ? ` Arena rating <strong class="mono ${mine.delta >= 0 ? "" : ""}">${mine.delta >= 0 ? "+" : ""}${mine.delta}</strong>.` : " Practice battle — your arena rating didn't change."}</p>` : `<h1 class="t-h2">Battle finished</h1>`}
          <div class="row">${s.knockout_id ? `<a class="btn btn-primary" href="knockout.html?id=${esc(s.knockout_id)}">Back to the bracket</a>` : s.kind === "quick" && !s.is_private ? `<button class="btn btn-primary" id="bt-again">Play again</button>` : ""}<a class="btn" href="battles.html">All battles</a><a class="btn btn-ghost" href="leaderboard-app.html?k=skill">Skill rankings</a></div></div>
          <p class="t-sm muted">Every question you saw counts towards your skill stats, so the skill leaderboards already include this battle.</p>
          <div data-fb-slot data-kind="${s.ranked ? "battle" : "drill"}" data-target="${esc(s.domain || "")}" data-title="How was this ${s.ranked ? "battle" : "drill"}?"></div>`;
        if (c.fillFeedback) c.fillFeedback(stage);
        const ag = $("#bt-again"); if (ag) ag.addEventListener("click", async () => { busy(ag, true, "Finding…"); try { const nid = await q(sb.rpc("battle_quick", { p_size: s.size, p_scoring: s.scoring, p_domain: s.domain })); location.href = `battle.html?id=${nid}`; } catch (e) { busy(ag, false); toast(friendly(e)); } });
        return;
      }
      // live
      if (now() < new Date(s.started_at)) {
        stage.innerHTML = `<div class="card card-lg center stack-lg" style="align-items:center"><div class="label muted">Get ready</div><div class="t-display mono" id="bt-count">${Math.ceil((new Date(s.started_at) - now()) / 1000)}</div><p class="muted">${s.n_q} questions · ${s.q_seconds} seconds each · ${s.scoring === "fff" ? "first correct answer scores" : "faster correct answers score more"}</p><p class="t-xs muted">Tip: press 1–4 or A–D to answer.</p></div>`;
        return;
      }
      if (s.question) {
        const qn = s.question;
        if (!meIn) { stage.innerHTML = `<div class="card card-lg stack"><div class="label muted">Question ${qn.index + 1} of ${s.n_q} · ${esc(qn.skill)}</div><h2 class="t-h2">Spectating</h2><p class="muted">Questions are only shown to players. Watch the live scores.</p></div>`; return; }
        const locked = qn.my_choice != null;
        stage.innerHTML = `<div class="stack-lg"><div class="stack"><div class="row" style="gap:var(--s2)"><span class="badge">Q${qn.index + 1} · ${esc(qn.skill)}</span><span class="mono t-xs muted">${s.scoring === "fff" ? "100 pts to the first correct" : "100 + speed bonus"}</span></div>
          <div class="bar blue thin"><i id="bt-bar" style="width:100%"></i></div><h1 class="t-h2">${esc(qn.prompt)}</h1>${qn.context ? `<p class="muted">${esc(qn.context)}</p>` : ""}</div>
          <div class="stack" id="bt-opts">${qn.options.map((o, k) => optBtn(o, k, qn.my_choice === k ? "selected" : "", locked)).join("")}</div>
          <p class="t-sm muted">${locked ? `${ic("check")} Locked in. The answer shows when the clock runs out.` : "Pick one — you can't change it."}</p></div>`;
        $$("#bt-opts .option").forEach(b => b.addEventListener("click", () => answer(Number(b.dataset.k))));
        return;
      }
      if (s.reveal) {
        const r = s.reveal, right = r.my_choice === r.correct;
        stage.innerHTML = `<div class="stack-lg"><div class="stack"><div class="row" style="gap:var(--s2)">${meIn ? (r.my_choice == null ? '<span class="badge amber">Time ran out</span>' : right ? '<span class="badge green">Correct</span>' : '<span class="badge red">Not this time</span>') : ""}${r.first ? `<span class="t-sm muted">First correct: <strong>${esc(r.first)}</strong></span>` : '<span class="t-sm muted">Nobody got this one</span>'}</div><h1 class="t-h2">${esc(r.prompt)}</h1></div>
          <div class="stack">${r.options.map((o, k) => optBtn(o, k, k === r.correct ? "correct" : k === r.my_choice ? "wrong" : "", true)).join("")}</div>
          <p class="t-sm muted">${r.index + 1 < s.n_q ? `Next question in <span id="bt-next">…</span>` : "Final results in a moment…"}</p></div>`;
        return;
      }
      stage.innerHTML = `<div class="card card-lg"><p class="muted">Wrapping up…</p></div>`;
    };
    const answer = async k => {
      if (sending || !st || !st.question || st.question.my_choice != null) return;
      sending = true; mine[st.question.index] = k; st.question.my_choice = k; phase = ""; draw();
      try { await q(sb.rpc("battle_answer", { p_id: id, p_q: st.question.index, p_choice: k })); }
      catch (e) { if (!/already answered/.test(e.message)) { delete mine[st.question.index]; st.question.my_choice = null; phase = ""; draw(); toast(friendly(e)); } }
      sending = false;
    };
    document.addEventListener("keydown", e => {
      if (!st || !st.question || e.target.matches("input, textarea, select")) return;
      const k = "1234".indexOf(e.key) >= 0 ? "1234".indexOf(e.key) : "abcd".indexOf(e.key.toLowerCase());
      if (k >= 0 && st.question.options && k < st.question.options.length) answer(k);
    });
    const draw = () => {
      const key = [st.status, st.count, st.me, st.question ? "q" + st.question.index + ":" + st.question.my_choice : "", st.reveal ? "r" + st.reveal.index : "", st.status === "live" && now() < new Date(st.started_at) ? "c" : ""].join("|");
      drawTop(); drawBoard();
      const pk = packOf(st.domain), dc = $("#bt-disc"); if (pk && dc && dc.classList.contains("hide")) { dc.innerHTML = disclaimer(pk); dc.classList.remove("hide"); }
      if (key !== phase) { phase = key; drawStage(); }
    };
    // Local clock: timers and countdowns tick between polls; a phase boundary triggers an early poll.
    setInterval(() => {
      if (!st) return;
      const t = timerTarget(), el = $("#bt-timer");
      if (el && t) { const ms = new Date(t) - now(); el.textContent = mmss(ms); el.classList.toggle("low", st.question && ms < 5000); if (ms <= -250 && !pollT) poll(true); }
      const cnt = $("#bt-count"); if (cnt) cnt.textContent = Math.max(0, Math.ceil((new Date(st.started_at) - now()) / 1000));
      const bar = $("#bt-bar"); if (bar && st.question) bar.style.width = Math.max(0, Math.min(100, (new Date(st.question.ends_at) - now()) / (st.q_seconds * 10))) + "%";
      const nx = $("#bt-next"); if (nx && st.reveal) nx.textContent = mmss(new Date(st.reveal.next_at) - now());
      const wh = $("#bt-when"); if (wh && st.scheduled_at) wh.textContent = until(st.scheduled_at, now());
    }, 200);
    async function poll(force) {
      clearTimeout(pollT); pollT = null;
      try { st = await q(sb.rpc("battle_state", { p_id: id })); offset = new Date(st.now) - Date.now(); if (st.question && st.question.my_choice == null && mine[st.question.index] != null) st.question.my_choice = mine[st.question.index]; draw(); }
      catch (e) { if (!st) { root.innerHTML = errorState(e, false) + `<div class="center mt3"><a class="btn" href="battles.html">Back to battles</a></div>`; return; } }
      const ms = st.status === "live" ? 1200 : st.status === "waiting" ? (st.scheduled_at && new Date(st.scheduled_at) - now() > 120000 ? 15000 : 2500) : 0;
      if (ms) pollT = setTimeout(poll, ms);
    }
    poll();
  };

  // ---------- Knockout bracket ----------
  H["knockout.html"] = async () => {
    let id = params().get("id"); const code = params().get("code");
    if (code) { id = await q(sb.rpc("ko_join", { p_code: code })); history.replaceState(null, "", `knockout.html?id=${id}`); }
    if (!id) return go("battles.html");
    await loadPacks();
    let k = null, offset = 0, t = null;
    const now = () => Date.now() + offset;
    const roundName = (r, R) => (r === R ? "Final" : r === R - 1 ? "Semi-finals" : r === R - 2 ? "Quarter-finals" : `Round ${r}`);
    const draw = () => {
      const R = k.bracket ? Math.round(Math.log2(k.bracket)) : 0;
      const mineNext = k.matches.find(m => (m.me1 || m.me2) && m.winner == null && m.battle_id);
      const out = k.matches.find(m => (m.me1 || m.me2) && m.winner != null && ((m.me1 && m.winner === 2) || (m.me2 && m.winner === 1)));
      const rounds = Array.from({ length: R }, (_, i) => Array.from({ length: k.bracket >> (i + 1) }, (_, j) => k.matches.find(m => m.round === i + 1 && m.slot === j + 1) || { round: i + 1, slot: j + 1, pending: true }));
      const pRow = (name, me, win, score, bye) => `<div class="p${win ? " win" : ""}${me ? " me" : ""}"><span>${bye ? '<span class="muted">Bye</span>' : esc(name || "TBD")}${me ? " (you)" : ""}</span><span class="mono">${score != null ? score : ""}${win ? " ✓" : ""}</span></div>`;
      render(`<a class="link" href="battles.html">${ic("back")} All battles</a>
      <div class="card card-lg stack mt3"><div class="row" style="gap:var(--s2)"><span class="badge blue">Knockout</span><span class="badge">${esc(label(k.domain))}</span>${k.is_private ? '<span class="badge">Private</span>' : ""}${k.status === "running" ? '<span class="badge red live">Live</span>' : ""}</div>
        <h1 class="t-h1">${esc(k.title)}</h1>
        <p class="lead">${k.status === "open" ? `Starts ${fmt(k.starts_at)} · <span id="ko-when"></span>. ${n(k.entries.length)} of ${k.size} entered.` : k.status === "cancelled" ? "Cancelled — fewer than 2 players entered." : k.status === "finished" ? `Champion: <strong>${esc(k.champion)}</strong>` : `${n(k.entries.length)} players · ${R} round${R === 1 ? "" : "s"} · 5-question duels`}</p>
        ${k.code ? `<div class="banner blue"><span>Invite code <strong class="mono">${esc(k.code)}</strong></span><button class="btn btn-sm" id="ko-copy">Copy invite link</button></div>` : ""}
        <div class="row">${k.status === "open" ? (k.joined ? `<span class="badge green">You're in ✓</span><button class="btn btn-ghost" id="ko-leave">Leave</button>` : `<button class="btn btn-primary" id="ko-join">Enter the knockout</button>`) : ""}</div></div>
      ${k.champion_me ? `<div class="banner blue mt3"><span><strong>You're the champion.</strong> Every round won, on the clock.</span></div>` : ""}
      ${mineNext ? `<div class="banner ${mineNext.battle_status === "live" ? "red" : "amber"} mt3"><span><strong>Your ${roundName(mineNext.round, R).toLowerCase().replace(/s$/, "")}:</strong> vs ${esc((mineNext.me1 ? mineNext.p2 : mineNext.p1) || "TBD")} — ${mineNext.battle_status === "live" ? "live now" : "starts " + until(mineNext.starts_at, now())}</span><a class="btn btn-primary btn-sm" href="battle.html?id=${esc(mineNext.battle_id)}">Enter match</a></div>`
        : out && k.status !== "finished" ? `<div class="banner mt3"><span>You're out — knocked out in the ${roundName(out.round, R).toLowerCase()}. Stay to watch the rest.</span></div>` : ""}
      ${k.status === "open" ? `<div class="card card-lg mt3"><h2 class="t-h3 mb2">Entrants</h2>${k.entries.length ? `<div class="seat-grid">${k.entries.map(e => `<div class="seat"><span class="avatar">${esc(e.name.slice(0, 2).toUpperCase())}</span><span class="t-sm">${esc(e.name)}${e.me ? " (you)" : ""}</span></div>`).join("")}</div>` : '<p class="muted t-sm">No one yet.</p>'}
        <p class="t-xs muted mt2">Seeds are set by arena rating when entries close. Byes go to top seeds if the bracket isn't full. Keep this page open — your match opens automatically, and a no-show loses.</p></div>`
        : R ? `<div class="bracket mt3">${rounds.map((ms, i) => `<div class="round"><div class="label muted">${roundName(i + 1, R)}</div>${ms.map(m => `<div class="match">${pRow(m.p1, m.me1, m.winner === 1, m.score1, false)}${pRow(m.p2, m.me2, m.winner === 2, m.score2, !m.pending && !m.p2)}
            <div class="p t-xs muted">${m.battle_id ? (m.battle_status === "finished" ? `<a class="link" href="battle.html?id=${esc(m.battle_id)}">Result</a>` : m.battle_status === "live" ? `<a class="link" href="battle.html?id=${esc(m.battle_id)}">Live now →</a>` : `Starts ${until(m.starts_at, now())}`) : m.pending ? "Waiting for earlier results" : m.p2 ? "" : "Advances"}</div></div>`).join("")}</div>`).join("")}</div>` : ""}`);
      const cp = $("#ko-copy"); if (cp) cp.addEventListener("click", () => copy(`Join my Rank Culture knockout "${k.title}" — ${location.origin}/knockout.html?code=${k.code}`, "Invite link copied"));
      const j = $("#ko-join"); if (j) j.addEventListener("click", async () => { busy(j, true, "Entering…"); try { await q(sb.rpc("ko_join", { p_id: id })); poll(); } catch (e) { busy(j, false); toast(friendly(e)); } });
      const l = $("#ko-leave"); if (l) l.addEventListener("click", async () => { try { await q(sb.rpc("ko_leave", { p_id: id })); poll(); } catch (e) { toast(friendly(e)); } });
      // Auto-open my match just before it starts (once per match).
      if (mineNext && (mineNext.battle_status === "live" || new Date(mineNext.starts_at) - now() < 10000)) {
        const flag = "rc-ko-open-" + mineNext.battle_id; let seen = false; try { seen = sessionStorage.getItem(flag); sessionStorage.setItem(flag, "1"); } catch (e) {}
        if (!seen) location.href = `battle.html?id=${mineNext.battle_id}`;
      }
    };
    setInterval(() => { const w = $("#ko-when"); if (w && k) w.textContent = until(k.starts_at, now()); }, 500);
    async function poll() {
      clearTimeout(t);
      try { k = await q(sb.rpc("ko_state", { p_id: id })); offset = new Date(k.now) - Date.now(); draw(); }
      catch (e) { if (!k) return render(errorState(e, false)); }
      if (k.status === "open" || k.status === "running") t = setTimeout(poll, k.status === "open" && new Date(k.starts_at) - now() > 120000 ? 15000 : 3000);
    }
    poll();
  };
};
