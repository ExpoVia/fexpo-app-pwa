import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
});
const report = [];
await mkdir('docs/screenshots/campus', { recursive: true });
for (const width of [320, 390, 768, 1440]) {
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      reducedMotion: 'reduce',
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript((theme) => localStorage.setItem('fexpo-pwa-theme', theme), theme);
    await page.goto('http://127.0.0.1:4174/');
    await page.getByRole('button', { name: 'Entrar y probar la app' }).click();
    await page.goto('http://127.0.0.1:4174/map');
    await page.waitForSelector('[data-campus-canvas], .indoor-svg');
    await page.waitForTimeout(800);
    if ([390, 1440].includes(width))
      await page.screenshot({
        path: `docs/screenshots/campus/${theme}-${width}.png`,
        fullPage: true,
      });
    report.push({
      width,
      theme,
      errors,
      mode: await page.locator('.indoor-viewer').getAttribute('data-mode'),
      overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    });
    if (width === 390 && theme === 'light') {
      await page.getByRole('button', { name: 'Acercar mapa', exact: true }).click();
      await page.getByRole('button', { name: 'Acercar mapa', exact: true }).click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: 'docs/screenshots/campus/light-detail.png', fullPage: true });
      await page.getByRole('button', { name: 'Restablecer mapa', exact: true }).click();
    }
    if (width === 390) {
      await page.getByRole('textbox', { name: 'Buscar stands y empresas' }).fill('altura');
      await page
        .locator('.indoor-results')
        .getByRole('button', { name: /Altura Labs/ })
        .click();
      await page.waitForTimeout(250);
      await page.screenshot({ path: `docs/screenshots/campus/${theme}-stand.png`, fullPage: true });
      await page.getByRole('button', { name: 'Cerrar selección' }).click();
      await page.getByRole('button', { name: '2D', exact: true }).click();
      await page.screenshot({ path: `docs/screenshots/campus/${theme}-2d.png`, fullPage: true });
    }
    await page.close();
  }
}
await writeFile('docs/screenshots/campus/qa.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
await browser.close();
