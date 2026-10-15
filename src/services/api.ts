import type { ApiSuccess, AuthUserDto, PaginationMeta } from '@/types/api';
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 0,
  ) {
    super(message);
  }
  get retryable() {
    return this.status === 0 || this.status === 408 || this.status === 429 || this.status >= 500;
  }
}
type Session = { accessToken: string; expiresIn: number; user?: AuthUserDto };
let token = '';
let expiresAt = 0;
let epoch = 0;
let refreshFlight: Promise<Session> | undefined;
let ended: () => void = () => {};
export function onSessionEnded(callback: () => void) {
  ended = callback;
}
export function clearSession() {
  epoch++;
  token = '';
  expiresAt = 0;
  refreshFlight = undefined;
}
async function fetchJSON<T>(url: string, init?: RequestInit): Promise<ApiSuccess<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      credentials: 'same-origin',
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'No hay conexión con la feria. Inténtalo de nuevo.');
  }
  if (response.status === 204) return { success: true, data: undefined as T, meta: null };
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success !== true)
    throw new ApiError(
      body?.error?.code || 'SERVER_ERROR',
      body?.error?.message || 'No pudimos completar la solicitud.',
      response.status,
    );
  return body;
}
function install(value: Session, generation: number) {
  if (generation !== epoch) throw new ApiError('SESSION_CHANGED', 'La sesión cambió.');
  token = value.accessToken;
  expiresAt = Date.now() + value.expiresIn * 1000;
  return value;
}
export async function loginGoogle(idToken: string, deviceId: string) {
  const generation = ++epoch;
  const session = install(
    (
      await fetchJSON<Session>('/api/session/google', {
        method: 'POST',
        body: JSON.stringify({ idToken, deviceId }),
      })
    ).data,
    generation,
  );
  try {
    localStorage.removeItem('fexpo-session-closed');
  } catch {
    /* No credentials stored here. */
  }
  return session;
}
export async function refreshSession(): Promise<Session> {
  if (refreshFlight) return refreshFlight;
  const generation = epoch;
  const work = fetchJSON<Session>('/api/session/refresh', { method: 'POST' })
    .then((r) => install(r.data, generation))
    .catch((error) => {
      if (generation === epoch && error instanceof ApiError && [401, 403].includes(error.status)) {
        clearSession();
        ended();
      }
      throw error;
    });
  refreshFlight = work;
  void work
    .finally(() => {
      if (refreshFlight === work) refreshFlight = undefined;
    })
    .catch(() => {});
  return work;
}
export async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
  retry = true,
): Promise<ApiSuccess<T>> {
  const generation = epoch;
  if (options.auth && (!token || expiresAt - Date.now() < 60000)) await refreshSession();
  if (generation !== epoch) throw new ApiError('SESSION_CHANGED', 'La sesión cambió.');
  try {
    const response = await fetchJSON<T>(`/api/backend?path=${encodeURIComponent(path)}`, {
      method: options.method || 'GET',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      headers: options.auth ? { Authorization: `Bearer ${token}` } : {},
    });
    if (options.auth && generation !== epoch)
      throw new ApiError('SESSION_CHANGED', 'La sesión cambió.');
    return response;
  } catch (error) {
    if (options.auth && retry && error instanceof ApiError && error.status === 401) {
      await refreshSession();
      return request<T>(path, options, false);
    }
    throw error;
  }
}
export async function logout() {
  try {
    localStorage.setItem('fexpo-session-closed', 'true');
  } catch {
    /* Cookie also clears server-side. */
  }
  try {
    await fetchJSON('/api/session/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } finally {
    clearSession();
  }
}
export async function allPages<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await request<T[]>(
      `${path}${path.includes('?') ? '&' : '?'}limit=100&page=${page}`,
    );
    items.push(...response.data);
    totalPages = (response.meta as PaginationMeta | null)?.totalPages || 1;
    page++;
  } while (page <= totalPages && page <= 100);
  if (page <= totalPages)
    throw new ApiError('CATALOG_TOO_LARGE', 'El catálogo supera el límite de esta versión.');
  return items;
}
