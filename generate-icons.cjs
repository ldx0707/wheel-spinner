// Simple Q-style white-background wheel icon generator
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  let crc = 0xffffffff;
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.concat([typeB, data]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(crcBuf), 0);
  return Buffer.concat([len, typeB, data, crcVal]);
}

function generateIcon(size) {
  const raw = Buffer.alloc(size * size * 4 + size);
  const cx = size / 2, cy = size / 2;
  const R = size * 0.38;
  const hubR = size * 0.06;
  const segColors = [
    [255, 130, 130],
    [120, 200, 200],
    [255, 200, 100],
    [130, 170, 255],
    [170, 220, 140],
    [255, 160, 200],
  ];

  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const off = y * (size * 4 + 1) + 1 + x * 4;
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // white background
      raw[off] = 255; raw[off + 1] = 255; raw[off + 2] = 255; raw[off + 3] = 255;

      // wheel segments
      if (dist <= R && dist >= hubR + 1) {
        const seg = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 6) % 6;
        const sc = segColors[seg];
        raw[off] = sc[0]; raw[off + 1] = sc[1]; raw[off + 2] = sc[2];
      }

      // center hub
      if (dist < hubR) {
        raw[off] = 100; raw[off + 1] = 100; raw[off + 2] = 100;
      }

      // small pointer at top
      const px = x, py = y;
      const tipY = cy - R + size * 0.02;
      if (
        py >= tipY - size * 0.04 && py <= tipY + size * 0.03 &&
        Math.abs(px - cx) <= (py - tipY + size * 0.04) * 0.35 + 1
      ) {
        raw[off] = 80; raw[off + 1] = 80; raw[off + 2] = 80;
      }
    }
  }

  // Build PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const deflated = zlib.deflateSync(raw);
  const idat = chunk('IDAT', deflated);
  const iend = chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([signature, chunk('IHDR', ihdrData), idat, iend]);
}

const outDir = __dirname;
fs.writeFileSync(path.join(outDir, 'icon-192.png'), generateIcon(192));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), generateIcon(512));
console.log('done');
