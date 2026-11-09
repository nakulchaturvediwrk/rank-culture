"""End-to-end check of every page, button and core flow.

Serves the production bundle (deploy/) exactly as Vercel would — same rewrites, same security
headers incl. the hash-based CSP — and mocks the Supabase API in the browser, so every screen can be
exercised signed out and signed in, on desktop and mobile, without touching real data.

Run:  node build.js && python3 tests/e2e.py
"""
import base64, json, os, re, sys, threading, time, http.server, socketserver, functools, urllib.parse
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEP = os.path.join(ROOT, "deploy")
PORT = int(os.environ.get("E2E_PORT", "4173"))
BASE = f"http://localhost:{PORT}"
SB = "https://vxzbiytdjcyaqupgxjzx.supabase.co"
FIX = json.load(open(os.path.join(os.path.dirname(__file__), "fixtures.json")))

# ---------- static server that behaves like vercel.json ----------
vcfg = json.load(open(os.path.join(DEP, "vercel.json")))
HEADERS = {}
for h in vcfg["headers"]:
    if h["source"] == "/(.*)":
        for x in h["headers"]:
            v = x["value"]
            if x["key"] == "Strict-Transport-Security": continue          # not over http://localhost
            if x["key"] == "Content-Security-Policy": v = v.replace("; upgrade-insecure-requests", "")
            HEADERS[x["key"]] = v
CSP = HEADERS["Content-Security-Policy"]

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=DEP, **k)
    def log_message(self, *a): pass
    def translate_path(self, path):
        p = urllib.parse.urlparse(path).path
        if not p.startswith("/assets/"): p = "/index.html"
        return super().translate_path(p)
    def end_headers(self):
        for k, v in HEADERS.items(): self.send_header(k, v)
        super().end_headers()

socketserver.ThreadingTCPServer.allow_reuse_address = True
srv = socketserver.ThreadingTCPServer(("127.0.0.1", PORT), H); srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start()

# ---------- Supabase mock ----------
UID = "11111111-2222-4333-8444-555555555555"
def b64(d): return base64.urlsafe_b64encode(json.dumps(d).encode()).decode().rstrip("=")
NOW = int(time.time())
JWT = b64({"alg": "HS256", "typ": "JWT"}) + "." + b64({"sub": UID, "aal": "aal1", "amr": [{"method": "otp", "timestamp": NOW}], "exp": NOW + 3600,
        "role": "authenticated", "email": "asha@example.in", "session_id": "s1"}) + ".sig"
USER = {"id": UID, "email": "asha@example.in", "aud": "authenticated", "role": "authenticated", "identities": [{"provider": "email"}], "factors": [],
        "app_metadata": {"provider": "email"}, "user_metadata": {"full_name": "Asha Rao"}, "created_at": "2026-11-01T00:00:00Z"}
SESSION = {"access_token": JWT, "refresh_token": "r1", "expires_at": NOW + 3600, "expires_in": 3600, "token_type": "bearer", "user": USER}

