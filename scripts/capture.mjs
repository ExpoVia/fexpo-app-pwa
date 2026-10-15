import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
});
const base = process.env.PWA_PREVIEW_URL || 'http://127.0.0.1:4174';
const directory = resolve('docs/screenshots');
await mkdir(directory, { recursive: true });
const report = [];
try {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: theme,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => report.push({ error: error.message }));
    await page.goto(`${base}/profile`);
    await page
      .getByRole('button', { name: theme === 'light' ? 'Claro' : 'Oscuro', exact: true })
      .click();
    for (const [name, path] of [
      ['inicio', '/'],
      ['mapa', '/map'],
      ['checkin', '/scan'],
      ['misiones', '/missions'],
      ['perfil', '/profile'],
    ]) {
      await page.goto(`${base}${path}`);
      await page.evaluate(() => document.fonts.ready);
      await page.locator('.app-header').waitFor();
      await page.screenshot({ path: resolve(directory, `${theme}-${name}.png`) });
      report.push({
        theme,
        name,
        width: 390,
        height: 844,
        overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      });
    }
    await context.close();
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: resolve(directory, 'desktop.png') });
  await page.goto(`${base}/stands/stand-altura-labs`);
  await page.screenshot({ path: resolve(directory, 'desktop-stand.png') });
  await writeFile(resolve(directory, 'capture-report.json'), JSON.stringify(report, null, 2));
  console.log(`Captured ${directory}`);
} finally {
  await browser.close();
}
