import { test, expect, type Page } from '@playwright/test';
const eventId = 'e0000000-0000-4000-8000-000000000001';
const standId = '5a000000-0000-4000-8000-000000000001';
const secondId = '5a000000-0000-4000-8000-000000000002';
const floorId = 'f0000000-0000-4000-8000-000000000001';
const stands = [
  {
    id: standId,
    boothCode: 'A-01',
    displayName: 'Café Altiplano',
    description: 'Café de altura',
    company: { id: 'c1', displayName: 'Café Altiplano' },
    categories: [{ id: 'ca1', slug: 'gastronomia', label: 'Gastronomía' }],
    tags: ['Café', 'Degustación'],
    featured: true,
    activityHighlight: 'Degustación',
    promotionHighlight: 'Consulta nuestros packs',
    visitPoints: 50,
    location: { floorId, zoneId: null, x: 0.2, y: 0.4 },
  },
  {
    id: secondId,
    boothCode: 'B-01',
    displayName: 'TecnoAndes',
    description: 'Robótica educativa',
    company: { id: 'c2', displayName: 'TecnoAndes' },
    categories: [{ id: 'ca2', slug: 'tecnologia', label: 'Tecnología' }],
    tags: ['Robótica'],
    featured: false,
    visitPoints: 80,
    location: null,
  },
];
async function setup(page: Page, guest = false, failCatalog = false) {
  let signedIn = !guest;
  let visited = false;
  const checkins: Record<string, unknown>[] = [];
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, any>;
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
        signal.addEventListener('abort', () => {
          w.__aborted = true;
        });
      }
    };
    let callback: (response: { credential: string }) => void;
    w.google = {
      accounts: {
        id: {
          initialize(options: { callback: typeof callback }) {
            callback = options.callback;
          },
          renderButton(element: HTMLElement) {
            const button = document.createElement('button');
            button.textContent = 'Continuar con Google';
            button.onclick = () => callback({ credential: 'test-only-google-token' });
            element.appendChild(button);
          },
          disableAutoSelect() {},
        },
      },
    };
  });
  await page.route('**/api/session/**', async (route) => {
    const action = new URL(route.request().url()).pathname.split('/').at(-1);
    if (action === 'logout') {
      signedIn = false;
      await route.fulfill({ status: 204 });
      return;
    }
    if (action === 'google') signedIn = true;
    if (!signedIn) {
      await route.fulfill({
        status: 401,
        json: { success: false, error: { code: 'AUTH_REQUIRED', message: 'Accede con Google' } },
      });
      return;
    }
    await route.fulfill({
      json: {
        success: true,
        data: {
          accessToken: 'test-access-only',
          expiresIn: 900,
          user: { id: 'test-user', displayName: 'Ana Visitante', avatarUrl: null },
        },
        meta: null,
      },
    });
  });
  await page.route('**/api/backend?*', async (route) => {
    const path = new URL(route.request().url()).searchParams.get('path') || '';
    if (failCatalog && (path.includes('/stands') || path.endsWith('/map'))) {
      await route.fulfill({
        status: 502,
        json: {
          success: false,
          error: { code: 'UPSTREAM_UNAVAILABLE', message: 'No pudimos conectar con la feria.' },
        },
      });
      return;
    }
    let data: unknown = [];
    if (path === '/auth/me')
      data = { id: 'test-user', profile: { displayName: 'Ana Visitante', avatarUrl: null } };
    else if (path.includes('/check-ins')) {
      checkins.push(route.request().postDataJSON());
      visited = true;
      data = {
        checkinId: 'c1',
        visitId: 'v1',
        isFirstVisit: true,
        dailyDuplicate: checkins.length > 1,
        pointsAwarded: checkins.length > 1 ? 0 : 50,
        scoreAwarded: 50,
      };
    } else if (path.endsWith('/gamification'))
      data = {
        pointsBalance: visited ? 67 : 17,
        rankingScore: visited ? 92 : 42,
        level: { number: 2, name: 'Viajero', nextLevelScore: 300 },
      };
    else if (path.endsWith('/visits'))
      data = visited
        ? [
            {
              visitId: 'v1',
              standId,
              standName: 'Café Altiplano',
              boothCode: 'A-01',
              visitedAt: new Date().toISOString(),
              pointsAwarded: 50,
              scoreAwarded: 50,
            },
          ]
        : [];
    else if (path.endsWith('/streak')) data = { currentStreak: 2, bestStreak: 3, days: [] };
    else if (path.startsWith('/me/qr'))
      data = {
        qrId: 'qr1',
        eventId,
        token: 'test-personal-qr-issued-by-server',
        issuedAt: new Date().toISOString(),
      };
    else if (path.startsWith(`/events/${eventId}/stands`)) data = stands;
    else if (path === `/stands/${standId}`) data = stands[0];
    else if (path.endsWith('/map'))
      data = {
        version: 1,
        floors: [
          {
            id: floorId,
            code: 'A',
            name: 'Pabellón de pruebas',
            levelLabel: 'Planta baja',
            viewBox: '0 0 1000 600',
            outline: 'M0 0H1000V600H0Z',
            svgUrl: null,
            structures: [],
            zones: [],
            pois: [],
            stands: [
              {
                standId,
                displayName: 'Café Altiplano',
                boothCode: 'A-01',
                x: 0.2,
                y: 0.4,
                width: 0.15,
                height: 0.15,
                rotation: 0,
                categories: [],
              },
            ],
          },
        ],
      };
    await route.fulfill({
      json: {
        success: true,
        data,
        meta: path.includes('/stands?') ? { page: 1, limit: 100, total: 2, totalPages: 1 } : null,
      },
    });
  });
  return checkins;
}
async function emitNfc(page: Page, serial = '04:a1:b2:c3') {
  await page.evaluate(
    ({ id, serial }) => {
      const w = window as unknown as Record<string, any>;
      const event = new Event('reading');
      Object.assign(event, {
        serialNumber: serial,
        message: {
          records: [
            {
              recordType: 'url',
              data: new DataView(
                new TextEncoder().encode(`https://fexpo.test/stands/${id}`).buffer,
              ),
            },
          ],
        },
      });
      w.__reader.dispatchEvent(event);
    },
    { id: standId, serial },
  );
}
test('recorrido conectado: NFC, saldo del servidor, sonido 7 y aviso 5 con vibración', async ({
  page,
}) => {
  const requests = await setup(page);
  await page.goto('/');
  await expect(page.locator('.app-header .points-pill')).toHaveText('17');
  await page.locator('.bottom-nav').getByRole('link', { name: 'Check-in' }).click();
  await page.getByRole('button', { name: 'Leer tarjeta NFC' }).click();
  await emitNfc(page);
  await expect(page.getByRole('dialog', { name: '¡Visita registrada!' })).toBeVisible();
  await expect(page.locator('.app-header .points-pill')).toHaveText('67');
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({ method: 'nfc', credential: '04A1B2C3' });
  expect(requests[0].requestKey).toMatch(/^[0-9a-f-]{36}$/);
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__audio.some((s: string) => s.endsWith('sonido-07.mp3'))),
    )
    .toBe(true);
  expect(
    await page.evaluate(() =>
      (window as any).__audio.some((s: string) => s.endsWith('sonido-05.mp3')),
    ),
  ).toBe(false);
  await page.getByRole('button', { name: 'Listo', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__audio.some((s: string) => s.endsWith('sonido-05.mp3'))),
    )
    .toBe(true);
  expect(await page.evaluate(() => (window as any).__vibrations)).toEqual([80, 80]);
});
test('offline: guarda lectura sin sumar puntos y la confirma al recuperar conexión', async ({
  page,
  context,
}) => {
  const requests = await setup(page);
  await page.goto(`/scan?stand=${standId}`);
  await expect(page.locator('.app-header .points-pill')).toHaveText('17');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Leer tarjeta NFC' }).click();
  await emitNfc(page);
  await expect(page.getByRole('dialog', { name: 'Visita pendiente' })).toBeVisible();
  expect(requests).toHaveLength(0);
  await expect(page.locator('.app-header .points-pill')).toHaveText('17');
  await page.getByRole('button', { name: 'Listo', exact: true }).click();
  await context.setOffline(false);
  await expect(page.locator('.app-header .points-pill')).toHaveText('67');
  expect(requests).toHaveLength(1);
});
test('un enlace o una lectura sin UID no registra visitas; cancelar tampoco', async ({ page }) => {
  const requests = await setup(page);
  await page.goto(`/e/${eventId}/s/${standId}`);
  await expect(page.getByRole('button', { name: 'Leer tarjeta NFC' })).toBeVisible();
  expect(requests).toHaveLength(0);
  await page.getByRole('button', { name: 'Leer tarjeta NFC' }).click();
  await emitNfc(page, '');
  await expect(page.getByRole('alert')).toContainText('identificador');
  expect(requests).toHaveLength(0);
  await page.getByRole('button', { name: 'Leer tarjeta NFC' }).click();
  await page.getByRole('button', { name: 'Cancelar lectura' }).click();
  await emitNfc(page);
  expect(requests).toHaveLength(0);
});
test('Google, QR firmado, favoritos y cierre de sesión sin datos privados', async ({ page }) => {
  await setup(page, true);
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Continuar con Google' }).click();
  await expect(page.getByText('Ana Visitante', { exact: true })).toBeVisible();
  await page.goto('/my-qr');
  await expect(page.getByRole('img', { name: 'Tu QR personal de Fexpo' })).toBeVisible();
  await page.goto(`/stands/${standId}`);
  await page.getByRole('button', { name: 'Guardar stand' }).click();
  await expect(page.getByRole('button', { name: 'Stand guardado' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar sesión y limpiar dispositivo' }).click();
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('test-access');
  const accountKeys = await page.evaluate(
    () =>
      new Promise<IDBValidKey[]>((resolve, reject) => {
        const open = indexedDB.open('keyval-store');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const read = db.transaction('keyval').objectStore('keyval').getAllKeys();
          read.onsuccess = () => {
            resolve(read.result.filter((key) => String(key).startsWith('fexpo-account-v1:')));
            db.close();
          };
          read.onerror = () => {
            reject(read.error);
            db.close();
          };
        };
      }),
  );
  expect(accountKeys).toEqual([]);
  await page.goto('/my-qr');
  await expect(page.getByRole('link', { name: 'Acceder con Google' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Tu QR personal de Fexpo' })).toHaveCount(0);
});
test('salir sin red impide restaurar automáticamente la cuenta al recargar', async ({ page }) => {
  await setup(page);
  await page.route('**/api/session/logout', (route) => route.abort('internetdisconnected'));
  await page.goto('/profile');
  await expect(page.getByText('Ana Visitante', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar sesión y limpiar dispositivo' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
  await expect(page.getByText('Ana Visitante', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Continuar con Google' }).click();
  await expect(page.getByText('Ana Visitante', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('fexpo-session-closed'))).toBeNull();
});
test('backend caído: no sustituye el catálogo por expositores ficticios', async ({ page }) => {
  await setup(page, false, true);
  await page.goto('/stands');
  await expect(page.getByText('Conexión pendiente')).toBeVisible();
  await expect(page.getByText('Altura Labs', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reintentar conexión' })).toBeVisible();
});
test('sin Web NFC muestra Mi QR y nunca inventa una visita', async ({ page }) => {
  const requests = await setup(page);
  await page.addInitScript(() => {
    delete window.NDEFReader;
  });
  await page.goto('/scan');
  await expect(page.getByRole('link', { name: 'Mostrar Mi QR' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Leer tarjeta NFC' })).toHaveCount(0);
  expect(requests).toHaveLength(0);
});
test('audio offline válido y ausencia de caché de API privada', async ({ page, context }) => {
  await setup(page);
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  const report = await page.evaluate(async () => {
    const files = ['matilda-welcome.mp3', 'matilda-nfc.mp3', 'sonido-05.mp3', 'sonido-07.mp3'];
    const audio = new OfflineAudioContext(1, 44100, 44100);
    const clips = [];
    for (const file of files) {
      const response = await fetch(`/assets/audio/${file}`);
      const buffer = await audio.decodeAudioData(await response.arrayBuffer());
      clips.push({ file, status: response.status, duration: buffer.duration });
    }
    const urls = (
      await Promise.all(
        (await caches.keys()).map(async (key) =>
          (await (await caches.open(key)).keys()).map((request) => request.url),
        ),
      )
    ).flat();
    return { clips, apiCached: urls.some((url) => new URL(url).pathname.startsWith('/api/')) };
  });
  expect(report.apiCached).toBe(false);
  expect(report.clips.every((clip) => clip.status === 200 && clip.duration > 0)).toBe(true);
  await context.setOffline(false);
});
for (const width of [320, 390, 1440])
  for (const theme of ['light', 'dark'])
    test(`interfaz conectada sin desbordamiento ${theme} ${width}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await setup(page);
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/profile');
      await page
        .getByRole('button', { name: theme === 'light' ? 'Claro' : 'Oscuro', exact: true })
        .click();
      for (const path of [
        '/',
        '/map',
        '/scan',
        '/missions',
        '/profile',
        '/stands',
        '/my-qr',
        '/notifications',
        `/stands/${standId}`,
        '/rewards',
      ]) {
        await page.goto(path);
        await expect(page.locator('.page')).toBeVisible();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
          path,
        ).toBe(true);
        expect(
          await page.evaluate(
            () => [...document.images].filter((i) => i.complete && !i.naturalWidth).length,
          ),
          path,
        ).toBe(0);
        if (
          width === 390 &&
          ['/', '/map', '/scan', '/missions', '/profile', `/stands/${standId}`].includes(path)
        ) {
          await expect(page.locator('.app-header .points-pill')).toHaveText('17');
          await page.screenshot({
            path: `docs/screenshots/integration/${theme}-${path === '/' ? 'home' : path.startsWith('/stands/') ? 'stand' : path.slice(1)}.png`,
            fullPage: true,
          });
        }
        if (width === 1440 && path === '/profile')
          await page.screenshot({
            path: `docs/screenshots/integration/${theme}-desktop.png`,
            fullPage: true,
          });
      }
      expect(errors).toEqual([]);
    });
