// Kjører renderDial mot virkelige netter med en minimal DOM-erstatning.
// Fanger kjøretidsfeil og sjekker at buen faktisk får innhold — det
// node --check aldri ser.
//
// Kjør: node tools/test-buen.mjs

import fs from "node:fs";

const html = fs.readFileSync("C:/claude/ferber/index.html", "utf8");
const netter = JSON.parse(fs.readFileSync("C:/claude/ferber/tools/eksempelnetter.json", "utf8"));

const grab = (name) => {
  const start = html.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`fant ikke ${name}`);
  let i = html.indexOf("{", start), depth = 0;
  for (let j = i; j < html.length; j++) {
    if (html[j] === "{") depth++;
    else if (html[j] === "}" && --depth === 0) return html.slice(start, j + 1);
  }
};

/* ---------- minimal DOM ---------- */

class E {
  constructor(navn) { this.navn = navn; this.attr = {}; this.barn = []; this.txt = ""; }
  setAttribute(k, v) { this.attr[k] = String(v); }
  getAttribute(k) { return this.attr[k]; }
  appendChild(c) { this.barn.push(c); return c; }
  addEventListener() {}
  set textContent(v) { this.txt = String(v); if (v === "") this.barn = []; }
  get textContent() { return this.txt; }
  get className() { return this.attr.class || ""; }
  set className(v) { this.attr.class = v; }
  alle(navn) {
    let ut = this.navn === navn ? [this] : [];
    this.barn.forEach((b) => { ut = ut.concat(b.alle(navn)); });
    return ut;
  }
  klasser() {
    let ut = this.attr.class ? [this.attr.class] : [];
    this.barn.forEach((b) => { ut = ut.concat(b.klasser()); });
    return ut;
  }
  tekst() {
    return this.txt + this.barn.map((b) => b.tekst()).join("");
  }
}

const noder = {};
const dok = {
  createElementNS: (_, n) => new E(n),
  createElement: (n) => new E(n),
  createTextNode: (t) => { const e = new E("#text"); e.txt = t; return e; },
  getElementById: (id) => (noder[id] = noder[id] || new E("div")),
};

/* ---------- kjør ---------- */

const S = {};
const navn = ["node", "punkt", "bueBane", "maane", "sol", "renderDial",
  "nightKey", "today", "shown", "recordFor", "episodesFor", "nightSummary",
  "activeDay", "epId", "hm", "mins", "clockTime"];

const app = new Function("S", "document", "SVGNS", "BUE", "openId", "viewDay", "renderDetail", `
  ${navn.map(grab).join("\n")}
  return { renderDial, punkt, bueBane };
`)(S, dok, "http://www.w3.org/2000/svg",
   { cx: 180, cy: 168, r: 136, fra: 250, spenn: 220 }, null, null, function () {});

let feil = 0;
const sjekk = (n, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) feil++;
  console.log(`${ok ? "ok  " : "FEIL"}  ${n}` + (ok ? "" : `\n      fikk ${JSON.stringify(a)} ventet ${JSON.stringify(b)}`));
};

const ekte = Date.now;

for (const [dag, rec] of Object.entries(netter)) {
  noder.nattG = new E("g");
  Object.assign(S, { night: 6, phase: "idle", episode: null, history: { [dag]: rec } });

  // Kl. 09 morgenen etter: da peker today() fortsatt på denne natten,
  // men alt som skjedde er over.
  const d = dag.split("-");
  Date.now = () => new Date(+d[0], +d[1] - 1, +d[2] + 1, 9, 0).getTime();

  let krasj = null;
  try { app.renderDial(); } catch (e) { krasj = e.message; }
  Date.now = ekte;

  const g = noder.nattG;
  const kl = g.klasser().join(" ");
  const antBobler = g.klasser().filter((c) => c.startsWith("boble")).length;
  const forventet = rec.episodes.filter((e) => !e.deleted).length;

  console.log(`\n--- ${dag} (${forventet} økter) ---`);
  sjekk("ingen krasj", krasj, null);
  sjekk("én boble per økt", antBobler, forventet);
  sjekk("den stille buen tegnes", kl.includes("natt"), true);
  sjekk("begge endene finnes", g.klasser().filter((c) => c.startsWith("ende")).length, 2);
  sjekk("treffeflater finnes", g.klasser().filter((c) => c === "treff").length >= forventet + 2, true);

  // Ingen NaN eller uendelig i geometrien — det gir usynlige elementer.
  const tall = [];
  const samle = (n) => {
    Object.entries(n.attr).forEach(([k, v]) => {
      if (["cx", "cy", "r", "x1", "y1", "x2", "y2", "x", "y", "d"].includes(k)) tall.push(v);
    });
    n.barn.forEach(samle);
  };
  samle(g);
  sjekk("ingen NaN i geometrien", tall.some((v) => /NaN|Infinity|undefined/.test(v)), false);

  // Boblene må ligge innenfor tegneflata.
  const utenfor = g.alle("circle").filter((c) => {
    if (!(c.attr.class || "").startsWith("boble")) return false;
    const x = +c.attr.cx, y = +c.attr.cy, r = +c.attr.r;
    return x - r < 0 || x + r > 360 || y - r < 0 || y + r > 336;
  });
  sjekk("alle bobler er innenfor rammen", utenfor.length, 0);

  // Ingen to bobler skal ligge helt oppå hverandre.
  const b = g.alle("circle").filter((c) => (c.attr.class || "").startsWith("boble"))
    .map((c) => ({ x: +c.attr.cx, y: +c.attr.cy, r: +c.attr.r }));
  let kolliderer = 0;
  for (let i = 0; i < b.length; i++)
    for (let j = i + 1; j < b.length; j++)
      if (Math.hypot(b[i].x - b[j].x, b[i].y - b[j].y) < Math.max(b[i].r, b[j].r)) kolliderer++;
  sjekk("bobler dekker ikke hverandre", kolliderer, 0);
}

console.log(feil ? `\n${feil} FEIL` : "\nbuen tegnes riktig for alle nettene");
process.exit(feil ? 1 : 0);
