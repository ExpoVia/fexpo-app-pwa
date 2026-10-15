import { afterEach, describe, expect, it, vi } from 'vitest';
import { bridge } from '../../server/bridge.mjs';
import type { IncomingMessage, ServerResponse } from 'node:http';
async function call(url: string, method = 'GET', body?: unknown, headers = {}) {
  const output = {
    statusCode: 200,
    body: '',
    headers: {} as Record<string, string>,
    setHeader(key: string, value: string) {
      this.headers[key] = value;
    },
    end(body = '') {
      this.body = body;
    },
  };
  await bridge(
    {
      url,
      method,
      body: body ?? {},
      headers: { host: 'fexpo.test', ...headers },
    } as unknown as IncomingMessage,
    output as unknown as ServerResponse,
    { BACKEND_URL: 'https://backend.test' },
  );
  return output;
}
afterEach(() => vi.unstubAllGlobals());
describe('Bridge de sesión y rutas permitidas', () => {
  it('guarda refresh en cookie HttpOnly y lo elimina del JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              success: true,
              data: {
                accessToken: 'test-access',
                refreshToken: 'test-private-refresh',
                expiresIn: 900,
              },
            }),
          ),
      ),
    );
    const result = await call(
      '/api/session/google',
      'POST',
      { idToken: 'test', deviceId: 'uuid' },
      { origin: 'https://fexpo.test', 'x-forwarded-proto': 'https' },
    );
    expect(result.body).not.toContain('test-private-refresh');
    expect(result.headers['Set-Cookie']).toContain('HttpOnly; SameSite=Strict');
    expect(result.headers['Set-Cookie']).toContain('; Secure');
    expect(result.headers['Cache-Control']).toBe('no-store');
  });
  it('bloquea rutas arbitrarias y solicitudes desde otro origen', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    expect((await call('/api/backend?path=https://evil.test')).statusCode).toBe(404);
    expect((await call('/api/backend?path=/auth/google', 'POST', {})).statusCode).toBe(404);
    expect(
      (await call('/api/session/google', 'POST', {}, { origin: 'https://other.test' })).statusCode,
    ).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('no envía solicitudes de refresh si no hay cookie', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    expect((await call('/api/session/refresh', 'POST')).statusCode).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
