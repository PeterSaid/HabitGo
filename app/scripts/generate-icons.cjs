/**
 * Regenerates every brand asset from the master logo (the uploaded Frame PNG):
 *  - app/src/assets/logo.png + app/public/logo.png (cropped, dark corners keyed out)
 *  - Android legacy launcher icons (rounded square) + round icons (circle)
 *  - Android adaptive foreground (logo on sampled brand green) for all densities
 *  - Android splash screens (white bg, centered logo) for all densities
 *  - PWA icons (public/icons) incl. maskable + apple-touch-icon
 * Run: node scripts/generate-icons.cjs
 */
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

const SRC = 'D:/Frame 2608648.png';
const APP = 'D:/habitgo/app';
const RES = path.join(APP, 'android/app/src/main/res');

const LEGACY = { 'mipmap-mdpi': 48, 'mipmap-hdpi': 72, 'mipmap-xhdpi': 96, 'mipmap-xxhdpi': 144, 'mipmap-xxxhdpi': 192 };
const FOREGROUND = { 'mipmap-mdpi': 108, 'mipmap-hdpi': 162, 'mipmap-xhdpi': 216, 'mipmap-xxhdpi': 324, 'mipmap-xxxhdpi': 432 };
const SPLASH = {
  'drawable': [2732, 2732],
  'drawable-land-hdpi': [800, 480], 'drawable-land-mdpi': [480, 320], 'drawable-land-xhdpi': [960, 720],
  'drawable-land-xxhdpi': [1440, 960], 'drawable-land-xxxhdpi': [1920, 1280],
  'drawable-port-hdpi': [480, 800], 'drawable-port-mdpi': [320, 480], 'drawable-port-xhdpi': [720, 960],
  'drawable-port-xxhdpi': [960, 1600], 'drawable-port-xxxhdpi': [1280, 1920],
};

function applyRoundedMask(img, radiusPx) {
  const { width: w, height: h, data } = img.bitmap;
  const r = Math.min(radiusPx, w / 2, h / 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // distance from the nearest corner center for pixels inside corner boxes
      const cx = x < r ? r : x >= w - r ? w - r - 1 : null;
      const cy = y < r ? r : y >= h - r ? h - r - 1 : null;
      if (cx === null || cy === null) continue;
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy > r * r) data[(y * w + x) * 4 + 3] = 0;
    }
  }
}

function applyCircleMask(img) {
  const { width: w, height: h, data } = img.bitmap;
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx * dx + dy * dy > r * r) data[(y * w + x) * 4 + 3] = 0;
    }
  }
}

