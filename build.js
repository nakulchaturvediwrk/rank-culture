// Builds the static site into ./dist and enforces the design system.
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "dist");
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });

const pages = Object.assign({},
  require("./src/pages-public").pages,
  require("./src/pages-auth").pages,
  require("./src/pages-app").pages,
  require("./src/pages-app2").pages,
  require("./src/pages-recruiter").pages,
);

// Each deployed page is a tiny stub: real <head> (title, meta, fonts, CSS) + a call
// that renders the body from assets/site.js. Full static HTML also goes to dist-static
// for testing and as a fallback.
const STATIC = path.join(__dirname, "dist-static");
fs.rmSync(STATIC, { recursive: true, force: true }); fs.mkdirSync(path.join(STATIC, "assets"), { recursive: true });
const minify = h => h.replace(/>\s+</g, "><").replace(/\n\s*/g, " ").replace(/ {2,}/g, " ");
for (const [file, html] of Object.entries(pages)) {
  fs.writeFileSync(path.join(STATIC, file), minify(html));
  const headPart = html.slice(0, html.indexOf("<body>")).replace('<script src="assets/shell.js"></script>', "");
  fs.writeFileSync(path.join(OUT, file), minify(headPart) + `<body><script src="assets/site.js"></script><script>RCBODY(${JSON.stringify(file)})</script><noscript>Please enable JavaScript to view the Rank Culture prototype.</noscript></body></html>`);
}
require("child_process").execSync(`npx --yes esbuild@0.24.0 src/browser.js --bundle --minify --format=iife --outfile=${path.join(OUT, "assets/site.js")}`, { stdio: "inherit" });
{ const f = path.join(OUT, "assets/site.js"); fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace(/\n\s*/g, " ").replace(/> </g, "><")); }
for (const f of fs.readdirSync(path.join(__dirname, "assets"))) for (const d of [OUT, STATIC]) fs.copyFileSync(path.join(__dirname, "assets", f), path.join(d, "assets", f));

const shell = require("./src/layout").shellJS();
fs.writeFileSync(path.join(STATIC, "assets", "shell.js"), shell);
fs.writeFileSync(path.join(OUT, "vercel.json"), JSON.stringify({ cleanUrls: false, trailingSlash: false }, null, 2));

// ---------- Design-system lint ----------
const ALLOWED_PX = new Set(["64px", "40px", "28px", "20px", "16px", "14px", "12px"]);
const problems = [];
const names = new Set(Object.keys(pages));
for (const [file, html] of Object.entries(pages)) {
  // 1. No raw font sizes outside the scale
  for (const m of html.matchAll(/font-size:\s*([0-9.]+px)/g)) if (!ALLOWED_PX.has(m[1])) problems.push(`${file}: off-scale font-size ${m[1]}`);
  // 2. No stray font families
  for (const m of html.matchAll(/font-family:\s*([^;"]+)/g)) if (!/var\(--f-/.test(m[1])) problems.push(`${file}: raw font-family ${m[1]}`);
  // 3. Every internal link resolves
  for (const m of html.matchAll(/href="([^"#:]+\.html)(?:\?[^"]*)?"/g)) if (!names.has(m[1])) problems.push(`${file}: broken link → ${m[1]}`);
  // 4. Exactly one logo lockup style
  if (!/class="logo|RC\.(pub|app)\(/.test(html) && file !== "map.html") problems.push(`${file}: missing logo/header`);
  // 5. Has a title
  if (!/<title>[^<]+<\/title>/.test(html)) problems.push(`${file}: missing <title>`);
}
for (const m of shell.matchAll(/href=\\?"([^"#:\\]+\.html)/g)) if (!names.has(m[1])) problems.push(`shell.js: broken link → ${m[1]}`);
const css = fs.readFileSync(path.join(__dirname, "assets/styles.css"), "utf8");
for (const m of css.matchAll(/font-size:\s*([0-9.]+px)/g)) if (!ALLOWED_PX.has(m[1])) problems.push(`styles.css: off-scale font-size ${m[1]}`);

// Deploy bundle: one generic stub + assets; Vercel rewrites every page URL to it.
const DEP = path.join(__dirname, "deploy");
fs.rmSync(DEP, { recursive: true, force: true }); fs.mkdirSync(path.join(DEP, "assets"), { recursive: true });
for (const f of ["site.js", "app.js", "styles.css", "favicon.svg"]) fs.copyFileSync(path.join(OUT, "assets", f), path.join(DEP, "assets", f));
const idx = fs.readFileSync(path.join(OUT, "index.html"), "utf8").replace('RCBODY("index.html")', "RCBODY()");
fs.writeFileSync(path.join(DEP, "index.html"), idx);
fs.writeFileSync(path.join(DEP, "vercel.json"), JSON.stringify({ rewrites: [{ source: "/((?!assets/).*)", destination: "/index.html" }] }));
console.log(`Built ${names.size} pages → dist/`);
if (problems.length) { console.log(`\n${problems.length} design-system problems:\n` + problems.join("\n")); process.exit(1); }
console.log("Design-system lint: 0 problems ✓");
