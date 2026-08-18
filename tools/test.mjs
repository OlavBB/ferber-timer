// Testene henter funksjonene ut av index.html og kjører dem, så de tester
// koden som faktisk sendes til nettleseren — ikke en kopi.
//
// Kjør: node tools/test.mjs

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
  throw new Error(`ubalansert ${name}`);
};

// Bygger et miljø med de navngitte funksjonene og en egen S.
const lag = (S, navn) => new Function("S", `
  function releaseLock(){}
  function commit(){}
  ${navn.map(grab).join("\n")}
  return { ${navn.join(", ")} };
`)(S);

let feil = 0;
const sjekk = (n, faktisk, forventet) => {
  const ok = JSON.stringify(faktisk) === JSON.stringify(forventet);
  if (!ok) feil++;
  console.log(`${ok ? "ok  " : "FEIL"}  ${n}` +
    (ok ? "" : `\n      fikk ${JSON.stringify(faktisk)} ventet ${JSON.stringify(forventet)}`));
};
const bolk = (n) => console.log(`\n${n}`);

const ekte = Date.now;
const frys = (...a) => { Date.now = () => new Date(...a).getTime(); };
const tin = () => { Date.now = ekte; };

/* ---------- klokkeslett ---------- */

bolk("klokkeslett over midnatt");
{
  const S = { history: {} };
  const { fromTimeValue } = lag(S, ["fromTimeValue"]);
  const kl2344 = new Date(2026, 7, 3, 23, 44).getTime();
  sjekk("00:38 etter 23:44 havner neste døgn",
    new Date(fromTimeValue(kl2344, "00:38")).getDate(), 4);
  sjekk("23:59 samme kveld blir samme døgn",
    new Date(fromTimeValue(kl2344, "23:59")).getDate(), 3);
  sjekk("ugyldig klokkeslett gir null", fromTimeValue(kl2344, "tull"), null);
}

/* ---------- sammenslåing mellom enheter ---------- */

bolk("sammenslåing");
{
  const S = { history: {} };
  const { mergeHistory, shown, counted } =
    lag(S, ["mergeHistory", "shown", "counted", "epId"]);

  S.history = { "2026-08-03": { night: 1, episodes: [
    { kind: "waking", startedAt: 1000, checks: [], asleepAt: 2000 }
  ] } };

  mergeHistory({ "2026-08-03": { night: 1, episodes: [
    { kind: "waking", startedAt: 1000, checks: [], asleepAt: 2000 },
    { kind: "waking", startedAt: 5000, checks: [], asleepAt: 6000 }
  ] } });
  sjekk("ny økt legges til, kjent økt duplikeres ikke",
    S.history["2026-08-03"].episodes.length, 2);

  mergeHistory({ "2026-08-03": { night: 1, episodes: [
    { kind: "waking", startedAt: 1000, checks: [], asleepAt: 2000, skip: true, editedAt: 9999 }
  ] } });
  sjekk("nyere endring vinner", S.history["2026-08-03"].episodes[0].skip, true);

  mergeHistory({ "2026-08-03": { night: 1, episodes: [
    { kind: "waking", startedAt: 1000, checks: [], asleepAt: 2000, skip: false, editedAt: 500 }
  ] } });
  sjekk("eldre endring taper", S.history["2026-08-03"].episodes[0].skip, true);

  S.history["2026-08-03"].episodes[1].deleted = true;
  S.history["2026-08-03"].episodes[1].editedAt = 12000;
  mergeHistory({ "2026-08-03": { night: 1, episodes: [
    { kind: "waking", startedAt: 5000, checks: [], asleepAt: 6000 }
  ] } });
  sjekk("sletting overlever at motparten sender økten inn igjen",
    S.history["2026-08-03"].episodes[1].deleted, true);

  sjekk("shown skjuler slettede", shown(S.history["2026-08-03"]).length, 1);
  sjekk("counted skjuler også utenom-økter", counted(S.history["2026-08-03"]).length, 0);

  // Starttidspunktet kan endres, så identiteten kan ikke henge på det.
  S.history = { "2026-08-09": { night: 7, episodes: [
    { id: "abc", kind: "waking", startedAt: 1500, checks: [], asleepAt: 2000, editedAt: 900 }
  ] } };
  mergeHistory({ "2026-08-09": { night: 7, episodes: [
    { id: "abc", kind: "waking", startedAt: 1000, checks: [], asleepAt: 2000, editedAt: 50 }
  ] } });
  sjekk("endret starttid lager ikke duplikat", S.history["2026-08-09"].episodes.length, 1);
  sjekk("og din nyere endring står", S.history["2026-08-09"].episodes[0].startedAt, 1500);

  S.history["2026-08-10"] = { night: 8, episodes: [
    { kind: "waking", startedAt: 7000, checks: [], asleepAt: 8000 }
  ] };
  mergeHistory({ "2026-08-10": { night: 8, episodes: [
    { kind: "waking", startedAt: 7000, checks: [], asleepAt: 8000 }
  ] } });
  sjekk("gammel økt uten id duplikeres ikke", S.history["2026-08-10"].episodes.length, 1);

  S.history["2026-08-11"] = { night: 9, episodes: [], wokeUpAt: 100, wokeUpEditedAt: 10 };
  mergeHistory({ "2026-08-11": { night: 9, episodes: [], wokeUpAt: 555, wokeUpEditedAt: 99 } });
  sjekk("nyere morgen vinner", S.history["2026-08-11"].wokeUpAt, 555);
  mergeHistory({ "2026-08-11": { night: 9, episodes: [], wokeUpAt: 111, wokeUpEditedAt: 20 } });
  sjekk("eldre morgen taper", S.history["2026-08-11"].wokeUpAt, 555);
}