class Mock:
    def __init__(self, signed_in, **kw):
        self.signed_in = signed_in
        self.calls = []
        self.profile = {"id": UID, "full_name": "Asha Rao", "city": "Pune", "stage": "college", "field": "marketing", "skills": ["Copywriting"],
                        "visibility": "private", "show_city": True, "open_to_work": False, "hide_college": True, "notify_weekly": False,
                        "notify_reminders": True, "onboarded": True}
        self.apps = [{"id": "a1", "job_id": "kirana-growth", "status": "applied", "fast_track": True, "created_at": "2026-11-06T10:00:00Z", "jobs": {"role": "Growth Associate", "company": "Kirana Club"}},
                     {"id": "a2", "job_id": "saltpan-ba", "status": "applied", "fast_track": False, "created_at": "2026-11-05T10:00:00Z", "jobs": {"role": "Business Analyst", "company": "Saltpan Labs"}}]
        self.fail_profile_patch = kw.get("fail_profile_patch", False)
        self.signup_mode = kw.get("signup_mode", "session")
        self.reauth = kw.get("reauth", False)
        self.phone = kw.get("phone", False)
        self.started = False
        self.submitted = False

    def rpc(self, fn, body):
        T = FIX["tournaments"]
        if fn == "site_stats": return {"ranked": 12, "played": 340, "questions": 330, "events": 9}
        if fn == "tournament_counts": return [{"tournament_id": t["id"], "players": 3} for t in T]
        if fn == "leaderboard_v2": return [{"place": 1, "name": "Bilal Khan", "city": "Pune", "score": 812, "detail": "marketing", "is_me": False, "total": 2},
                                            {"place": 2, "name": "Asha Rao (you)", "city": None, "score": 701, "detail": "marketing", "is_me": True, "total": 2}]
        if fn == "skills_list": return FIX["skills"]
        if fn == "packs_list": return FIX["packs"]
        if fn == "my_rank": return [{"place": 2, "total": 9, "score": 701}]
        if fn == "my_standing": return [{"place": 1, "total": 4}]
        if fn == "tournament_tasks": return [{"label": "Launch email", "kind": "text", "points": 0}, {"label": "Funnel leak", "kind": "mcq", "points": 30}]
        if fn == "start_entry": self.started = True; return "2099-01-01T00:00:00Z"
        if fn == "submit_entry": self.submitted = body; return {"id": "e1"}
        if fn == "apply_to_job": return {"id": "a9"}
        if fn == "send_contact": return None
        if fn == "delete_my_account": return None
        if fn == "battle_hub": return {"rating": {"rating": 1216, "played": 3, "wins": 2}, "arena_place": 4, "active": [], "recent": [],
                                       "events": [{"id": "e1", "type": "fff", "domain": "marketing", "title": "Daily Fastest Finger", "status": "waiting", "starts_at": "2026-11-08T15:30:00Z", "count": 4, "size": 500, "is_private": False, "joined": False, "code": None}]}
        if fn in ("battle_room", "battle_quick", "battle_join"): return "b0000000-0000-4000-8000-000000000001"
        if fn in ("battle_start_now", "battle_leave", "battle_answer", "ko_leave"): return None
        if fn == "ko_join": return "k0000000-0000-4000-8000-000000000001"
        if fn == "host_event": return {"type": "showdown", "id": "b0000000-0000-4000-8000-000000000002", "code": "ABC234"}
        if fn == "battle_state":
            now = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
            ends = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(time.time() + 15))
            return {"id": body.get("p_id"), "me": 1, "n_q": 8, "now": now, "code": None, "host": True, "kind": "quick", "size": 4, "count": 4, "title": "Drill",
                    "domain": "marketing", "humans": 1, "ranked": False, "reveal": None, "status": "live", "scoring": "classic", "q_seconds": 20,
                    "created_at": now, "is_private": True, "started_at": "2026-01-01T00:00:00Z", "knockout_id": None, "scheduled_at": None,
                    "players": [{"me": True, "bot": False, "name": "Asha R.", "seat": 1, "place": 1, "score": 0, "correct": 0}, {"me": False, "bot": True, "name": "Bot Nova", "seat": 2, "place": 2, "score": 0, "correct": 0}],
                    "question": {"index": 0, "skill": "Copywriting", "ends_at": ends, "prompt": "Which subject line is clearest?", "options": ["A", "B", "C", "D"], "my_choice": None}}
        if fn == "ko_state":
            return {"id": body.get("p_id"), "now": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()), "title": "Sunday Cup", "domain": "marketing", "size": 8, "status": "open",
                    "starts_at": "2026-11-09T13:30:00Z", "is_private": False, "code": None, "joined": False, "entries": [{"name": "Bilal K.", "me": False}], "matches": [], "bracket": 8, "champion": None, "champion_me": False}
        raise KeyError(fn)

    def table(self, name, method, query, body):
        if name == "profiles":
            if method == "PATCH":
                if self.fail_profile_patch: return 500, {"message": "boom"}
                self.profile.update(body); return 200, [self.profile]
            return 200, [self.profile]
        if name == "ratings": return 200, [{"field": "marketing", "score": 701, "entries": 2, "history": [640, 701], "updated_at": "2026-11-07T00:00:00Z"}]
        if name == "tournaments":
            T = FIX["tournaments"]; m = re.search(r"id=eq\.([\w-]+)", query)
            return 200, [t for t in T if not m or t["id"] == m.group(1)]
        if name == "registrations":
            if method == "POST": return 201, []
            if method == "DELETE": return 200, []
            m = re.search(r"tournament_id=eq\.([\w-]+)", query)
            return 200, [r for r in [{"tournament_id": "sql", "started_at": None, "user_id": UID}] if not m or r["tournament_id"] == m.group(1)]
        if name == "entries":
            m = re.search(r"tournament_id=eq\.([\w-]+)", query)
            e = {"id": "e1", "tournament_id": "growth", "auto_points": 30, "auto_max": 40, "rating_before": 640, "rating_after": 701,
                 "task_scores": [{"label": "Funnel leak", "points": 30, "max": 40}, {"label": "Launch email", "points": None, "max": None, "pending": True}],
                 "written_pending": True, "submitted_at": "2026-11-07T10:00:00Z", "tournaments": {"name": "Growth Marketing Cup", "ranked": True}}
            if m and m.group(1) != "growth": return 200, []
            return 200, [e]
        if name == "jobs":
            J = FIX["jobs"]; m = re.search(r"id=eq\.([\w-]+)", query); h = re.search(r"hiring_from=eq\.([\w-]+)", query)
            rows = [j for j in J if (not m or j["id"] == m.group(1)) and (not h or j.get("hiring_from") == h.group(1))]
            for j in rows: j.setdefault("tournaments", {"name": "Growth Marketing Cup"})
            return 200, rows
        if name == "applications":
            if method == "DELETE":
                m = re.search(r"id=eq\.([\w-]+)", query); gone = [a for a in self.apps if a["id"] == m.group(1)]
                self.apps = [a for a in self.apps if a["id"] != m.group(1)]; return 200, [{"id": a["id"]} for a in gone]
            m = re.search(r"job_id=eq\.([\w-]+)", query)
            return 200, [a for a in self.apps if not m or a["job_id"] == m.group(1)]
        if name == "questions":
            return 200, [{"id": 1, "kind": "mcq", "label": "Funnel leak", "prompt": "Where is the funnel leaking?", "context": None, "table_data": {"head": ["Step", "Users"], "rows": [["Visit", "1000"], ["Cart", "120"]]}, "options": ["Visit", "Cart", "Pay"], "points": 30},
                         {"id": 2, "kind": "text", "label": "Launch email", "prompt": "Write the launch email.", "context": None, "table_data": None, "options": None, "points": 0}]
        if name == "skill_stats": return 200, [{"skill": "SEO", "domain": "marketing", "attempted": 6, "correct": 2}, {"skill": "SQL", "domain": "data", "attempted": 4, "correct": 3}, {"skill": "Pseudocode", "domain": "aptitude", "attempted": 3, "correct": 1}]
        raise KeyError(name)

    def handle(self, route):
        req = route.request; u = urllib.parse.urlparse(req.url); path = u.path; q = urllib.parse.unquote(u.query)
        body = None
        try: body = json.loads(req.post_data) if req.post_data else None
        except Exception: body = None
        self.calls.append((req.method, path, q, body))
        cors = {"access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "*"}
        if req.method == "OPTIONS": return route.fulfill(status=204, headers=cors)
        def send(status, data, single=False):
            if single and isinstance(data, list): data = data[0] if data else None
            route.fulfill(status=status, headers={**cors, "content-type": "application/json"}, body=json.dumps(data))
        if path.startswith("/auth/v1/"):
            err = lambda st, code, msg: send(st, {"code": code, "error_code": code, "msg": msg, "message": msg, "error_description": msg})
            if path == "/auth/v1/token" and "grant_type=password" in q:
                if (body or {}).get("password") != "Right-pass1": return err(400, "invalid_credentials", "Invalid login credentials")
                self.signed_in = True; return send(200, SESSION)
            if path == "/auth/v1/signup":
                if self.signup_mode == "exists": return send(200, {**USER, "identities": []})
                if self.signup_mode == "confirm": return send(200, {**USER, "identities": [{"provider": "email"}], "confirmation_sent_at": "2026-11-08T00:00:00Z"})
                self.signed_in = True; return send(200, SESSION)
            if path == "/auth/v1/settings": return send(200, {"external": {"email": True, "phone": self.phone, "github": True}})
            if path == "/auth/v1/verify": self.signed_in = True; return send(200, SESSION)
            if path in ("/auth/v1/otp", "/auth/v1/recover", "/auth/v1/resend"): return send(200, {})
            if not self.signed_in: return send(401, {"msg": "no session"})
            if path == "/auth/v1/user" and req.method == "PUT":
                if self.reauth and "nonce" not in (body or {}): return err(400, "reauthentication_needed", "Password update requires reauthentication")
                return send(200, USER)
            if path == "/auth/v1/user": return send(200, USER)
            if path == "/auth/v1/token": return send(200, SESSION)
            return send(200, {})
        single = "vnd.pgrst.object" in (req.headers.get("accept") or "")
        if path.startswith("/rest/v1/rpc/"):
            fn = path.rsplit("/", 1)[1]
            try: return send(200, self.rpc(fn, body or {}))
            except KeyError: return send(404, {"message": f"unmocked rpc {fn}"})
        if path.startswith("/rest/v1/"):
            try: st, data = self.table(path.split("/")[3], req.method, q, body)
            except KeyError as e: return send(404, {"message": f"unmocked table {e}"})
            return send(st, data, single)
        return send(404, {})

# ---------- checks ----------
PAGES_OUT = ["index.html", "how-it-works.html", "tournaments.html", "leaderboard.html", "employers.html", "pricing.html", "about.html", "contact.html",
             "terms.html", "privacy.html", "login.html", "signup.html", "forgot-password.html", "reset-password.html", "recruiter.html", "host-tournament.html", "nope.html"]
PAGES_IN = ["dashboard.html", "arena.html", "tournament.html?t=growth", "tournament.html?t=product", "results.html?t=growth", "drills.html", "jobs.html",
            "job.html?j=kirana-growth", "applications.html", "leaderboard-app.html", "profile.html", "settings.html", "battles.html",
            "battle.html?id=b0000000-0000-4000-8000-000000000001", "knockout.html?id=k0000000-0000-4000-8000-000000000001", "onboarding-1.html",
            "messages.html", "notifications.html", "network.html", "companies.html", "contact.html", "index.html"]
problems = []
def bad(where, msg): problems.append(f"{where}: {msg}"); print(f"  ✗ {where}: {msg}")

INIT = """window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.violatedDirective+' '+(e.blockedURI||'inline')+' '+(e.sample||'')));"""
AUDIT = """() => {
  const vis = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('.hide,.modal:not(.open),[aria-hidden=true]'); };
  const name = el => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || (el.querySelector('img[alt]')||{}).alt || '').trim();
  const out = {};
  out.h1 = [...document.querySelectorAll('h1')].filter(vis).length;
  out.overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  out.unnamed = [...document.querySelectorAll('a[href],button,select,input:not([type=hidden]),textarea')].filter(vis).filter(el => {
    if (['INPUT','SELECT','TEXTAREA'].includes(el.tagName)) return !(el.labels && el.labels.length) && !el.getAttribute('aria-label') && !el.getAttribute('placeholder');
    return !name(el); }).map(el => el.outerHTML.slice(0, 80));
  out.proto = /Prototype · screen map|screen map/i.test(document.body.innerText);
  out.links = [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => /\\.html/.test(h) && !/^https?:/.test(h)).map(h => h.split(/[?#]/)[0]);
  out.text = document.body.innerText.slice(0, 20000);
  return out; }"""

def known_pages():
    s = open(os.path.join(DEP, "assets/site.js"), encoding="utf8").read()
    return set(re.findall(r'"([a-z0-9-]+\.html)":', s))

def run():
    pages_known = known_pages()
    with sync_playwright() as pw:
        br = pw.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        def ctx(signed_in, mobile, **kw):
            c = br.new_context(viewport={"width": 390, "height": 844} if mobile else {"width": 1366, "height": 900}, is_mobile=mobile, has_touch=mobile)
            m = Mock(signed_in, **kw); c.route(f"{SB}/**", m.handle)
            c.add_init_script(INIT)
            if signed_in: c.add_init_script(f"try{{localStorage.setItem('sb-vxzbiytdjcyaqupgxjzx-auth-token', {json.dumps(json.dumps(SESSION))})}}catch(e){{}}")
            return c, m
        def watch(page, where):
            errs = []
            page.on("pageerror", lambda e: errs.append(f"JS error: {e}"))
            page.on("console", lambda m: m.type == "error" and not re.search(r"Failed to load resource|favicon|fonts\.g", m.text) and errs.append(f"console: {m.text[:160]}"))
            page.on("dialog", lambda d: d.accept())
            return errs

        ONLY = os.environ.get("E2E_ONLY", "")  # "flows" to skip the crawl and click-through
        # 1. Crawl every page in 4 modes
        for signed_in in (() if ONLY == "flows" else (False, True)):
            for mobile in (False, True):
                mode = f"{'in' if signed_in else 'out'}/{'mobile' if mobile else 'desktop'}"
                print(f"Crawl {mode}")
                c, m = ctx(signed_in, mobile)
                for path in (PAGES_IN if signed_in else PAGES_OUT):
                    page = c.new_page(); errs = watch(page, path)
                    page.goto(f"{BASE}/{path}"); page.wait_for_load_state("networkidle"); page.wait_for_timeout(400)
                    where = f"{mode} {path}"
                    if not signed_in and path.startswith(("dashboard", "settings")):
                        continue
                    a = page.evaluate(AUDIT)
                    if a["h1"] != 1: bad(where, f"{a['h1']} visible h1")
                    if a["overflow"] > 1: bad(where, f"horizontal overflow {a['overflow']}px")
                    for u in a["unnamed"]: bad(where, f"control without a name: {u}")
                    if a["proto"]: bad(where, "prototype badge/link visible")
                    for l in a["links"]:
                        if l not in pages_known: bad(where, f"link to unknown page {l}")
                    if re.search(r"unmocked|That didn't load", a["text"]): bad(where, "error state shown")
                    for e in errs: bad(where, e)
                    for v in page.evaluate("window.__csp"): bad(where, f"CSP violation {v}")
                    page.close()
                c.close()

        # 2. Click every visible button / toggle / tab / chip on every page (desktop) and watch for errors
        for signed_in in (() if ONLY == "flows" else (False, True)):
            print(f"Click-through {'signed in' if signed_in else 'signed out'}")
            c, m = ctx(signed_in, False)
            for path in (PAGES_IN if signed_in else PAGES_OUT):
                if path.startswith(("battle.html", "knockout.html")): continue
                page = c.new_page(); errs = watch(page, path)
                page.goto(f"{BASE}/{path}"); page.wait_for_load_state("networkidle"); page.wait_for_timeout(300)
                n = page.evaluate("""() => { let i = 0; document.querySelectorAll('button, [role=tab], .chip, .option, .toggle, [data-modal]').forEach(el => el.setAttribute('data-e2e', i++)); return i; }""")
                for i in range(n):
                    el = page.locator(f'[data-e2e="{i}"]')
                    try:
                        if not el.is_visible(): continue
                        txt = (el.inner_text() or "").strip()[:40]
                        if re.search(r"Delete|Sign out of all|Log out|Turn off|Leave|Withdraw|Submit|Send|Create|Start|Find match|Practise|Find a 1v1|Join|Claim|Drill|Register|Unregister|Email me|Create account|Verify|Save|Apply|Continue|GitHub|Google|Enter the|Set up", txt): continue
                        el.click(timeout=1500); page.wait_for_timeout(120)
                        if not page.url.startswith(f"{BASE}/{path.split('?')[0]}"): page.go_back(); page.wait_for_load_state("networkidle")
                        page.keyboard.press("Escape")
                    except Exception as e:
                        pass
                for e in errs: bad(f"click {path}", e)
                for v in page.evaluate("window.__csp"): bad(f"click {path}", f"CSP violation {v}")
                page.close()
            c.close()

        # 3. Flows
        print("Flows")
        def flow(name, fn, signed_in=True, expect_console=False, **kw):
            c, m = ctx(signed_in, False, **kw); page = c.new_page(); errs = watch(page, name)
            try: fn(page, m)
            except Exception as e: bad(name, f"{type(e).__name__}: {str(e)[:300]}")
            for e in errs:
                if not (expect_console and e.startswith("console:")): bad(name, e)
            for v in page.evaluate("window.__csp") if not page.is_closed() else []: bad(name, f"CSP violation {v}")
            c.close()
        def toast(page): return page.locator("#toast").inner_text()

        def contact_out(page, m):
            page.goto(f"{BASE}/contact.html?topic=dispute"); page.wait_for_load_state("networkidle")
            assert page.locator("#c-topic").input_value() == "dispute", "topic not preselected"
            page.click("#c-form button[type=submit]"); page.wait_for_timeout(200)
            assert not any(c[1].endswith("send_contact") for c in m.calls), "sent an empty form"
            page.fill("#c-name", "Ravi Teja"); page.fill("#c-email", "ravi@example.in"); page.fill("#c-msg", "Q2 key looks wrong")
            page.click("#c-form button[type=submit]"); page.wait_for_selector("text=Message sent")
            sent = [c for c in m.calls if c[1].endswith("send_contact")]
            assert sent and sent[0][3] == {"p_topic": "dispute", "p_name": "Ravi Teja", "p_email": "ravi@example.in", "p_message": "Q2 key looks wrong"}, sent
        flow("contact form (signed out)", contact_out, signed_in=False)

        def contact_in(page, m):
            page.goto(f"{BASE}/contact.html?topic=pro-waitlist"); page.wait_for_load_state("networkidle"); page.wait_for_timeout(300)
            assert page.locator("#c-email").input_value() == "asha@example.in", "email not prefilled"
            assert page.locator("#c-name").input_value() == "Asha Rao", "name not prefilled"
        flow("contact form prefill (signed in)", contact_in)

        def signup_oauth(page, m):
            page.goto(f"{BASE}/signup.html"); page.wait_for_load_state("networkidle")
            page.click("[data-oauth]"); page.wait_for_timeout(300)
            assert "18+" in toast(page), f"toast was {toast(page)!r}"
            assert page.url.startswith(f"{BASE}/signup.html"), "navigated to OAuth without terms"
            page.click("#pw-form button[type=submit]"); page.wait_for_timeout(200)
            assert not any(c[1] == "/auth/v1/signup" for c in m.calls), "signed up with an empty form"
            page.fill("#a-name", "Asha Rao"); page.fill("#a-email", "asha@example.in"); page.fill("#a-pass", "password"); page.check("#a-terms")
            page.click("#pw-form button[type=submit]"); page.wait_for_timeout(200)
            assert "letter and one number" in page.inner_text("#auth-msg"), page.inner_text("#auth-msg")
            assert not any(c[1] == "/auth/v1/signup" for c in m.calls), "weak password was sent"
            page.click("[data-reveal='#a-pass']"); assert page.get_attribute("#a-pass", "type") == "text", "show-password toggle broken"
            page.fill("#a-pass", "Right-pass1"); page.click("#pw-form button[type=submit]")
            page.wait_for_url("**/dashboard.html")
            su = [c for c in m.calls if c[1] == "/auth/v1/signup"][0][3]
            assert su["email"] == "asha@example.in" and su["password"] == "Right-pass1" and su["data"]["full_name"] == "Asha Rao", su
        flow("sign up with a password", signup_oauth, signed_in=False)

        def signup_confirm(page, m):
            page.goto(f"{BASE}/signup.html"); page.wait_for_load_state("networkidle")
            page.fill("#a-name", "Asha Rao"); page.fill("#a-email", "asha@example.in"); page.fill("#a-pass", "Right-pass1"); page.check("#a-terms")
            page.click("#pw-form button[type=submit]"); page.wait_for_selector("#code-form:not(.hide)")
            assert page.locator("#a-resend").is_disabled(), "resend should wait 60 s"
            page.fill("#a-code", "123456"); page.click("#code-form button[type=submit]"); page.wait_for_url("**/dashboard.html")
        flow("sign up when email confirmation is on", signup_confirm, signed_in=False, signup_mode="confirm")

        def signup_exists(page, m):
            page.goto(f"{BASE}/signup.html"); page.wait_for_load_state("networkidle")
            page.fill("#a-name", "Asha Rao"); page.fill("#a-email", "asha@example.in"); page.fill("#a-pass", "Right-pass1"); page.check("#a-terms")
            page.click("#pw-form button[type=submit]"); page.wait_for_selector("text=already exists")
        flow("sign up with an email that's taken", signup_exists, signed_in=False, signup_mode="exists")

        def login_pw(page, m):
            page.goto(f"{BASE}/login.html?next=jobs.html"); page.wait_for_load_state("networkidle")
            page.fill("#a-email", "asha@example.in"); page.fill("#a-pass", "wrong-pass1"); page.click("#pw-form button[type=submit]")
            page.wait_for_selector("text=Wrong email or password")
            assert page.locator("#auth-msg a[href='forgot-password.html']").count() == 1, "no reset link after a wrong password"
            page.fill("#a-pass", "Right-pass1"); page.click("#pw-form button[type=submit]"); page.wait_for_url("**/jobs.html")
        flow("log in with a password (wrong, then right → back to where you were going)", login_pw, signed_in=False)

        def login_link(page, m):
            page.goto(f"{BASE}/login.html"); page.wait_for_load_state("networkidle")
            page.fill("#a-email", "asha@example.in"); page.click("#a-link-mode")
            assert page.locator("#a-email2").input_value() == "asha@example.in"
            page.click("#otp-form button[type=submit]"); page.wait_for_selector("#code-form:not(.hide)")
            otp = [c for c in m.calls if c[1] == "/auth/v1/otp"][0][3]
            assert otp["email"] == "asha@example.in" and otp["create_user"] is False, otp
            page.click("#a-back"); assert page.locator("#pw-form").is_visible()
        flow("email-link fallback on log in", login_link, signed_in=False)

        def forgot(page, m):
            page.goto(f"{BASE}/forgot-password.html"); page.wait_for_load_state("networkidle")
            assert not page.locator("#rp-via").is_visible(), "phone tab shown while SMS is off"
            page.fill("#a-email", "asha@example.in"); page.click("#reset-form button[type=submit]"); page.wait_for_selector("#rp-code-form:not(.hide)")
            rec = [c for c in m.calls if c[1] == "/auth/v1/recover"]
            assert rec and rec[0][3]["email"] == "asha@example.in", rec
            assert page.locator("#rp-resend").is_disabled(), "resend not on cooldown"
            page.fill("#rp-code", "12345678"); page.fill("#np-pass", "Newpass99"); page.fill("#np-pass2", "Newpass99")
            page.click("#rp-code-form button[type=submit]"); page.wait_for_url("**/dashboard.html")
            ver = [c for c in m.calls if c[1] == "/auth/v1/verify"][0][3]
            assert ver["type"] == "recovery" and ver["token"] == "12345678" and ver["email"] == "asha@example.in", ver
            assert any(c[0] == "PUT" and c[1] == "/auth/v1/user" and c[3]["password"] == "Newpass99" for c in m.calls), "password not set"
        flow("forgot password with an email code", forgot, signed_in=False)

        def forgot_phone(page, m):
            page.goto(f"{BASE}/forgot-password.html"); page.wait_for_selector("#rp-via:not(.hide)")
            page.click('[data-via="phone"]'); page.fill("#a-phone", "98765 43210"); page.click("#reset-form button[type=submit]")
            page.wait_for_selector("#rp-code-form:not(.hide)")
            otp = [c for c in m.calls if c[1] == "/auth/v1/otp"][0][3]
            assert otp["phone"] == "+919876543210" and otp["create_user"] is False, otp
            page.fill("#rp-code", "654321"); page.fill("#np-pass", "Newpass99"); page.fill("#np-pass2", "Newpass99")
            page.click("#rp-code-form button[type=submit]"); page.wait_for_url("**/dashboard.html")
            ver = [c for c in m.calls if c[1] == "/auth/v1/verify"][0][3]
            assert ver["type"] == "sms" and ver["phone"] == "+919876543210", ver
        flow("forgot password with an SMS code", forgot_phone, signed_in=False, phone=True)

        def add_phone(page, m):
            page.goto(f"{BASE}/settings.html?tab=s-sec"); page.wait_for_selector("#ph-card:not(.hide)")
            page.fill("#ph-new", "98765 43210"); page.click("#ph-go"); page.wait_for_selector("#ph-code-f:not(.hide)")
            assert any(c[0] == "PUT" and c[1] == "/auth/v1/user" and c[3].get("phone") == "+919876543210" for c in m.calls)
            page.fill("#ph-code", "111222"); page.click("#ph-go"); page.wait_for_selector("text=Current: +919876543210")
        flow("add and verify a mobile number", add_phone, phone=True)

        def reset_bad(page, m):
            page.goto(f"{BASE}/reset-password.html"); page.wait_for_selector("text=Send a new link")
        flow("reset page without a valid link", reset_bad, signed_in=False)

        def reset_ok(page, m):
            page.goto(f"{BASE}/reset-password.html"); page.wait_for_selector("#np-form:not(.hide)")
            page.fill("#np-pass", "Newpass99"); page.fill("#np-pass2", "Newpass98"); page.click("#np-form button[type=submit]")
            page.wait_for_selector("text=don't match")
            page.fill("#np-pass2", "Newpass99"); page.click("#np-form button[type=submit]"); page.wait_for_url("**/dashboard.html")
            assert any(c[0] == "PUT" and c[1] == "/auth/v1/user" and c[3]["password"] == "Newpass99" for c in m.calls)
        flow("reset page sets a new password", reset_ok)

        def change_pw(page, m):
            page.goto(f"{BASE}/settings.html?tab=s-sec"); page.wait_for_selector("#pw-change")
            page.fill("#pw-new", "Fresh-pass7"); page.fill("#pw-new2", "Fresh-pass7"); page.click("#pw-change button[type=submit]")
            page.wait_for_selector("#pw-nonce-f:not(.hide)")
            assert any(c[1] == "/auth/v1/reauthenticate" for c in m.calls), "no reauthentication code requested"
            page.fill("#pw-nonce", "654321"); page.click("#pw-change button[type=submit]"); page.wait_for_timeout(500)
            put = [c for c in m.calls if c[0] == "PUT" and c[1] == "/auth/v1/user"][-1][3]
            assert put["password"] == "Fresh-pass7" and put["nonce"] == "654321", put
            assert "saved" in toast(page).lower(), toast(page)
        flow("change password in settings (with re-authentication)", change_pw, reauth=True)

        def protected_redirect(page, m):
            page.goto(f"{BASE}/settings.html?tab=s-sec"); page.wait_for_load_state("networkidle")
            assert "/login.html?next=settings.html" in page.url, page.url
        flow("protected page redirects to log in", protected_redirect, signed_in=False)

        def tournament(page, m):
            page.goto(f"{BASE}/tournament.html?t=growth"); page.wait_for_load_state("networkidle")
            assert any(c[1].endswith("tournament_tasks") for c in m.calls), "task list not from tournament_tasks()"
            assert not any(c[1] == "/rest/v1/questions" for c in m.calls), "detail page still reads prompts"
            page.wait_for_selector("text=Launch email")
            page.goto(f"{BASE}/tournament.html?t=product"); page.wait_for_load_state("networkidle")
            page.click("#reg"); page.wait_for_timeout(300)
            assert any(c[0] == "POST" and c[1] == "/rest/v1/registrations" and c[3] == {"user_id": UID, "tournament_id": "product"} for c in m.calls), "registration not sent"
        flow("tournament detail + register", tournament)

        def live(page, m):
            page.goto(f"{BASE}/live.html?t=growth"); page.wait_for_selector("[data-rc-arena]")
            assert m.started, "start_entry not called"
            page.click('.option[data-q="1"][data-k="1"]'); page.click("#q-next"); page.fill('textarea[data-q="2"]', "My email")
            page.click("#q-submit"); page.click("#do-submit"); page.wait_for_url("**/results.html?t=growth")
            assert m.submitted["p_answers"]["1"] == 1 and m.submitted["p_answers"]["2"] == "My email", m.submitted
            page.wait_for_selector("text=Task-by-task")
        flow("live tournament → submit → results", live)

        def withdraw(page, m):
            page.goto(f"{BASE}/applications.html"); page.wait_for_selector("[data-withdraw]")
            page.click("h1")  # a stray click used to disarm the Withdraw handler
            page.locator("[data-withdraw]").first.click(); page.wait_for_timeout(500)
            page.locator("[data-withdraw]").first.click(); page.wait_for_timeout(500)
            dels = [c for c in m.calls if c[0] == "DELETE" and c[1] == "/rest/v1/applications"]
            assert len(dels) == 2, f"{len(dels)} withdrawals sent"
            page.wait_for_selector("text=No applications yet")
        flow("withdraw two applications", withdraw)

        def apply(page, m):
            page.goto(f"{BASE}/job.html?j=paperlane-intern"); page.wait_for_load_state("networkidle")
            page.click("[data-modal=apply-modal]"); page.fill("#ap-note", "Keen to learn"); page.click("#ap-send"); page.wait_for_url("**/applications.html?applied=*")
            assert any(c[1].endswith("apply_to_job") and c[3] == {"p_job": "paperlane-intern", "p_note": "Keen to learn"} for c in m.calls)
        flow("apply to a job", apply)

        def settings_fail(page, m):
            page.goto(f"{BASE}/settings.html"); page.wait_for_load_state("networkidle")
            t = page.locator('[data-pref="open_to_work"]'); before = t.get_attribute("aria-checked")
            t.click(); page.wait_for_timeout(500)
            assert t.get_attribute("aria-checked") == before, "toggle stayed flipped after a failed save"
        flow("settings toggle reverts on failure", settings_fail, fail_profile_patch=True)

        def settings_ok(page, m):
            page.goto(f"{BASE}/settings.html?tab=s-acc"); page.wait_for_load_state("networkidle")
            page.fill("#a-n", "Asha R"); page.click("#s-acc button[type=submit]"); page.wait_for_timeout(400)
            assert m.profile["full_name"] == "Asha R", m.profile
            page.click('[data-tab="s-vis"]'); page.click('[data-vis="public"]'); page.wait_for_timeout(400)
            assert m.profile["visibility"] == "public"
        flow("settings save", settings_ok)

        def delete_acct(page, m):
            page.goto(f"{BASE}/settings.html?tab=s-data"); page.wait_for_load_state("networkidle")
            page.click("[data-modal=del-modal]"); page.click("#del-go"); page.wait_for_timeout(200)
            assert not any(c[1].endswith("delete_my_account") for c in m.calls), "deleted without typing DELETE"
            page.fill("#del-confirm", "DELETE"); page.click("#del-go"); page.wait_for_url("**/index.html?deleted=1")
            page.wait_for_timeout(600); assert "deleted" in toast(page).lower(), toast(page)
        flow("delete account", delete_acct)

        def drills(page, m):
            page.goto(f"{BASE}/drills.html"); page.wait_for_selector("text=SEO is costing you the most points")
            assert "52/100" not in page.inner_text("main"), "fake drill data still shown"
            page.locator("[data-drill]").first.click(); page.wait_for_url("**/battle.html?id=*")
            names = [c[1].rsplit("/", 1)[1] for c in m.calls if "/rpc/" in c[1]]
            assert "battle_room" in names and "battle_start_now" in names, names
            room = [c for c in m.calls if c[1].endswith("battle_room")][0][3]
            assert room == {"p_size": 4, "p_scoring": "classic", "p_domain": "marketing"}, room
            page.wait_for_selector("#bt-opts .option"); page.keyboard.press("2"); page.wait_for_timeout(300)
            assert any(c[1].endswith("battle_answer") and c[3]["p_choice"] == 1 for c in m.calls), "keyboard answer not sent"
        flow("drills → bot battle → answer", drills)

        def battles(page, m):
            page.goto(f"{BASE}/battles.html"); page.wait_for_load_state("networkidle")
            page.fill("#h-title", "SVNIT Cup"); page.click("#host-form button[type=submit]"); page.wait_for_selector("text=ABC234")
            page.click("[data-modal=code-modal]"); page.fill("#j-code", "abc234"); page.click("#code-form button[type=submit]"); page.wait_for_url("**/battle.html?id=*")
            assert any(c[1].endswith("battle_join") and c[3] == {"p_code": "ABC234"} for c in m.calls)
        flow("host event + join by code", battles)

        def logout(page, m):
            page.goto(f"{BASE}/dashboard.html"); page.wait_for_load_state("networkidle")
            page.evaluate("sessionStorage.setItem('rc-ans-x', '1')")
            page.locator(".sidebar [data-logout]").click(); page.wait_for_url(f"{BASE}/index.html")
            assert page.evaluate("sessionStorage.getItem('rc-ans-x')") is None, "unsent answers left on the device"
        flow("log out clears device answers", logout)

        def error_state(page, m):
            page.route(f"{SB}/rest/v1/rpc/battle_hub", lambda r: r.fulfill(status=500, body='{"message":"boom"}', headers={"content-type": "application/json", "access-control-allow-origin": "*"}))
            page.goto(f"{BASE}/battles.html"); page.wait_for_selector("text=That didn't load")
            with page.expect_navigation(): page.click("[data-reload]")
        flow("error state retry button", error_state, expect_console=True)

        br.close()
    print(f"\n{len(problems)} problems")
    return 1 if problems else 0

if __name__ == "__main__":
    sys.exit(run())
