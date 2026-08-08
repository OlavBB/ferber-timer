// Lager appikonene som PNG uten bildebibliotek. Motivet er nedtellingsringen
// fra appen: en gul bue på nattbakgrunn, med runde ender som i SVG-en.
//
// Kjør: node tools/make-icons.mjs

import fs from "node:fs";
import zlib from "node:zlib";

const GROUND = [0x0c, 0x0b, 0x0f];
const AMBER = [0xf0, 0xa8, 0x68];

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;    // bitdybde
  ihdr[9] = 6;    // RGBA
  // Scanlinjer med filter 0 foran hver.
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Andel av buen som dekker punktet, målt med 3x3 delpunkter per piksel.
function coverage(px, py, c, r, half, sweep) {
  let hits = 0;
  for (let sy = 0; sy < 3; sy++) {
    for (let sx = 0; sx < 3; sx++) {
      const x = px + (sx + 0.5) / 3 - c;
      const y = py + (sy + 0.5) / 3 - c;
      const d = Math.hypot(x, y);

      // Selve buen.
      if (Math.abs(d - r) <= half) {
        let a = (Math.atan2(x, -y) * 180) / Math.PI;
        if (a < 0) a += 360;
        if (a <= sweep) { hits++; continue; }
      }
      // Runde ender, som stroke-linecap: round.
      for (const deg of [0, sweep]) {
        const rad = (deg * Math.PI) / 180;
        const ex = Math.sin(rad) * r;
        const ey = -Math.cos(rad) * r;
        if (Math.hypot(x - ex, y - ey) <= half) { hits++; break; }
      }
    }
  }
  return hits / 9;
}

function icon(size, inset) {
  const c = size / 2;
  const r = c * inset;
  const half = size * 0.075;
  const sweep = 292;                 // buen er ikke helt lukket — den teller ned
  const out = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const a = coverage(x, y, c, r, half, sweep);
      const i = (y * size + x) * 4;
      for (let k = 0; k < 3; k++) {
        out[i + k] = Math.round(GROUND[k] + (AMBER[k] - GROUND[k]) * a);
      }
      out[i + 3] = 255;
    }
  }
  return png(size, out);
}

fs.mkdirSync("icons", { recursive: true });

// Maskable må tåle at Android beskjærer til en sirkel: motivet holder seg
// innenfor den trygge sonen på 80 %, derfor en strammere bue.
const filer = [
  ["icons/icon-192.png", icon(192, 0.66)],
  ["icons/icon-512.png", icon(512, 0.66)],
  ["icons/icon-maskable-512.png", icon(512, 0.5)],
  ["icons/apple-touch-icon.png", icon(180, 0.62)],
  ["icons/favicon-32.png", icon(32, 0.6)],
];

for (const [navn, data] of filer) {
  fs.writeFileSync(navn, data);
  console.log(`${navn.padEnd(32)} ${String(data.length).padStart(7)} byte`);
}
