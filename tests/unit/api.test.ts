import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession, request, refreshSession, loginGoogle, ApiError } from '@/services/api';
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ success: true, data, meta: null }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
beforeEach(() => {
  clearSession();
  vi.unstubAllGlobals();
});
describe('Sesión web en memoria + refresh HttpOnly', () => {
  it('agrupa refresh paralelo y usa Bearer solo en solicitudes privadas', async () => {
    const fetcher = vi.fn(async (url: string) =>
      url.includes('session/refresh')
        ? response({ accessToken: 'test-access', expiresIn: 900 })
        : response([]),
    );
    vi.stubGlobal('fetch', fetcher);
    await Promise.all([request('/auth/me', { auth: true }), request('/me/qr', { auth: true })]);
    expect(fetcher.mock.calls.filter(([url]) => url.includes('/session/refresh'))).toHaveLength(1);
    const init = (fetcher.mock.calls as unknown as [string, RequestInit][]).find(([url]) =>
      url.includes('backend'),
    )![1];
    expect(init.headers).toMatchObject({ Authorization: 'Bearer test-access' });
    expect(init.cache).toBe('no-store');
  });
  it('un refresh tardío no resucita una sesión cerrada', async () => {
    let finish!: (r: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      ),
    );
    const waiting = refreshSession();
    clearSession();
    finish(response({ accessToken: 'stale', expiresIn: 900 }));
    await expect(waiting).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
  });
  it('reintenta un 401 conservando la clave del check-in', async () => {
    let checks = 0;
    const fetcher = vi.fn(async (url: string) => {
      if (url.includes('/session/'))
        return response({ accessToken: 'test', expiresIn: 900, user: { id: 'u' } });
      if (checks++ === 0)
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'ACCESS_TOKEN_EXPIRED', message: 'Expired' },
          }),
          { status: 401 },
        );
      return response({ pointsAwarded: 50 });
    });
    vi.stubGlobal('fetch', fetcher);
    await loginGoogle('id-token', 'device');
    const body = { requestKey: 'fixed-key', credential: '04AA', method: 'nfc' };
    await request('/stands/test/check-ins', { auth: true, method: 'POST', body });
    const bodies = (fetcher.mock.calls as unknown as [string, RequestInit][])
      .filter(([url]) => url.includes('backend'))
      .map(([, init]) => init.body);
    expect(bodies).toEqual([JSON.stringify(body), JSON.stringify(body)]);
  });
  it('trata errores de red como reintentables y reglas de negocio como definitivas', () => {
    expect(new ApiError('NETWORK', '', 0).retryable).toBe(true);
    expect(new ApiError('NFC_INVALID', '', 422).retryable).toBe(false);
  });
});
