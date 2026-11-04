// Browser entry: renders a page's <body> from the same generators the build uses,
// after the auth gate in rc.js has decided the visitor may see it.
const pages = Object.assign({},
  require("./pages-public").pages, require("./pages-auth").pages, require("./pages-app").pages,
  require("./pages-app2").pages, require("./pages-recruiter").pages, require("./pages-battle").pages);
const rc = require("./rc");
window.RCBODY = function (file) {
  if (!file) { const p = location.pathname.split("/").pop() || "index.html"; file = /\.html$/.test(p) ? p : p + ".html"; }
  if (!pages[file]) file = "404.html";
  if (!rc.guard(file)) return; // redirecting to log in
  const html = rc.prepare(file, pages[file]);
  const t = html.match(/<title>([^<]*)<\/title>/); if (t) document.title = t[1].replace(/&amp;/g, "&");
  const i = html.indexOf("<body>") + 6, j = html.lastIndexOf("</body>");
  document.write(html.slice(i, j));
  document.addEventListener("DOMContentLoaded", () => rc.start(file));
};
// Define the shell (logo/nav/footer) from the same source as shell.js — without eval, so CSP can forbid it.
const SHELL = require("./layout").shellParts();
const put = (key, active) => {
  const s = document.currentScript, t = document.createElement("template");
  t.innerHTML = SHELL[key];
  if (active) t.content.querySelectorAll(".nav a, .side-nav a, .bottom-nav a").forEach(a => {
    if (a.getAttribute("href") === active) { a.classList.add("active"); a.setAttribute("aria-current", "page"); }
  });
  s.parentNode.insertBefore(t.content, s);
};
window.RC = { pub: a => put("pub", a), app: a => put("app", a), side: a => put("side", a), bottom: a => put("bottom", a), foot: () => put("foot") };
