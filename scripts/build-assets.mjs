import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
const [src, out] = process.argv.slice(2);
for (const name of ["landscape-portrait", "thermal"]) {
  const meta = await sharp(`${src}/assets/${name}.png`).metadata();
  console.log(name, meta.width, meta.height);
  for (const w of [800, 1400, 2200]) {
    if (w > meta.width) continue;
    await sharp(`${src}/assets/${name}.png`).resize({ width: w }).webp({ quality: 78 }).toFile(`${out}/images/${name}-${w}.webp`);
  }
}
const wm = await sharp(`${src}/assets/wordmark.png`).metadata();
console.log("wordmark", wm.width, wm.height, wm.hasAlpha);
await sharp(`${src}/assets/wordmark.png`).resize({ width: Math.min(1600, wm.width) }).webp({ quality: 90 }).toFile(`${out}/images/wordmark.webp`);
await sharp(`${src}/assets/wordmark.png`).resize({ width: 600 }).png().toFile(`${out}/images/wordmark-email.png`);
const css = readFileSync(`${src}/style.css`, "utf8");
const fonts = [...css.matchAll(/font-family:(\w+);src:url\('data:font\/(\w+);base64,([^']+)'\)/g)];
for (const [, fam, fmt, b64] of fonts) { writeFileSync(`${out}/fonts/${fam.toLowerCase()}.${fmt}`, Buffer.from(b64, "base64")); console.log("font", fam, fmt); }
