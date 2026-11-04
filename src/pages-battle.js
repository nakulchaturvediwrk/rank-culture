// Battle screens. Bodies are rendered from live data by src/rc-battle.js.
const { appPage } = require("./layout");
const shell = (title, active) => appPage({ title, active, body: `<p class="muted">Loading…</p>` });
module.exports = { pages: {
  "battles.html": shell("Battles", "battles.html"),
  "battle.html": shell("Battle", "battles.html"),
  "knockout.html": shell("Knockout", "battles.html"),
} };
