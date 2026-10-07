/**
 * Generates every Android launcher icon + the native splash from
 * app/src/assets/logo.png (the HabitGo brand tile).
 *
 *   node scripts/generate-icons.mjs
 */
import Jimp from 'jimp';
import fs from 'node:fs';
import path from 'node:path';

const RES = path.resolve('android/app/src/main/res');
const SRC = path.resolve('src/assets/logo.png');

const LAUNCHER_SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};
// Adaptive icon foreground canvases (108dp * density)
const FOREGROUND_SIZES = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

const src = await Jimp.read(SRC);
const w = src.bitmap.width;
// Sample the tile green from a corner-inset pixel for the adaptive background
const d = src.bitmap.data;
const px = (Math.floor(w * 0.5) * w + Math.floor(w * 0.08)) * 4; // x=8%, y=50%
const hex2 = (n) => n.toString(16).padStart(2, '0');
const BG_HEX = `#${hex2(d[px])}${hex2(d[px + 1])}${hex2(d[px + 2])}FF`;

for (const [dir, size] of Object.entries(LAUNCHER_SIZES)) {
  fs.mkdirSync(path.join(RES, dir), { recursive: true });
  const img = src.clone().resize(size, size, Jimp.RESIZE_BICUBIC);
  await img.writeAsync(path.join(RES, dir, 'ic_launcher.png'));
  await img.writeAsync(path.join(RES, dir, 'ic_launcher_round.png'));
  console.log(`${dir}: ic_launcher ${size}px`);
}

for (const [dir, size] of Object.entries(FOREGROUND_SIZES)) {
  const canvas = new Jimp(size, size, BG_HEX);
  const inner = Math.round(size * 0.78); // tile inside the safe zone
  const tile = src.clone().resize(inner, inner, Jimp.RESIZE_BICUBIC);
  canvas.composite(tile, Math.round((size - inner) / 2), Math.round((size - inner) / 2));
  await canvas.writeAsync(path.join(RES, dir, 'ic_launcher_foreground.png'));
  console.log(`${dir}: foreground ${size}px`);
}

// Native splash: white canvas, centered logo (Capacitor reads drawable/splash.png)
const SPLASH = 2732;
const splash = new Jimp(SPLASH, SPLASH, '#FFFFFFFF');
const logoSize = 380;
const logo = src.clone().resize(logoSize, logoSize, Jimp.RESIZE_BICUBIC);
splash.composite(logo, Math.round((SPLASH - logoSize) / 2), Math.round(SPLASH * 0.42));
fs.mkdirSync(path.join(RES, 'drawable'), { recursive: true });
await splash.writeAsync(path.join(RES, 'drawable', 'splash.png'));
console.log('drawable: splash.png');

// Adaptive icon background as a solid color resource
fs.writeFileSync(
  path.join(RES, 'values', 'ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG_HEX.slice(0, 7).toUpperCase()}</color>\n</resources>\n`
);
console.log('values: ic_launcher_background.xml');
console.log('done ✓');
