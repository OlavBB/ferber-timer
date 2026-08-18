// Leser tilstanden i det delte rommet og skriver den ut lesbart.
// Kjør: node tools/dump.mjs

import fs from "node:fs";

const strip = (s) => s.replace(/^\uFEFF/, "").trim();
const key = strip(fs.readFileSync("C:/claude/ferber/supabase/anon-key.txt", "utf8"));
const room = strip(
  fs.readFileSync("C:/claude/ferber/supabase/.env.local", "utf8")
    .split(/\r?\n/).find((l) => l.startsWith("FERBER_ROOM_KEY=")).split("=")[1]
);

const r = await fetch("https://qtvztkxmnmxqlfhmvaou.supabase.co/rest/v1/rpc/ferber_get", {
  method: "POST",
  headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
  body: JSON.stringify({ p_room: room }),
});
const d = await r.json();

const t = (ms) => new Date(ms).toLocaleString("nb-NO",
  { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const m = (ms) => Math.round(ms / 60000);
const hm = (ms) => {
  const min = Math.round(ms / 60000);
  return min >= 60 ? `${Math.floor(min / 60)} t ${min % 60} min` : `${min} min`;
};

console.log("sist rørt:", d.touchedAt ? t(d.touchedAt) : "-", "av", d.device);
console.log("nattvalg :", d.night + 1);
console.log("økt nå   :", d.session
  ? `${d.session.phase} — startet ${t(d.session.episode.startedAt)}` +
    (d.session.episode.asleepAt ? `, sovnet ${t(d.session.episode.asleepAt)}` : "")
  : "ingen");
console.log("");

for (const [day, rec] of Object.entries(d.history).sort()) {
  console.log(`=== ${day} — natt ${rec.night}` +
    (rec.wokeUpAt ? `  |  sto opp ${t(rec.wokeUpAt)}` : "  |  INGEN MORGEN") +
    (rec.endedAt ? `  (gammel endedAt ${t(rec.endedAt)})` : ""));

  const eps = rec.episodes.filter((e) => !e.deleted);
  for (let i = 0; i < eps.length; i++) {
    const ep = eps[i];
    const flags = [ep.skip && "utenom", !ep.asleepAt && "UTEN SLUTTID"].filter(Boolean).join(" ");
    console.log(
      `  ${ep.kind.padEnd(8)} ${t(ep.startedAt)} -> ${ep.asleepAt ? t(ep.asleepAt) : "(ingen)"}` +
      `  ${ep.asleepAt ? String(m(ep.asleepAt - ep.startedAt)).padStart(4) + " min" : "        "}` +
      `  ${ep.checks.length} besøk  ${flags}`
    );
    const neste = eps[i + 1];
    if (ep.asleepAt && neste) {
      console.log(`    sover    ${hm(neste.startedAt - ep.asleepAt)}`);
    }
  }
  const sist = eps[eps.length - 1];
  if (sist && sist.asleepAt && rec.wokeUpAt) {
    const lengde = rec.wokeUpAt - sist.asleepAt;
    console.log(`    sover    ${hm(lengde)}` + (lengde > 13 * 3600e3 ? "   <-- MISTENKELIG LANG" : ""));
  }
  const slettede = rec.episodes.filter((e) => e.deleted).length;
  if (slettede) console.log(`  (${slettede} slettet)`);
}
