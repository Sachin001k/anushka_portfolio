// Prepares photos and documents for the website.
//
// 1. Put the original files (from Wix Media, your phone, etc.) in media/<gallery-name>/
//    e.g. media/book-club/IMG_1234.jpg, media/work-ajanta/ajanta-lor.pdf
// 2. Run: npm run images
//
// Images are resized to max 1600px and saved as WebP in src/assets/galleries/<gallery-name>/.
// PDFs are copied as-is, plus a small cover preview (<name>.thumb.webp, macOS only).
// HEIC photos (iPhone) are converted with macOS `sips` first.
// Only folders named like gallery names (lowercase-with-dashes) are processed, so you can
// keep other folders (e.g. a raw download from Wix) inside media/ too.
// The media/ folder itself is not committed — only the optimised copies are.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MEDIA = path.join(root, 'media');
const OUT = path.join(root, 'src', 'assets', 'galleries');
const MAX_WIDTH = 1600;

const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'file';

if (!fs.existsSync(MEDIA)) {
  fs.mkdirSync(MEDIA);
  console.log('Created media/. Put each set of photos in its own folder inside it, then run this again.');
  process.exit(0);
}

// Skip files that were already converted and haven't changed since.
const isUpToDate = (src, dest) => fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(src).mtimeMs;

let count = 0;
for (const gallery of fs.readdirSync(MEDIA, { withFileTypes: true })) {
  if (!gallery.isDirectory() || !/^[a-z0-9-]+$/.test(gallery.name)) continue;
  const inDir = path.join(MEDIA, gallery.name);
  const outDir = path.join(OUT, gallery.name);
  fs.mkdirSync(outDir, { recursive: true });

  for (const file of fs.readdirSync(inDir)) {
    if (file.startsWith('.')) continue;
    const src = path.join(inDir, file);
    const ext = path.extname(file).toLowerCase();
    const base = slugify(file);

    if (ext === '.pdf') {
      const dest = path.join(outDir, `${base}.pdf`);
      if (!isUpToDate(src, dest)) fs.copyFileSync(src, dest);
      const thumb = path.join(outDir, `${base}.thumb.webp`);
      if (process.platform === 'darwin' && !isUpToDate(src, thumb)) {
        const png = path.join(os.tmpdir(), `${base}-cover.png`);
        try {
          execFileSync('sips', ['-s', 'format', 'png', src, '--out', png], { stdio: 'ignore' });
          await sharp(png).resize({ width: 600, withoutEnlargement: true }).flatten({ background: '#ffffff' }).webp({ quality: 78 }).toFile(thumb);
        } catch {
          console.warn(`  (no cover preview for ${file})`);
        }
      }
      console.log(`  ${gallery.name}/${base}.pdf`);
      count++;
      continue;
    }

    let input = src;
    if ((ext === '.heic' || ext === '.heif') && isUpToDate(src, path.join(outDir, `${base}.webp`))) {
      count++;
      continue;
    }
    if (ext === '.heic' || ext === '.heif') {
      if (process.platform !== 'darwin') {
        console.warn(`  Skipped ${file}: convert HEIC to JPG first.`);
        continue;
      }
      input = path.join(os.tmpdir(), `${base}.jpg`);
      execFileSync('sips', ['-s', 'format', 'jpeg', src, '--out', input], { stdio: 'ignore' });
    } else if (!['.jpg', '.jpeg', '.png', '.webp', '.gif', '.tif', '.tiff', '.avif'].includes(ext)) {
      console.warn(`  Skipped ${file}: not an image or PDF.`);
      continue;
    }

    const dest = path.join(outDir, `${base}.webp`);
    if (isUpToDate(src, dest)) {
      count++;
      continue;
    }
    await sharp(input)
      .rotate() // respect phone orientation
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(dest);
    console.log(`  ${gallery.name}/${base}.webp`);
    count++;
  }
}
console.log(`Done — ${count} file(s) ready in src/assets/galleries/.`);
