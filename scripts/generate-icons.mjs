#!/usr/bin/env node
// Generate static PWA icons as PNG using sharp
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

function createIconSvg(size) {
  const fontSize = size === 512 ? 216 : 80;
  const radius = Math.round(size * 0.16);
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#0F7B5F"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
        font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}"
        font-weight="700" fill="white">PM</text>
</svg>`;
}

async function generateIcon(size) {
  const svg = Buffer.from(createIconSvg(size));
  const png = await sharp(svg).resize(size, size).png().toBuffer();
  const outPath = join(publicDir, `icon-${size}.png`);
  writeFileSync(outPath, png);
  console.log(`Generated ${outPath} (${png.length} bytes)`);
}

await generateIcon(192);
await generateIcon(512);
console.log('Done!');
