// One-shot rasterizer for PlexusMap PWA icons.
// Usage: node public/icons/plexusmap/rasterize.cjs
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const dir = __dirname;

const jobs = [
    { src: 'plexusmap-favicon.svg',     out: 'plexusmap-16.png',                size: 16 },
    { src: 'plexusmap-favicon.svg',     out: 'plexusmap-32.png',                size: 32 },
    { src: 'plexusmap-favicon.svg',     out: 'plexusmap-48.png',                size: 48 },
    { src: 'plexusmap-color.svg',       out: 'plexusmap-96.png',                size: 96 },
    { src: 'plexusmap-color.svg',       out: 'plexusmap-192.png',               size: 192 },
    { src: 'plexusmap-color.svg',       out: 'plexusmap-512.png',               size: 512 },
    { src: 'plexusmap-apple-touch.svg', out: 'plexusmap-180-apple-touch.png',   size: 180 },
    { src: 'plexusmap-maskable.svg',    out: 'plexusmap-maskable-192.png',      size: 192 },
    { src: 'plexusmap-maskable.svg',    out: 'plexusmap-maskable-512.png',      size: 512 },
];

(async () => {
    for (const job of jobs) {
        try {
            await sharp(path.join(dir, job.src), { density: 384 })
                .resize(job.size, job.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .png()
                .toFile(path.join(dir, job.out));
            const stats = fs.statSync(path.join(dir, job.out));
            console.log(`OK  ${job.out.padEnd(38)} ${job.size}x${job.size}  ${(stats.size / 1024).toFixed(1)} KB`);
        } catch (e) {
            console.error(`FAIL ${job.out}: ${e.message}`);
        }
    }
})();
