import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const base = process.env.PWA_PREVIEW_URL || 'http://127.0.0.1:4174';
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const apiResponse = page
  .waitForResponse((response) => response.url().includes('/api/backend?'), { timeout: 20000 })
  .catch(() => null);
await page.goto(base);
await apiResponse;
await page.waitForFunction(
  () => !document.querySelector('.connection-status')?.textContent.includes('Conectando'),
  undefined,
  { timeout: 22000 },
);
await mkdir('docs/screenshots/integration', { recursive: true });
await page.screenshot({
  path: 'docs/screenshots/integration/actual-backend-home.png',
  fullPage: true,
});
const report = {
  capturedAt: new Date().toISOString(),
  base,
  errors,
  status: await page
    .locator('.connection-status')
    .textContent()
    .catch(() => 'Sin errores de conexión visibles'),
  overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
};
await writeFile(
  'docs/screenshots/integration/actual-preview.json',
  JSON.stringify(report, null, 2),
);
process.stdout.write(JSON.stringify(report, null, 2));
await browser.close();