/* ---------- avslutning av natten ---------- */

bolk("avslutning");
{
  const S = {};
  const app = lag(S, ["nightKey", "today", "parkEpisode", "endNight"]);
  const kveld = new Date(2026, 7, 4, 21, 30).getTime();

  frys(2026, 7, 4, 23, 0);
  Object.assign(S, {
    night: 1, phase: "waiting", phaseStart: kveld, checkIndex: 2, history: {},
    episode: { kind: "waking", startedAt: kveld, checks: [], asleepAt: null }
  });
  app.endNight();
  const dag = Object.keys(S.history)[0];
  sjekk("pågående økt spares", S.history[dag].episodes.length, 1);
  sjekk("uten påstått sovnet-tid", S.history[dag].episodes[0].asleepAt, null);
  sjekk("appen går til ro", [S.phase, S.episode], ["idle", null]);

  Object.assign(S, {
    night: 1, phase: "checking", phaseStart: kveld + 60000, checkIndex: 0, history: {},
    episode: { kind: "waking", startedAt: kveld, checks: [], asleepAt: null }
  });
  app.endNight();
  sjekk("påbegynt besøk tas med",
    S.history[Object.keys(S.history)[0]].episodes[0].checks.length, 1);

  const ferdig = { kind: "waking", startedAt: kveld, checks: [], asleepAt: kveld + 600000 };
  Object.assign(S, {
    night: 1, phase: "asleep", phaseStart: kveld, checkIndex: 0,
    history: { "2026-08-04": { night: 2, episodes: [ferdig] } }, episode: ferdig
  });
  app.endNight();
  sjekk("avsluttet økt dobbeltlagres ikke", S.history["2026-08-04"].episodes.length, 1);
  sjekk("morgenen settes når du avslutter i natten",
    typeof S.history["2026-08-04"].wokeUpAt, "number");
  tin();

  // Morgenen må treffe øktens natt, ikke dagen du tilfeldigvis trykker.
  const nattStart = new Date(2026, 7, 6, 22, 0).getTime();
  Object.assign(S, {
    night: 1, phase: "waiting", phaseStart: nattStart, checkIndex: 0,
    history: { "2026-08-06": { night: 3, episodes: [] } },
    episode: { kind: "waking", startedAt: nattStart, checks: [], asleepAt: null }
  });
  frys(2026, 7, 7, 9, 0);
  app.endNight();
  tin();
  sjekk("økten havner på nattens dato", Object.keys(S.history), ["2026-08-06"]);
  sjekk("morgen kl. 09 dagen etter godtas",
    typeof S.history["2026-08-06"].wokeUpAt, "number");
}

/* ---------- natt du glemte å avslutte ---------- */

