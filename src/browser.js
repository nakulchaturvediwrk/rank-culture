// Browser entry: renders a page's <body> from the same generators the build uses.
const pages = Object.assign({},
  require("./pages-public").pages, require("./pages-auth").pages, require("./pages-app").pages,
  require("./pages-app2").pages, require("./pages-recruiter").pages);
window.RCBODY = function (file) {
  if (!file) { const p = location.pathname.split("/").pop() || "index.html"; file = /\.html$/.test(p) ? p : p + ".html"; }
  const html = pages[file] || pages["404.html"];
  const t = html.match(/<title>([^<]*)<\/title>/); if (t) document.title = t[1].replace(/&amp;/g, "&");
  const i = html.indexOf("<body>") + 6, j = html.lastIndexOf("</body>");
  document.write(html.slice(i, j));
};
// Define the shell (logo/nav/footer) from the same source, so shell.js isn't needed.
new Function(require("./layout").shellJS())();
