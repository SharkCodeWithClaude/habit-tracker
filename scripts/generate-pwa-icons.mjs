#!/usr/bin/env node
// Generates minimal PWA icon PNGs with the Otter DS accent color.
// Uses Node.js built-in zlib — no external dependencies.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ACCENT = [0x2f, 0x6f, 0xeb]; // #2f6feb
const BG = [0xff, 0xff, 0xff]; // #ffffff

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

function createPng(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Draw a rounded-rect icon: accent circle on white bg
  const raw = Buffer.alloc(size * (size * 3 + 1));
  const center = size / 2;
  const radius = size * 0.38;
  const bgRadius = size * 0.18; // corner radius for background rounding

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 3 + 1);
    raw[rowStart] = 0; // filter none
    for (let x = 0; x < size; x++) {
      const px = rowStart + 1 + x * 3;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Check if within rounded rect bounds
      const inBounds = x >= 0 && x < size && y >= 0 && y < size;

      if (dist <= radius) {
        raw[px] = ACCENT[0];
        raw[px + 1] = ACCENT[1];
        raw[px + 2] = ACCENT[2];
      } else if (inBounds) {
        raw[px] = BG[0];
        raw[px + 1] = BG[1];
        raw[px + 2] = BG[2];
      }
    }
  }

  const compressed = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = join(import.meta.dirname, "..", "apps", "web", "public", "icons");
mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  const png = createPng(size);
  writeFileSync(join(outDir, `icon-${size}x${size}.png`), png);
  console.log(`Generated icon-${size}x${size}.png (${png.length} bytes)`);
}

// Apple touch icon (180x180)
const applePng = createPng(180);
writeFileSync(join(outDir, "apple-touch-icon.png"), applePng);
console.log(`Generated apple-touch-icon.png (${applePng.length} bytes)`);
