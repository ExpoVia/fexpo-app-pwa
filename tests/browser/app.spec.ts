import { test, expect } from '@playwright/test';

for (const theme of ['light', 'dark'])
  for (const width of [320, 390, 768, 1440])
    test(`pantallas sin desbordamiento: ${theme} a ${width}px`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/profile');
      await page
        .getByRole('button', { name: theme === 'light' ? 'Claro' : 'Oscuro', exact: true })
        .click();
      await page.setViewportSize({ width, height: 900 });
      for (const route of [
        '/',
        '/map',
        '/scan',
        '/missions',
        '/profile',
        '/stands',
        '/my-qr',
        '/rewards',
        '/notifications',
        '/stands/stand-altura-labs',
        '/events/event-fipaz-2026',
      ]) {
        await page.goto(route);
        await expect(page.locator('main')).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        const measurements = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth,
          broken: [...document.images]
            .filter((i) => i.complete && !i.naturalWidth)
            .map((i) => i.src),
        }));
        expect(measurements, `${theme} ${width} ${route}`).toEqual({ overflow: false, broken: [] });
      }
      expect(errors).toEqual([]);
    });

test('la visita simulada persiste y los duplicados no suman puntos', async ({ page }) => {
  await page.goto('/scan?stand=stand-kawsay-salud');
  await page.getByRole('button', { name: 'Simular lectura NFC', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '¡Una nueva conexión!' })).toBeVisible();
  await page.getByRole('button', { name: 'Listo', exact: true }).click();
  await expect(page.locator('.app-header .points-pill')).toContainText('100');
  await page.getByRole('button', { name: 'Simular otra lectura' }).click();
  await expect(page.getByRole('dialog', { name: 'Visita ya registrada' })).toBeVisible();
  await page.getByRole('button', { name: 'Listo', exact: true }).click();
  await expect(page.locator('.app-header .points-pill')).toContainText('100');
  await page.reload();
  await expect(page.locator('.app-header .points-pill')).toContainText('100');
  await page.goto('/profile');
  await expect(
    page.locator('main').getByRole('link').filter({ hasText: 'Kawsay Salud' }),
  ).toBeVisible();
  await page.goto('/notifications');
  await expect(page.getByText('Kawsay Salud · +50 puntos de demostración.')).toBeVisible();
});

test('cancelar la lectura no registra visitas', async ({ page }) => {
  await page.goto('/scan?stand=stand-kawsay-salud');
  await page.getByRole('button', { name: 'Simular lectura NFC', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar lectura' }).click();
  await page.waitForTimeout(1800);
  await expect(page.locator('.app-header .points-pill')).toContainText('50');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('búsqueda, cambio de planta y perfil del stand', async ({ page }) => {
  await page.goto('/map');
  await page.getByRole('textbox', { name: 'Buscar stands y empresas' }).fill('altura');
  await page.getByRole('button', { name: /Altura Labs/ }).click();
  await expect(page.getByRole('heading', { name: 'Pabellón Bolivia' })).toBeVisible();
  await page.getByRole('link', { name: 'Ver perfil del stand' }).click();
  await expect(page.getByRole('heading', { name: 'Altura Labs' })).toBeVisible();
  await page.getByRole('button', { name: 'Guardar stand' }).click();
  await expect(page.getByRole('button', { name: 'Stand guardado' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('tab', { name: 'Ofertas' }).click();
  await page.getByRole('button', { name: 'Ver condiciones de la promoción' }).click();
  await expect(
    page.getByRole('button', { name: 'Ver condiciones de la promoción' }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('ruleta y raspadita son visuales y no cambian el saldo', async ({ page }) => {
  await page.goto('/stands/stand-altura-labs');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('tab', { name: 'Dinámicas' }).click();
  await page.getByRole('button', { name: /Ruleta Gira/ }).click();
  await page.getByRole('button', { name: 'Girar ruleta demo' }).click();
  await expect(page.getByRole('button', { name: 'Volver a girar' })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar ventana' }).click();
  await page.getByRole('button', { name: /Raspa y gana Revela/ }).click();
  await page.getByRole('button', { name: 'Revelar sin raspar' }).click();
  await expect(page.getByText('¡Una sorpresa te espera!')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar ventana' }).click();
  await expect(page.locator('.app-header .points-pill')).toContainText('50');
});

test('la PWA abre rutas y recursos offline después de la primera carga', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const manifest = await page.request.get('/manifest.webmanifest');
  expect((await manifest.json()).display).toBe('standalone');
  await context.setOffline(true);
  await page.goto('/map');
  await expect(page.getByRole('heading', { name: 'Vista general' })).toBeVisible();
  await expect(page.getByText('Sin conexión · puedes explorar la vista previa')).toBeVisible();
  expect(
    await page.evaluate(
      () => [...document.images].filter((i) => !i.complete || !i.naturalWidth).length,
    ),
  ).toBe(0);
  await context.setOffline(false);
});
