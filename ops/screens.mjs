#!/usr/bin/env node
// Screenshots of the review page for the Sunday email. Usage: node ops/screens.mjs <review_url> <out_dir>
// Writes 1-summary.png, 2-tournament.png, 3-practice.png (JPEG-sized PNGs, ~600px wide).
import { chromium } from "playwright";
import fs from "fs";

const [, , url, out] = process.argv;
if (!url || !out) { console.error("usage: screens.mjs review_url out_dir"); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
const br = await chromium.launch();
const page = await br.newPage({ viewport: { width: 760, height: 1000 }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForSelector("details.card", { timeout: 30000 });
await page.evaluate(() => document.querySelectorAll("header, .header, footer, .footer").forEach(e => e.remove()));
const shot = async (el, name) => {
  await el.scrollIntoViewIfNeeded();
  const b = await el.boundingBox(), y = b.y + (await page.evaluate(() => window.scrollY));
  await page.screenshot({ path: `${out}/${name}`, fullPage: true, clip: { x: Math.max(0, b.x - 4), y: Math.max(0, y - 4), width: Math.min(760, b.width + 8), height: Math.min(900, b.height + 8) } });
};
await page.screenshot({ path: `${out}/1-summary.png`, clip: { x: 0, y: 0, width: 760, height: 620 } });
await shot(page.locator("details.card").first(), "2-tournament.png");
const practice = page.locator("details.card").last();
await practice.evaluate(d => { d.open = true; });
await shot(practice, "3-practice.png");
await br.close();
console.log(fs.readdirSync(out).filter(f => f.endsWith(".png")).join(", "));
