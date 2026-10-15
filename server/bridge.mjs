// Same-origin bridge. Refresh tokens never enter browser JavaScript or IndexedDB.
const COOKIE = 'fexpo_refresh';
const refreshes = new Map();
const allowed =
  /^(?:\/events\/[\da-f-]{36}\/(?:stands|map|activities|me\/(?:gamification|visits|favorites|streak))|\/stands\/[\da-f-]{36}(?:\/(?:favorite|check-ins|dynamics))?|\/me\/qr|\/auth\/me)$/i;
const fail = (res, status, code, message) => {
  res.statusCode = status;
  res.end(JSON.stringify({ success: false, error: { code, message } }));
};
function cookie(req, value, age) {
  const secure = req.headers['x-forwarded-proto'] === 'https' || process.env.VERCEL === '1';
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/api/session; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? '; Secure' : ''}`;
}
async function bodyOf(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 16384) throw new Error('BODY_TOO_LARGE');
  }
  return body ? JSON.parse(body) : {};
}
export async function bridge(req, res, options = process.env) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  const url = new URL(req.url, 'http://localhost');
  const session = url.pathname.startsWith('/api/session/');
  if (!session && url.pathname !== '/api/backend')
    return fail(res, 404, 'NOT_FOUND', 'Ruta no disponible.');
  const backend = options.BACKEND_URL?.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
  if (!backend || !/^https?:\/\//.test(backend))
    return fail(res, 503, 'BACKEND_NOT_CONFIGURED', 'Falta configurar la conexión con la feria.');
  // A cross-site POST cannot rotate the cookie or change account data.
  if (req.headers.origin) {
    const originHost = new URL(req.headers.origin).host;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    if (originHost !== host)
      return fail(res, 403, 'ORIGIN_REJECTED', 'Abre Fexpo desde su dirección oficial.');
  }
  if (req.headers['sec-fetch-site'] === 'cross-site')
    return fail(res, 403, 'ORIGIN_REJECTED', 'Solicitud no permitida.');
  try {
    let path = url.searchParams.get('path') || '';
    const method = req.method || 'GET';
    let body;
    let refreshToken = '';
    if (session) {
      if (method !== 'POST') return fail(res, 405, 'METHOD_NOT_ALLOWED', 'Método no permitido.');
      const action = url.pathname.split('/').at(-1);
      if (!['google', 'refresh', 'logout'].includes(action))
        return fail(res, 404, 'NOT_FOUND', 'Ruta no disponible.');
      path = `/auth/${action}`;
      // Clear locally even when upstream revocation is unavailable.
      if (action === 'logout') res.setHeader('Set-Cookie', cookie(req, '', 0));
      body = await bodyOf(req);
      if (action !== 'google') {
        refreshToken = decodeURIComponent(
          (req.headers.cookie || '')
            .split(';')
            .map((v) => v.trim())
            .find((v) => v.startsWith(`${COOKIE}=`))
            ?.slice(COOKIE.length + 1) || '',
        );
        if (!refreshToken) return fail(res, 401, 'AUTH_REQUIRED', 'Inicia sesión para continuar.');
        body = { refreshToken };
      } else {
        body = { idToken: body.idToken, device: { id: body.deviceId, platform: 'web' } };
      }
    } else {
      // Fixed upstream + strict routes: never an open proxy or arbitrary URL fetch.
      const route = path.split('?')[0];
      if (!allowed.test(route) || /[\\#]/.test(path))
        return fail(res, 404, 'NOT_FOUND', 'Ruta no disponible.');
      const mutation = route.endsWith('/favorite')
        ? ['POST', 'DELETE']
        : route.endsWith('/check-ins')
          ? ['POST']
          : ['GET'];
      if (!mutation.includes(method))
        return fail(res, 405, 'METHOD_NOT_ALLOWED', 'Método no permitido.');
      if (method !== 'GET') body = await bodyOf(req);
    }
    const upstream = async () => {
      const response = await fetch(`${backend}/api/v1${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-platform': 'web',
          ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(12000),
        redirect: 'error',
      });
      return {
        status: response.status,
        data: response.status === 204 ? null : await response.json(),
      };
    };
    // Coalesce simultaneous refreshes (multiple tabs with a rotating token).
    let result;
    if (path === '/auth/refresh') {
      if (!refreshes.has(refreshToken)) {
        const promise = upstream();
        refreshes.set(refreshToken, promise);
        const timer = setTimeout(() => refreshes.delete(refreshToken), 10000);
        timer.unref?.();
      }
      result = await refreshes.get(refreshToken);
    } else result = await upstream();
    result = structuredClone(result);
    if (session && result.status < 300 && result.data?.data?.refreshToken) {
      res.setHeader('Set-Cookie', cookie(req, result.data.data.refreshToken, 30 * 86400));
      delete result.data.data.refreshToken;
    }
    if (
      session &&
      (path === '/auth/logout' || (path === '/auth/refresh' && [401, 403].includes(result.status)))
    ) {
      res.setHeader('Set-Cookie', cookie(req, '', 0));
    }
    res.statusCode = result.status;
    res.end(result.data ? JSON.stringify(result.data) : undefined);
  } catch (error) {
    if (error instanceof SyntaxError || error?.message === 'BODY_TOO_LARGE')
      return fail(res, 400, 'INVALID_BODY', 'Solicitud no válida.');
    fail(res, 502, 'UPSTREAM_UNAVAILABLE', 'No pudimos conectar con la feria. Inténtalo de nuevo.');
  }
}