(async () => {
  // 1. Read master, crop to the green square (drop the dark frame around it)
  const src = await Jimp.read(SRC);
  const sb = src.bitmap;
  let minX = sb.width, minY = sb.height, maxX = -1, maxY = -1;
  src.scan(0, 0, sb.width, sb.height, function (x, y) {
    const i = (y * sb.width + x) * 4;
    const r = this.bitmap.data[i], g = this.bitmap.data[i + 1], b = this.bitmap.data[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    if (luma > 55) { // not the near-black frame
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  });
  if (maxX < 0) throw new Error('no content found');
  let cw = maxX - minX + 1, ch = maxY - minY + 1;
  // square-ify around the content center (clamp to what the source can provide)
  const side = Math.min(Math.max(cw, ch), sb.width, sb.height);
  const ccx = minX + cw / 2, ccy = minY + ch / 2;
  let sx = Math.round(ccx - side / 2), sy = Math.round(ccy - side / 2);
  sx = Math.max(0, Math.min(sx, sb.width - side));
  sy = Math.max(0, Math.min(sy, sb.height - side));
  src.crop(sx, sy, side, side);
  console.log(`cropped ${sb.width}x${sb.height} -> ${side}x${side} at ${sx},${sy}`);

  // 2. Master 256 (in-app + favicon) — key residual dark corners out via rounded mask
  const radiusRatio = 0.24;
  const master = src.clone().resize(256, 256, Jimp.RESIZE_BICUBIC);
  applyRoundedMask(master, 256 * radiusRatio);
  await master.writeAsync(path.join(APP, 'src/assets/logo.png'));
  await master.writeAsync(path.join(APP, 'public/logo.png'));

  // 3. Master 512 for icon generation
  const m512 = src.clone().resize(512, 512, Jimp.RESIZE_BICUBIC);
  applyRoundedMask(m512.clone(), 512 * radiusRatio);

  // sample brand green (green-dominant pixels average)
  let gr = 0, gg = 0, gb = 0, gn = 0;
  m512.scan(0, 0, 512, 512, function (x, y) {
    const i = (y * 512 + x) * 4;
    const r = this.bitmap.data[i], g = this.bitmap.data[i + 1], b = this.bitmap.data[i + 2];
    if (g > r + 20 && g > b + 20) { gr += r; gg += g; gb += b; gn++; }
  });
  gr = Math.round(gr / gn); gg = Math.round(gg / gn); gb = Math.round(gb / gn);
  const hex = (v) => v.toString(16).padStart(2, '0').toUpperCase();
  const GREEN_HEX = `#${hex(gr)}${hex(gg)}${hex(gb)}`;
  console.log(`brand green: ${GREEN_HEX} (${gn} px sampled)`);

  // 4. Legacy launcher icons: rounded square + round circle
  for (const [dir, size] of Object.entries(LEGACY)) {
    const sq = src.clone().resize(size, size, Jimp.RESIZE_BICUBIC);
    applyRoundedMask(sq, size * radiusRatio);
    await sq.writeAsync(path.join(RES, dir, 'ic_launcher.png'));

    const rd = src.clone().resize(size, size, Jimp.RESIZE_BICUBIC);
    applyCircleMask(rd);
    await rd.writeAsync(path.join(RES, dir, 'ic_launcher_round.png'));
  }

  // 5. Adaptive foreground: logo scaled to 74% of canvas, centered on solid brand green
  for (const [dir, size] of Object.entries(FOREGROUND)) {
    const canvas = new Jimp(size, size, Jimp.rgbaToInt(gr, gg, gb, 255));
    const inner = Math.round(size * 0.74);
    const logo = src.clone().resize(inner, inner, Jimp.RESIZE_BICUBIC);
    applyRoundedMask(logo, inner * radiusRatio);
    canvas.composite(logo, Math.round((size - inner) / 2), Math.round((size - inner) / 2));
    await canvas.writeAsync(path.join(RES, dir, 'ic_launcher_foreground.png'));
  }
  // keep adaptive background in sync with the logo green
  fs.writeFileSync(path.join(RES, 'values/ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${GREEN_HEX}</color>\n</resources>\n`);

  // 6. Splash screens: white background + centered logo (~22% of min side)
  for (const [dir, [w, h]] of Object.entries(SPLASH)) {
    const canvas = new Jimp(w, h, 0xffffffff);
    const inner = Math.round(Math.min(w, h) * 0.22);
    const logo = src.clone().resize(inner, inner, Jimp.RESIZE_BICUBIC);
    applyRoundedMask(logo, inner * radiusRatio);
    canvas.composite(logo, Math.round((w - inner) / 2), Math.round((h - inner) / 2));
    await canvas.writeAsync(path.join(RES, dir, 'splash.png'));
  }

  // 7. PWA icons
  const iconsDir = path.join(APP, 'public/icons');
  fs.mkdirSync(iconsDir, { recursive: true });
  for (const size of [192, 512]) {
    const ic = src.clone().resize(size, size, Jimp.RESIZE_BICUBIC);
    applyRoundedMask(ic, size * radiusRatio);
    await ic.writeAsync(path.join(iconsDir, `icon-${size}.png`));
  }
  const mask = new Jimp(512, 512, Jimp.rgbaToInt(gr, gg, gb, 255));
  const innerM = Math.round(512 * 0.74);
  const logoM = src.clone().resize(innerM, innerM, Jimp.RESIZE_BICUBIC);
  applyRoundedMask(logoM, innerM * radiusRatio);
  mask.composite(logoM, Math.round((512 - innerM) / 2), Math.round((512 - innerM) / 2));
  await mask.writeAsync(path.join(iconsDir, 'icon-maskable-512.png'));
  const apple = new Jimp(180, 180, Jimp.rgbaToInt(gr, gg, gb, 255));
  const innerA = Math.round(180 * 0.8);
  const logoA = src.clone().resize(innerA, innerA, Jimp.RESIZE_BICUBIC);
  applyRoundedMask(logoA, innerA * radiusRatio);
  apple.composite(logoA, Math.round((180 - innerA) / 2), Math.round((180 - innerA) / 2));
  await apple.writeAsync(path.join(APP, 'public/apple-touch-icon.png'));

  // 8. Notification small icon (white swoosh on transparent, all densities)
  // referenced by capacitor.config.ts → plugins.LocalNotifications.smallIcon
  const greenLuma = 0.299 * gr + 0.587 * gg + 0.114 * gb;
  const STAT = { 'drawable-mdpi': 24, 'drawable-hdpi': 36, 'drawable-xhdpi': 48, 'drawable-xxhdpi': 72, 'drawable-xxxhdpi': 96 };
  for (const [dir, size] of Object.entries(STAT)) {
    fs.mkdirSync(path.join(RES, dir), { recursive: true });
    const base = src.clone().resize(size * 2, size * 2, Jimp.RESIZE_BICUBIC); // supersample then minify for smoother edges
    const b = base.bitmap;
    for (let i = 0; i < b.width * b.height; i++) {
      const o = i * 4;
      const r = b.data[o], g = b.data[o + 1], bl = b.data[o + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * bl;
      const alpha = Math.max(0, Math.min(255, Math.round(((luma - greenLuma) / (255 - greenLuma)) * 255)));
      b.data[o] = 255; b.data[o + 1] = 255; b.data[o + 2] = 255; b.data[o + 3] = alpha;
    }
    base.resize(size, size, Jimp.RESIZE_BICUBIC);
    await base.writeAsync(path.join(RES, dir, 'ic_stat_icon.png'));
  }

  console.log('GREEN=' + GREEN_HEX);
  console.log('done');
})().catch((e) => { console.error(e); process.exit(1); });
