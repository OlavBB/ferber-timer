// Gjenskaper: du glemmer å trykke «Avslutt natten», og trykker først
// neste kveld når hun skal legges igjen.
//
// Kjør: node tools/test-glemt-natt.mjs

import fs from "node:fs";

const html = fs.readFileSync("C:/claude/ferber/index.html", "utf8");
const grab = (name) => {
  const start = html.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`fant ikke ${name}`);
  let i = html.indexOf("{", start), depth = 0;
  for (let j = i; j < html.length; j++) {
    if (html[j] === "{") depth++;
    else if (html[j] === "}" && --depth === 0) return html.slice(start, j + 1);
  }
};

const navn = ["nightKey", "today", "shown", "recordFor", "episodesFor",
  "nightSummary", "endNight", "nightAnchor"];
const valgfri = ["parkEpisode", "closeStaleNight"];
const kilde = navn.concat(valgfri.filter((n) => html.includes(`function ${n}(`)))
  .map(grab).join("\n");

const S = {};
const app = new Function("S", `
  function releaseLock(){}
  function commit(){}
  ${kilde}
  return { ${navn.concat(valgfri).filter((n) => kilde.includes("function " + n + "(")).join(", ")} };
`)(S);

let feil = 0;
const sjekk = (n, faktisk, forventet) => {
  const ok = JSON.stringify(faktisk) === JSON.stringify(forventet);
  if (!ok) feil++;
  console.log(`${ok ? "ok  " : "FEIL"}  ${n}` + (ok ? "" : `\n      fikk ${JSON.stringify(faktisk)} ventet ${JSON.stringify(forventet)}`));
};
const hm = (ms) => {
  const m = Math.round(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)} t ${m % 60} min` : `${m} min`;
};

const ekte = Date.now;
const sett = (d, t) => { Date.now = () => new Date(2026, 7, d, ...t).getTime(); };

// --- natten 18. august: lagt 19:07, sovnet 19:09. Hun står opp 06:00
//     den 19., men du glemmer å trykke.
const lagt = new Date(2026, 7, 18, 19, 7).getTime();
const sovnet = new Date(2026, 7, 18, 19, 9).getTime();
const seng = { id: "n18", kind: "bedtime", startedAt: lagt, checks: [], asleepAt: sovnet };

Object.assign(S, {
  night: 6, phase: "asleep", phaseStart: sovnet, checkIndex: 0, episode: seng,
  history: { "2026-08-18": { night: 7, episodes: [seng] } },
});

console.log("=== morgenen etter, kl. 09:00 — du har hentet henne, men ikke trykket ===");
sett(19, [9, 0]);
let s = app.nightSummary("2026-08-18");
console.log(`   natten regnes som ${hm(s.total)}, søvn ${hm(s.asleep)}, paagaar=${s.ongoing}`);
sjekk("morgenen kan settes selv om natten staar som paagaaende",
  html.includes("} else if (!s || !s.ongoing) {"), false);

console.log("\n=== neste kveld kl. 19:00 — du trykker «Avslutt natten» ===");
sett(19, [19, 0]);
if (app.closeStaleNight) app.closeStaleNight();
app.endNight();

const rec = S.history["2026-08-18"];
const morgen = rec.wokeUpAt;
console.log("   sto opp ble satt til:", morgen ? new Date(morgen).toLocaleString("nb-NO") : "ikke satt");
if (morgen) {
  console.log(`   siste soevnperiode blir: ${hm(morgen - sovnet)}`);
}

sjekk("morgenen stemples ikke et doegn feil",
  morgen ? app.nightKey(morgen) === "2026-08-18" : true, true);

sett(19, [19, 0]);
s = app.nightSummary("2026-08-18");
sjekk("natten teller ikke videre inn i neste doegn", s.total <= 18 * 3600e3, true);

Date.now = ekte;
console.log(feil ? `\n${feil} FEIL` : "\nalle sjekker passerte");
process.exit(feil ? 1 : 0);
