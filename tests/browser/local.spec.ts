import { test, expect, type Page } from '@playwright/test';
async function setup(page: Page, denyNfc = false) {
  const apiCalls: string[] = [];
  page.on('request', (request) => {
    if (
      new URL(request.url()).pathname.startsWith('/api/') ||
      /googleapis\.com|accounts\.google\.com/.test(request.url())
    )
      apiCalls.push(request.url());
  });
  await page.route('**/api/**', (route) => route.abort());
  await page.addInitScript(
    ({ denyNfc }) => {
      const w = window as any;
      w.__audio = [];
      w.__vibrations = [];
      Object.defineProperty(navigator, 'vibrate', {
        value: (pattern: unknown) => {
          w.__vibrations.push(pattern);
          return true;
        },
      });
      w.Audio = class {
        onplaying: (() => void) | null = null;
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor(public src: string) {}
        pause() {}
        load() {}
        removeAttribute() {}
        async play() {
          w.__audio.push(this.src);
          queueMicrotask(() => {
            this.onplaying?.();
            setTimeout(() => this.onended?.(), 20);
          });
        }
      };
      w.NDEFReader = class extends EventTarget {
        async scan({ signal }: { signal: AbortSignal }) {
          w.__reader = this;
          w.__signal = signal;
          if (denyNfc) throw new DOMException('Denied', 'NotAllowedError');
        }
      };
    },
    { denyNfc },
  );
  return apiCalls;
}
async function emit(page: Page, uid = '04:a1:b2:c3', records = ['Tarjeta de prueba']) {
  await page.evaluate(
    ({ uid, records }) => {
      const event = new Event('reading');
      Object.assign(event, {
        serialNumber: uid,
        message: {
          records: records.map((text) => ({
            recordType: 'text',
            encoding: 'utf-8',
            data: new DataView(new TextEncoder().encode(text).buffer),
          })),
        },
      });
      (window as any).__reader.dispatchEvent(event);
    },
    { uid, records },
  );
}
test('entrada de prueba sin Google ni backend y perfil persistido', async ({ page }) => {
  const api = await setup(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /FIPAZ/ })).toBeVisible();
  await expect(page.locator('.bottom-nav')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeDisabled();
  await page.getByRole('button', { name: 'Entrar y probar la app' }).click();
  await expect(page.locator('.bottom-nav')).toBeVisible();
  await expect(page.locator('.app-header .points-pill')).toHaveText('0');
  await page.getByRole('link', { name: 'Perfil', exact: true }).last().click();
  await expect(page.getByText('Visitante de prueba', { exact: true })).toBeVisible();
  const saved = await page.evaluate(() => JSON.stringify(localStorage));
  expect(saved).not.toContain('test-only-local-google-token');
  expect(saved).not.toContain('accessToken');
  await page.reload();
  await expect(page.getByText('Visitante de prueba', { exact: true })).toBeVisible();
  expect(api).toEqual([]);
});
test('Google queda como mock y cerrar la prueba devuelve a bienvenida', async ({ page }) => {
  const api = await setup(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeDisabled();
  await expect(page.getByText('Próximamente', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Entrar y probar la app' }).click();
  await page.getByRole('link', { name: 'Perfil', exact: true }).last().click();
  await expect(page.getByText('Visitante · modo de prueba')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar sesión y limpiar dispositivo' }).click();
  await expect(page.locator('.welcome-screen')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Entrar y probar la app' })).toBeVisible();
  expect(api).toEqual([]);
});
test('lector real sin Google: acepta cualquier etiqueta NDEF, sonido 7, vibración y ningún punto', async ({
  page,
}) => {
  const api = await setup(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'Probar mi NFC' }).click();
  await page.getByRole('button', { name: 'Leer mi tarjeta NFC' }).click();
  await emit(page, '04:a1:b2:c3', [
    'https://example.org/mi-tarjeta',
    '<script>no se ejecuta</script>',
  ]);
  await expect(page.getByRole('heading', { name: '¡Tarjeta detectada!' })).toBeVisible();
  await expect(page.getByText('04A1B2C3', { exact: true })).toBeVisible();
  await expect(page.getByText('<script>no se ejecuta</script>', { exact: true })).toBeVisible();
  await expect(page.locator('.app-header .points-pill')).toHaveText('0');
  expect(page.url()).toContain('/nfc-test');
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).__audio.some((src: string) => src.endsWith('sonido-07.mp3')),
      ),
    )
    .toBe(true);
  expect(await page.evaluate(() => (window as any).__vibrations)).toEqual([80]);
  expect(await page.evaluate(() => (window as any).__signal.aborted)).toBe(true);
  expect(api).toEqual([]);
});
test('UID no expuesto conserva la evidencia de lectura NDEF', async ({ page }) => {
  await setup(page);
  await page.goto('/nfc-test');
  await page.getByRole('button', { name: 'Leer mi tarjeta NFC' }).click();
  await emit(page, '');
  await expect(page.getByRole('heading', { name: '¡Tarjeta detectada!' })).toBeVisible();
  await expect(page.getByText('Chrome no expuso el UID')).toBeVisible();
});
test('cancelar y tarjeta incompatible nunca muestran éxito', async ({ page }) => {
  await setup(page);
  await page.goto('/nfc-test');
  await page.getByRole('button', { name: 'Leer mi tarjeta NFC' }).click();
  await page.getByRole('button', { name: 'Cancelar lectura' }).click();
  await emit(page);
  await expect(page.getByRole('heading', { name: '¡Tarjeta detectada!' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Leer mi tarjeta NFC' }).click();
  await page.evaluate(() => (window as any).__reader.dispatchEvent(new Event('readingerror')));
  await expect(page.getByRole('alert')).toContainText('necesita etiquetas NDEF');
  await expect(page.getByRole('heading', { name: '¡Tarjeta detectada!' })).toHaveCount(0);
});
test('permiso NFC rechazado permite reintentar', async ({ page }) => {
  await setup(page, true);
  await page.goto('/nfc-test');
  await page.getByRole('button', { name: 'Leer mi tarjeta NFC' }).click();
  await expect(page.getByRole('alert')).toContainText('Permite el acceso a NFC');
  await expect(page.getByRole('button', { name: 'Leer mi tarjeta NFC' })).toBeEnabled();
});
test('sin API y sin red: perfil guardado, mapa y NFC siguen disponibles', async ({
  page,
  context,
}) => {
  const api = await setup(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrar y probar la app' }).click();
  await expect(page.locator('.bottom-nav')).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.goto('/map');
  await expect(page.getByRole('heading', { name: 'Vista general' })).toBeVisible();
  await page.goto('/scan');
  await page.getByRole('button', { name: 'Leer mi tarjeta NFC' }).click();
  await emit(page);
  await expect(page.getByRole('heading', { name: '¡Tarjeta detectada!' })).toBeVisible();
  expect(api).toEqual([]);
  await context.setOffline(false);
});
for (const width of [320, 390, 768, 1440])
  test(`entrada y NFC adaptados a ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await setup(page);
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if ([390, 1440].includes(width))
      await page.screenshot({
        path: `docs/screenshots/local/welcome-${width}.png`,
        fullPage: true,
      });
    await page.getByRole('link', { name: 'Probar mi NFC' }).click();
    await page.getByRole('button', { name: 'Leer mi tarjeta NFC' }).click();
    await emit(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width === 390)
      await page.screenshot({
        path: 'docs/screenshots/local/nfc-reading-fixture.png',
        fullPage: true,
      });
    expect(errors).toEqual([]);
  });
