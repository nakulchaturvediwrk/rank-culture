// Rank Culture prototype interactions. Vanilla JS, no dependencies.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // Toast
  window.toast = function (msg) {
    const t = $("#toast"); if (!t) return;
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2200);
  };

  // Mobile drawer
  const drawer = $("#drawer");
  $$("[data-open-drawer]").forEach(b => b.addEventListener("click", () => { drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false"); }));
  $$("[data-close-drawer]").forEach(b => b.addEventListener("click", () => { drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); }));
  document.addEventListener("keydown", e => { if (e.key === "Escape") { drawer && drawer.classList.remove("open"); $$(".modal.open").forEach(m => m.classList.remove("open")); } });

  // Generic toast buttons
  $$("[data-toast]").forEach(b => b.addEventListener("click", e => { if (b.tagName === "A" && b.getAttribute("href") === "#") e.preventDefault(); toast(b.dataset.toast); }));

  // Chip filters: single-select groups, filter targets by data-cat
  $$("[data-filter-group]").forEach(group => {
    const target = $(group.dataset.filterGroup);
    $$(".chip", group).forEach(chip => chip.addEventListener("click", () => {
      $$(".chip", group).forEach(c => { c.classList.remove("on"); c.setAttribute("aria-pressed", "false"); });
      chip.classList.add("on"); chip.setAttribute("aria-pressed", "true");
      const v = chip.dataset.value;
      if (target) $$("[data-cat]", target).forEach(el => { el.classList.toggle("hide", v !== "all" && !el.dataset.cat.split(" ").includes(v)); });
      const empty = target && target.querySelector("[data-empty]");
      if (empty) empty.classList.toggle("hide", $$("[data-cat]:not(.hide)", target).length > 0);
    }));
  });

  // Search filter on lists
  $$("[data-search]").forEach(inp => {
    const target = $(inp.dataset.search);
    inp.addEventListener("input", () => {
      const q = inp.value.trim().toLowerCase();
      $$("[data-cat]", target).forEach(el => el.classList.toggle("hide", q && !el.textContent.toLowerCase().includes(q)));
      const empty = target.querySelector("[data-empty]");
      if (empty) empty.classList.toggle("hide", $$("[data-cat]:not(.hide)", target).length > 0);
    });
  });

  // Tabs: [data-tabs] buttons with data-tab="id" show #id panels
  $$("[data-tabs]").forEach(tabs => {
    const btns = $$("button", tabs);
    btns.forEach(b => b.addEventListener("click", () => {
      btns.forEach(x => { x.classList.remove("on"); x.setAttribute("aria-selected", "false"); const p = document.getElementById(x.dataset.tab); if (p) p.classList.add("hide"); });
      b.classList.add("on"); b.setAttribute("aria-selected", "true");
      const p = document.getElementById(b.dataset.tab); if (p) p.classList.remove("hide");
    }));
  });

  // Toggles
  $$(".toggle").forEach(t => t.addEventListener("click", () => {
    const on = t.getAttribute("aria-checked") === "true";
    t.setAttribute("aria-checked", String(!on));
    if (t.dataset.label) toast(`${t.dataset.label} ${on ? "off" : "on"}`);
  }));

  // Option tiles: single (data-single) or multi select within a [data-options] group
  $$("[data-options]").forEach(g => {
    const multi = g.dataset.options === "multi";
    const next = g.dataset.next ? $(g.dataset.next) : null;
    const update = () => { if (next) next.toggleAttribute("disabled", !$$(".option.selected", g).length); const c = g.dataset.count && $(g.dataset.count); if (c) c.textContent = $$(".option.selected", g).length; };
    $$(".option", g).forEach(o => o.addEventListener("click", () => {
      if (!multi) $$(".option", g).forEach(x => { x.classList.remove("selected"); x.setAttribute("aria-pressed", "false"); });
      o.classList.toggle("selected", multi ? !o.classList.contains("selected") : true);
      o.setAttribute("aria-pressed", String(o.classList.contains("selected")));
      update();
    }));
    update();
  });

  // Modals
  $$("[data-modal]").forEach(b => b.addEventListener("click", e => { e.preventDefault(); const m = document.getElementById(b.dataset.modal); if (m) m.classList.add("open"); }));
  $$(".modal").forEach(m => m.addEventListener("click", e => { if (e.target === m || e.target.closest("[data-close-modal]")) m.classList.remove("open"); }));

  // Countdown timers: data-countdown="seconds"
  $$("[data-countdown]").forEach(el => {
    let s = parseInt(el.dataset.countdown, 10);
    const fmt = n => { const h = Math.floor(n / 3600), m = Math.floor((n % 3600) / 60), x = n % 60; return (h ? String(h).padStart(2, "0") + ":" : "") + String(m).padStart(2, "0") + ":" + String(x).padStart(2, "0"); };
    el.textContent = fmt(s);
    const h = setInterval(() => { s = Math.max(0, s - 1); el.textContent = fmt(s); if (s < 300) el.classList.add("low"); if (!s) { clearInterval(h); if (el.dataset.onEnd) location.href = el.dataset.onEnd; } }, 1000);
  });

  // Password visibility
  $$("[data-reveal]").forEach(b => b.addEventListener("click", () => { const i = $(b.dataset.reveal); i.type = i.type === "password" ? "text" : "password"; b.textContent = i.type === "password" ? "Show" : "Hide"; }));

  // Simple forms that navigate on submit (prototype)
  $$("form[data-go]").forEach(f => f.addEventListener("submit", e => {
    e.preventDefault();
    let ok = true;
    $$("[required]", f).forEach(i => { const bad = !i.value.trim() || (i.type === "email" && !/^\S+@\S+\.\S+$/.test(i.value)); i.classList.toggle("error", bad); const m = i.parentElement.querySelector(".err"); if (m) m.classList.toggle("hide", !bad); if (bad) ok = false; });
    if (!ok) { toast("Please fix the highlighted fields"); return; }
    if (f.dataset.toastMsg) toast(f.dataset.toastMsg);
    setTimeout(() => { location.href = f.dataset.go; }, f.dataset.toastMsg ? 700 : 0);
  }));

  // Messages: switch thread
  $$("[data-thread]").forEach(b => b.addEventListener("click", () => {
    $$("[data-thread]").forEach(x => x.classList.remove("on")); b.classList.add("on");
    $$(".thread-pane").forEach(p => p.classList.add("hide"));
    const p = document.getElementById(b.dataset.thread); if (p) p.classList.remove("hide");
  }));
  $$("form[data-send]").forEach(f => f.addEventListener("submit", e => {
    e.preventDefault(); const i = $("input", f); if (!i.value.trim()) return;
    const body = f.closest(".thread").querySelector(".thread-body");
    const m = document.createElement("div"); m.className = "msg me"; m.textContent = i.value; body.appendChild(m); i.value = ""; body.scrollTop = body.scrollHeight;
  }));

  // Arena: question navigation
  const arena = $("[data-arena]");
  if (arena) {
    const qs = $$(".q", arena), dots = $$(".q-dots span");
    let i = 0;
    const show = n => {
      i = Math.max(0, Math.min(qs.length - 1, n));
      qs.forEach((q, k) => q.classList.toggle("hide", k !== i));
      dots.forEach((d, k) => { d.classList.toggle("cur", k === i); });
      $("#q-prev").toggleAttribute("disabled", i === 0);
      $("#q-next").classList.toggle("hide", i === qs.length - 1);
      $("#q-submit").classList.toggle("hide", i !== qs.length - 1);
      $("#q-num").textContent = i + 1;
    };
    qs.forEach((q, k) => $$(".option", q).forEach(o => o.addEventListener("click", () => { dots[k] && dots[k].classList.add("done"); })));
    $$("textarea", arena).forEach(t => { const k = qs.indexOf(t.closest(".q")); t.addEventListener("input", () => dots[k] && dots[k].classList.toggle("done", t.value.trim().length > 0)); });
    $("#q-prev").addEventListener("click", () => show(i - 1));
    $("#q-next").addEventListener("click", () => show(i + 1));
    dots.forEach((d, k) => d.addEventListener("click", () => show(k)));
    show(0);
  }

  // Skeleton → content demo
  $$("[data-reveal-after]").forEach(el => setTimeout(() => { el.classList.add("hide"); const t = document.getElementById(el.dataset.revealAfter); if (t) t.classList.remove("hide"); }, parseInt(el.dataset.ms || "2200", 10)));

  // Offline retry countdown
  const retry = $("[data-retry]");
  if (retry) { let s = 15; const tick = () => { retry.textContent = s; if (s-- <= 0) { s = 15; toast("Still offline — retrying"); } }; tick(); setInterval(tick, 1000); }

  // Role switcher on dashboard
  $$("[data-role-switch]").forEach(sel => sel.addEventListener("change", () => {
    $$("[data-role]").forEach(p => p.classList.toggle("hide", p.dataset.role !== sel.value));
  }));
})();
