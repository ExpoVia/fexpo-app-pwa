import { beforeEach, describe, expect, it, vi } from 'vitest';
const storage = vi.hoisted(() => ({ data: new Map<string, unknown>(), fail: false }));
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => storage.data.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    if (storage.fail) throw new Error('Storage unavailable');
    storage.data.set(key, structuredClone(value));
  }),
  del: vi.fn(async (key: string) => {
    storage.data.delete(key);
  }),
}));
vi.mock('@/services/config', () => ({
  LOCAL: false,
  EVENT_ID: 'e0000000-0000-4000-8000-000000000001',
  eventReady: true,
}));
import { useLive, registerNfc, flushPending, syncProgress } from '@/state/live';
const stand = '5a000000-0000-4000-8000-000000000001';
let online = true;
let rejectCheck = 0;
let requests: { requestKey: string }[] = [];
let balance = 17;
function response(data: unknown) {
  return new Response(JSON.stringify({ success: true, data, meta: null }));
}
beforeEach(async () => {
  online = true;
  rejectCheck = 0;
  requests = [];
  balance = 17;
  storage.fail = false;
  vi.stubGlobal('navigator', {
    get onLine() {
      return online;
    },
  });
  const local = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => local.get(k),
    setItem: (k: string, v: string) => local.set(k, v),
    removeItem: (k: string) => local.delete(k),
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      if (url.includes('/session/google'))
        return response({
          accessToken: 'test-token',
          expiresIn: 900,
          user: { id: 'user-a', displayName: 'Ana' },
        });
      if (url.includes('/session/logout')) return new Response(null, { status: 204 });
      const path = new URL(url, 'http://test').searchParams.get('path') || '';
      if (path.endsWith('/check-ins')) {
        requests.push(JSON.parse(init.body as string));
        if (rejectCheck)
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NFC_INVALID', message: 'No válida' },
            }),
            { status: rejectCheck },
          );
        return response({
          checkinId: 'c',
          visitId: 'v',
          dailyDuplicate: false,
          isFirstVisit: true,
          pointsAwarded: 999,
          scoreAwarded: 999,
        });
      }
      if (path.endsWith('/gamification'))
        return response({
          pointsBalance: balance,
          rankingScore: 42,
          level: { number: 3, name: 'Experto', nextLevelScore: 300 },
        });
      if (path.endsWith('/streak')) return response({ currentStreak: 2, bestStreak: 3, days: [] });
      return response([]);
    }),
  );
  await useLive.getState().signOut();
  storage.data.clear();
  await useLive.getState().login('test-google');
});
describe('Servidor como fuente de verdad y cola offline', () => {
  it('consulta de nuevo después del check-in si había un refresh de progreso anterior', async () => {
    const original = fetch;
    let release!: (r: Response) => void;
    let held = false;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init: RequestInit) => {
        if (url.includes('gamification') && !held) {
          held = true;
          return new Promise<Response>((resolve) => {
            release = resolve;
          });
        }
        return original(url, init);
      }),
    );
    const before = syncProgress();
    await vi.waitFor(() => expect(typeof release).toBe('function'));
    balance = 89;
    const checking = registerNfc(stand, '04AABBCC');
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    release(
      response({
        pointsBalance: 17,
        rankingScore: 42,
        level: { number: 3, name: 'Experto', nextLevelScore: 300 },
      }),
    );
    await before;
    await checking;
    expect(useLive.getState().progress?.pointsBalance).toBe(89);
  });
  it('no calcula puntos ni niveles con los datos del check-in', async () => {
    const result = await registerNfc(stand, '04AABBCC');
    expect(result.response?.pointsAwarded).toBe(999);
    expect(useLive.getState().progress?.pointsBalance).toBe(17);
    expect(useLive.getState().progress?.level.number).toBe(3);
  });
  it('persiste offline sin puntos y reutiliza requestKey en cada reintento', async () => {
    online = false;
    const result = await registerNfc(stand, '04AABBCC');
    expect(result.status).toBe('pending');
    expect(useLive.getState().progress?.pointsBalance).toBe(17);
    const again = await registerNfc(stand, '04AABBCC');
    expect(again.requestKey).toBe(result.requestKey);
    expect(useLive.getState().pending).toHaveLength(1);
    online = true;
    rejectCheck = 503;
    await flushPending();
    expect(useLive.getState().pending).toHaveLength(1);
    rejectCheck = 0;
    await flushPending();
    expect(useLive.getState().pending).toHaveLength(0);
    expect(requests.map((job) => job.requestKey)).toEqual([result.requestKey, result.requestKey]);
  });
  it('no pone errores de negocio en la cola ni afirma guardar si falla IndexedDB', async () => {
    rejectCheck = 422;
    await expect(registerNfc(stand, '04AA')).rejects.toMatchObject({ code: 'NFC_INVALID' });
    expect(useLive.getState().pending).toEqual([]);
    online = false;
    storage.fail = true;
    await expect(registerNfc(stand, '04AA')).rejects.toThrow('Storage unavailable');
    expect(useLive.getState().pending).toEqual([]);
  });
  it('cerrar sesión limpia QR, progreso y pendientes de la cuenta', async () => {
    online = false;
    await registerNfc(stand, '04AA');
    useLive.setState({
      qr: { token: 'private-test-qr', eventId: 'event', qrId: 'qr', issuedAt: 'now' },
    });
    await useLive.getState().signOut();
    expect(useLive.getState()).toMatchObject({
      status: 'guest',
      progress: null,
      qr: null,
      pending: [],
      visits: [],
    });
    expect([...storage.data.keys()].some((key) => key.includes('user-a'))).toBe(false);
  });
  it('ignora respuestas privadas tardías después de salir de la cuenta', async () => {
    let finish!: (r: Response) => void;
    const original = fetch;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init: RequestInit) =>
        url.includes('gamification')
          ? new Promise<Response>((resolve) => {
              finish = resolve;
            })
          : original(url, init),
      ),
    );
    const waiting = syncProgress();
    await Promise.resolve();
    await Promise.resolve();
    await useLive.getState().signOut();
    finish(response({ pointsBalance: 1234, rankingScore: 1234, level: { number: 9 } }));
    await waiting;
    expect(useLive.getState().progress).toBeNull();
    expect(useLive.getState().user).toBeNull();
  });
});