bolk("glemt natt");
{
  const S = {};
  const app = lag(S, ["nightKey", "today", "shown", "recordFor", "episodesFor",
    "nightSummary", "parkEpisode", "endNight", "closeStaleNight"]);

  const lagt = new Date(2026, 7, 18, 19, 7).getTime();
  const sovnet = new Date(2026, 7, 18, 19, 9).getTime();
  const seng = { id: "n18", kind: "bedtime", startedAt: lagt, checks: [], asleepAt: sovnet };
  const nullstill = () => Object.assign(S, {
    night: 6, phase: "asleep", phaseStart: sovnet, checkIndex: 0, episode: seng,
    history: { "2026-08-18": { night: 7, episodes: [seng] } }
  });

  // Neste kveld: natten skal ha lukket seg selv.
  nullstill();
  frys(2026, 7, 19, 19, 0);
  sjekk("glemt natt lukkes ved døgnskiftet", app.closeStaleNight(), true);
  sjekk("appen står ikke lenger i «hun sover»", S.phase, "idle");
  sjekk("og morgenen dikter den ikke opp", S.history["2026-08-18"].wokeUpAt, undefined);
  sjekk("natten teller ikke videre",
    Math.round(app.nightSummary("2026-08-18").total / 60000), 2);
  tin();

  // Trykker du «Avslutt natten» først neste kveld, skal den ikke stemple nå.
  nullstill();
  frys(2026, 7, 19, 19, 0);
  app.endNight();
  sjekk("sen avslutning stempler ikke et døgn feil",
    S.history["2026-08-18"].wokeUpAt, undefined);
  tin();

  // Samme natt skal fortsatt kunne lukkes normalt.
  nullstill();
  frys(2026, 7, 18, 23, 30);
  sjekk("en natt som går nå røres ikke", app.closeStaleNight(), false);
  tin();

  // Morgenen i sin egen natt godtas.
  nullstill();
  frys(2026, 7, 19, 6, 5);
  app.endNight();
  sjekk("morgen kl. 06:05 settes som normalt",
    app.nightKey(S.history["2026-08-18"].wokeUpAt), "2026-08-18");
  tin();
}

/* ---------- hvor langt natten regnes ---------- */

bolk("nattens lengde");
{
  const S = {};
  const { nightSummary } = lag(S, ["nightKey", "today", "shown", "recordFor",
    "episodesFor", "nightSummary"]);

  frys(2026, 7, 8, 23, 0);
  const lagt = new Date(2026, 7, 8, 18, 47).getTime();
  const sovnet = new Date(2026, 7, 8, 18, 52).getTime();
  const seng = { kind: "bedtime", startedAt: lagt, checks: [], asleepAt: sovnet };
  Object.assign(S, {
    night: 5, phase: "asleep", episode: seng,
    history: { "2026-08-08": { night: 6, episodes: [seng] } }
  });

  let s = nightSummary("2026-08-08");
  sjekk("natt som pågår teller til nå", Math.round(s.total / 60000), 253);
  sjekk("og er merket pågående", s.ongoing, true);
  sjekk("våken telles bare for økten", Math.round(s.awake / 60000), 5);
  sjekk("resten regnes som søvn", Math.round(s.asleep / 60000), 248);

  S.phase = "idle";
  S.episode = null;
  S.history["2026-08-08"].wokeUpAt = new Date(2026, 7, 8, 20, 0).getTime();
  s = nightSummary("2026-08-08");
  sjekk("avsluttet natt stopper ved morgenen", Math.round(s.total / 60000), 73);
  sjekk("og er ikke lenger pågående", s.ongoing, false);

  S.history["2026-08-07"] = { night: 5, episodes: [
    { kind: "bedtime", startedAt: new Date(2026, 7, 7, 18, 50).getTime(), checks: [],
      asleepAt: new Date(2026, 7, 7, 18, 59).getTime() },
    { kind: "waking", startedAt: new Date(2026, 7, 8, 5, 55).getTime(), checks: [],
      asleepAt: new Date(2026, 7, 8, 6, 4).getTime() }
  ] };
  s = nightSummary("2026-08-07");
  sjekk("gammel natt stopper ved siste hendelse", Math.round(s.total / 60000), 674);
  sjekk("gammel natt teller ikke videre", s.ongoing, false);
  tin();
}

console.log(feil ? `\n${feil} FEIL` : "\nalle tester passerte");
process.exit(feil ? 1 : 0);
