// Generates the PWA PNG icons without image dependencies: a ring and a T on the
// warm background, drawn per pixel with anti-aliasing, then PNG-encoded with zlib.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0xf6, 0xf2, 0xeb];
const ACCENT = [0xa9, 0x3a, 0x22];
const INK = [0x22, 0x1c, 0x17];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function mix(a, b, t) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }

function icon(size) {
  const s = size / 512;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const px = (x + 0.5) / s, py = (y + 0.5) / s;
      let col = BG;
      const d = Math.hypot(px - 256, py - 256);
      const ring = Math.max(0, Math.min(1, 14 - Math.abs(d - 150) + 0.5));
      col = mix(col, ACCENT, ring);
      const bar = (cx0, cy0, cx1, cy1) => {
        // distance to a rounded segment, half width 14
        const vx = cx1 - cx0, vy = cy1 - cy0;
        const t = Math.max(0, Math.min(1, ((px - cx0) * vx + (py - cy0) * vy) / (vx * vx + vy * vy)));
        const dd = Math.hypot(px - (cx0 + t * vx), py - (cy0 + t * vy));
        return Math.max(0, Math.min(1, 14 - dd + 0.5));
      };
      col = mix(col, INK, Math.max(bar(196, 196, 316, 196), bar(256, 196, 256, 336)));
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = col[0]; raw[o + 1] = col[1]; raw[o + 2] = col[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
for (const size of [192, 512]) writeFileSync(new URL(`../public/icon-${size}.png`, import.meta.url), icon(size));
console.log('icons written');
