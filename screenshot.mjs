import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'screenshots');

const { mkdirSync } = await import('fs');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  channel: 'chrome',
  args: [
    '--ignore-gpu-blocklist',
    '--use-gl=angle',
    '--use-angle=metal',
    '--enable-webgl',
    '--disable-gpu-sandbox',
  ],
});

async function shot(name, waitMs, beforeFn) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 600 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/?embed=1', { waitUntil: 'networkidle' });
  // Let WebGL warm up
  await page.waitForTimeout(2000);
  if (beforeFn) await beforeFn(page);
  await page.waitForTimeout(waitMs);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
  console.log(`✓ ${name}.png`);
  await ctx.close();
}

// Shot 1: 게임 시작 직후 — 빛 기둥·플랑크톤 visible
await shot('shot1_ocean', 800);

// Shot 2: 4초 후 — 물고기들이 씬에 들어온 후
await shot('shot2_fish', 3000, async (page) => {
  // nudge player right to reveal more scene
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1200);
  await page.keyboard.up('ArrowRight');
});

// Shot 3: 8초 후 — 더 많은 NPC, 산호·기포 visible
await shot('shot3_depth', 2000, async (page) => {
  // move down-left to show depth + coral area
  await page.keyboard.down('ArrowLeft');
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(2000);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.up('ArrowDown');
});

await browser.close();
console.log('\nDone → screenshots/');
