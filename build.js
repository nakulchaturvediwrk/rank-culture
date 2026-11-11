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
  require("./src/pages-battle").pages,
  require("./src/pages-path").pages,
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
require("child_process").execSync(`${fs.existsSync(path.join(__dirname, "node_modules/.bin/esbuild")) ? path.join(__dirname, "node_modules/.bin/esbuild") : "npx --yes esbuild@0.25.12"} src/browser.js --bundle --minify --format=iife --outfile=${path.join(OUT, "assets/site.js")}`, { stdio: "inherit" });
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
for (const f of ["site.js", "app.js", "styles.css", "favicon.svg", "logo.png", "logo-64.png", "logo-180.png", "logo-512.png", "favicon-32.png", "og.png"]) fs.copyFileSync(path.join(OUT, "assets", f), path.join(DEP, "assets", f));
const idx = fs.readFileSync(path.join(OUT, "index.html"), "utf8").replace('RCBODY("index.html")', "RCBODY()");
// Cache-bust the entry assets so a new deploy is picked up immediately.
const ver = require("crypto").createHash("sha1").update(fs.readFileSync(path.join(DEP, "assets/site.js"))).update(fs.readFileSync(path.join(DEP, "assets/styles.css"))).digest("hex").slice(0, 10);
fs.writeFileSync(path.join(DEP, "index.html"), idx.replace("assets/site.js", `assets/site.js?v=${ver}`).replace("assets/styles.css", `assets/styles.css?v=${ver}`));
// CSP without 'unsafe-inline' for scripts: allow exactly the inline scripts we ship, by hash.
const inline = new Set([...Object.values(pages).flatMap(h => [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1])),
  ...[...fs.readFileSync(path.join(DEP, "index.html"), "utf8").matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1])]);
const hashes = [...inline].map(src => `'sha256-${require("crypto").createHash("sha256").update(src, "utf8").digest("base64")}'`).sort();
// Vercel reads headers from the root vercel.json before the build runs, so the hashes live there.
// Locally this keeps it in sync; on Vercel (VERCEL=1) a stale CSP fails the build instead of shipping broken pages.
{ const vf = path.join(__dirname, "vercel.json"), raw = fs.readFileSync(vf, "utf8"), v = JSON.parse(raw);
  const want = `script-src 'self' https://challenges.cloudflare.com ${hashes.join(" ")};`;
  for (const h of v.headers) for (const x of h.headers) if (x.key === "Content-Security-Policy") {
    if (!/script-src [^;]*;/.test(x.value)) problems.push("vercel.json: CSP has no script-src");
    x.value = x.value.replace(/script-src [^;]*;/, want);
  }
  const next = JSON.stringify(v, null, 2) + "\n";
  const cspOf = j => j.headers.flatMap(h => h.headers).filter(x => x.key === "Content-Security-Policy").map(x => x.value).join("|");
  if (cspOf(JSON.parse(raw)) !== cspOf(v)) {
    if (process.env.VERCEL) { const have = new Set((cspOf(JSON.parse(raw)).match(/'sha256-[^']+'/g) || [])); problems.push(`vercel.json: CSP script hashes are stale (missing: ${hashes.filter(h => !have.has(h)).join(" ") || "none"}) — run \`node build.js\` locally and commit vercel.json`); }
    else { fs.writeFileSync(vf, next); console.log("vercel.json: CSP script hashes updated — commit it"); }
  }
  fs.writeFileSync(path.join(DEP, "vercel.json"), JSON.stringify({ rewrites: v.rewrites, headers: v.headers }, null, 2)); }
for (const [file, html] of Object.entries(pages)) {
  for (const m of html.matchAll(/<[a-z][^>]*\son[a-z]+\s*=/gi)) problems.push(`${file}: inline event handler ${m[0].slice(0, 60)}`);
  for (const m of html.matchAll(/href="javascript:/gi)) problems.push(`${file}: javascript: link`);
}
console.log(`CSP: ${hashes.length} inline scripts allowed by hash, no 'unsafe-inline'`);
console.log(`Built ${names.size} pages → dist/`);
if (problems.length) { console.log(`\n${problems.length} design-system problems:\n` + problems.join("\n")); process.exit(1); }
console.log("Design-system lint: 0 problems ✓");
