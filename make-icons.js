const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const table = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  table[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = table[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
const P = ["11110","10001","10001","11110","10000","10000","10000"];
const ONE = ["00100","01100","00100","00100","00100","00100","01110"];

function insideRound(x, y, w, h, r, px, py) {
  const ix = px - x, iy = py - y;
  if (ix < 0 || iy < 0 || ix >= w || iy >= h) return false;
  const cx = ix < r ? r : (ix >= w - r ? w - r - 1 : ix);
  const cy = iy < r ? r : (iy >= h - r ? h - r - 1 : iy);
  if (cx === ix || cy === iy) return true;
  const dx = ix - cx, dy = iy - cy;
  return dx * dx + dy * dy <= r * r;
}

function png(size) {
  const navy = [17, 27, 52];
  const blue = [49, 87, 213];
  const white = [255, 255, 255];
  const pad = Math.round(size * 0.16);
  const panel = size - pad * 2;
  const radius = Math.round(size * 0.08);
  const scale = Math.max(4, Math.round(size / 42));
  const gap = Math.round(scale * 1.2);
  const markW = 5 * scale + gap + 3 * scale;
  const markH = 7 * scale;
  const originX = Math.round((size - markW) / 2);
  const originY = Math.round((size - markH) / 2 - scale);
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      let color = navy;
      if (insideRound(pad, pad, panel, panel, radius, x, y)) color = white;
      const barX = pad + Math.round(scale * 0.7);
      if (x >= barX && x < barX + Math.max(4, Math.round(scale * 0.55)) && y >= pad + radius && y < pad + panel - radius) color = blue;
      const px = x - originX, py = y - originY;
      if (px >= 0 && py >= 0 && py < markH) {
        const col = Math.floor(px / scale);
        const rowBit = Math.floor(py / scale);
        let on = false;
        if (col < 5 && rowBit < 7) on = P[rowBit][col] === "1" && (px % scale) < scale - 1 && (py % scale) < scale - 1;
        const oneCol = col - 5 - Math.floor(gap / scale);
        if (oneCol >= 0 && oneCol < 3 && rowBit < 7) on = on || (ONE[rowBit][oneCol] === "1" && ((px - 5 * scale - gap) % scale) < scale - 1);
        if (on && insideRound(pad, pad, panel, panel, radius, x, y)) color = navy;
      }
      const i = row + 1 + x * 3;
      raw[i] = color[0]; raw[i + 1] = color[1]; raw[i + 2] = color[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

const dir = __dirname;
fs.writeFileSync(path.join(dir, "icon-192.png"), png(192));
fs.writeFileSync(path.join(dir, "icon-512.png"), png(512));
console.log("icons written");
