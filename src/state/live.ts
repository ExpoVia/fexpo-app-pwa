import { create } from 'zustand';
import { get, set, del } from 'idb-keyval';
import {
  request,
  allPages,
  refreshSession,
  loginGoogle,
  logout,
  onSessionEnded,
  ApiError,
} from '@/services/api';
import { EVENT_ID, eventReady } from '@/services/config';
import type {
  AuthUserDto,
  StandDto,
  EventMapDto,
  GamificationDto,
  VisitDto,
  FavoriteDto,
  StreakDto,
  UserQrToken,
  CheckinResponse,
} from '@/types/api';
import type { Stand, StandCategory } from '@/types/domain';
import type { Notice } from './demo';
import { useUI } from './demo';

export interface Pending {
  requestKey: string;
  standId: string;
  credential: string;
  occurredAt: string;
  error?: string;
  blocked?: boolean;
}
type PrivateData = {
  progress: GamificationDto | null;
  visits: VisitDto[];
  favorites: string[];
  streak: StreakDto | null;
  qr: UserQrToken | null;
  pending: Pending[];
  notices: Notice[];
  syncedAt: string | null;
};
const empty = (): PrivateData => ({
  progress: null,
  visits: [],
  favorites: [],
  streak: null,
  qr: null,
  pending: [],
  notices: [],
  syncedAt: null,
});
interface LiveState extends PrivateData {
  ready: boolean;
  status: 'loading' | 'guest' | 'signedIn';
  user: AuthUserDto | null;
  stands: Stand[];
  map: EventMapDto | null;
  catalogLoading: boolean;
  error: string;
  progressError: string;
  syncing: boolean;
  login: (credential: string) => Promise<void>;
  signOut: () => Promise<void>;
  favorite: (id: string) => Promise<void>;
  readNotices: () => void;
  clearNotices: () => void;
}
export const useLive = create<LiveState>((update, read) => ({
  ...empty(),
  ready: false,
  status: 'loading',
  user: null,
  stands: [],
  map: null,
  catalogLoading: false,
  error: '',
  progressError: '',
  syncing: false,
  login: async (credential) => {
    const previous = ++generation;
    update({ ...empty(), status: 'loading', user: null });
    try {
      let deviceId = localStorage.getItem('fexpo-device-id');
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('fexpo-device-id', deviceId);
      }
      const session = await loginGoogle(credential, deviceId);
      if (previous !== generation || !session.user) return;
      await activate(session.user, previous);
    } catch (error) {
      if (previous === generation) update({ status: 'guest', ready: true });
      throw error;
    }
  },
  signOut: async () => {
    const key = privateKey();
    generation++;
    update({ ...empty(), status: 'guest', user: null, syncing: false });
    // Remove account caches and credential-bearing offline jobs on explicit logout.
    await del(key).catch(() => {});
    try {
      await logout();
    } catch {
      useUI.getState().notify('Sesión cerrada aquí. La revocación remota no pudo confirmarse.');
    }
  },
  favorite: async (id) => {
    if (read().status !== 'signedIn') {
      useUI.getState().notify('Inicia sesión para guardar stands.');
      return;
    }
    const previous = generation;
    const included = read().favorites.includes(id);
    try {
      await request(`/stands/${id}/favorite`, { auth: true, method: included ? 'DELETE' : 'POST' });
      if (previous !== generation) return;
      update((s) => ({
        favorites: included
          ? s.favorites.filter((v) => v !== id)
          : [...new Set([...s.favorites, id])],
      }));
      await savePrivate();
    } catch (e) {
      useUI.getState().notify(message(e));
    }
  },
  readNotices: () => {
    update((s) => ({ notices: s.notices.map((n) => ({ ...n, read: true })) }));
    void savePrivate();
  },
  clearNotices: () => {
    update({ notices: [] });
    void savePrivate();
  },
}));
let generation = 0;
let booted = false;
let syncFlight: { generation: number; promise: Promise<void> } | null = null;
let queueFlight: { generation: number; promise: Promise<void> } | null = null;
let catalogFlight: Promise<void> | null = null;
export const message = (e: unknown) =>
  e instanceof Error ? e.message : 'No pudimos completar la acción.';
const privateKey = () => `fexpo-account-v1:${EVENT_ID}:${useLive.getState().user?.id || 'guest'}`;
const publicKey = () => `fexpo-catalog-v1:${EVENT_ID}`;
async function savePrivate() {
  const s = useLive.getState();
  if (!s.user) return;
  const { progress, visits, favorites, streak, qr, pending, notices, syncedAt } = s;
  await set(privateKey(), {
    progress,
    visits,
    favorites,
    streak,
    qr,
    pending,
    notices,
    syncedAt,
  }).catch(() => {});
}
const categories: Record<string, StandCategory> = {
  technology: 'technology',
  tecnologia: 'technology',
  health: 'health',
  salud: 'health',
  finance: 'finance',
  finanzas: 'finance',
  gastronomy: 'gastronomy',
  gastronomia: 'gastronomy',
  education: 'education',
  educacion: 'education',
  startups: 'startups',
};
export function normalizeStand(s: StandDto): Stand {
  return {
    id: s.id,
    name: s.displayName,
    category: categories[s.categories[0]?.slug] || 'startups',
    categoryLabel: s.categories.map((c) => c.label).join(' · ') || 'Expositor',
    description: s.description || '',
    zoneId: s.location?.zoneId || '',
    planId: s.location?.floorId || '',
    boothCode: s.boothCode,
    tags: s.tags,
    activity: s.activityHighlight || undefined,
    promotion: s.promotionHighlight || undefined,
    points: s.visitPoints ?? 0,
    featured: s.featured,
  };
}
async function activate(user: AuthUserDto, previous: number) {
  const cached = await get<PrivateData>(`fexpo-account-v1:${EVENT_ID}:${user.id}`).catch(
    () => undefined,
  );
  if (generation !== previous) return;
  useLive.setState({ ...empty(), ...cached, user, ready: true, status: 'signedIn' });
  await syncProgress();
  await flushPending();
}
export async function bootstrap() {
  if (booted) return;
  booted = true;
  useLive.setState({ ready: true });
  void loadCatalog();
  try {
    if (localStorage.getItem('fexpo-session-closed') === 'true') {
      useLive.setState({ status: 'guest' });
      return;
    }
  } catch {
    /* Session can still be restored through the HttpOnly cookie. */
  }
  const previous = generation;
  try {
    await refreshSession();
    const me = (
      await request<{ id: string; profile: Omit<AuthUserDto, 'id'> }>('/auth/me', { auth: true })
    ).data;
    await activate({ id: me.id, ...me.profile }, previous);
  } catch (error) {
    if (previous === generation)
      useLive.setState({
        ready: true,
        status: 'guest',
        progressError: error instanceof ApiError && error.status === 401 ? '' : message(error),
      });
  }
}
onSessionEnded(() => {
  generation++;
  useLive.setState({ ...empty(), ready: true, status: 'guest', user: null, syncing: false });
});
export async function loadCatalog() {
  if (catalogFlight) return catalogFlight;
  const work = (async () => {
    if (!eventReady) {
      useLive.setState({ error: 'Falta configurar el identificador del evento.' });
      return;
    }
    useLive.setState({ catalogLoading: true, error: '' });
    const cache = await get<{ stands: Stand[]; map: EventMapDto | null }>(publicKey()).catch(
      () => undefined,
    );
    if (cache) useLive.setState(cache);
    try {
      const stands = (await allPages<StandDto>(`/events/${EVENT_ID}/stands`)).map(normalizeStand);
      useLive.setState({ stands });
      await set(publicKey(), { stands, map: useLive.getState().map }).catch(() => {});
      const map = (await request<EventMapDto>(`/events/${EVENT_ID}/map`)).data;
      useLive.setState({ map });
      await set(publicKey(), { stands, map }).catch(() => {});
    } catch (e) {
      useLive.setState({ error: message(e) });
    } finally {
      useLive.setState({ catalogLoading: false });
    }
  })();
  catalogFlight = work;
  try {
    await work;
  } finally {
    catalogFlight = null;
  }
}
export async function syncProgress(force = false) {
  const s = useLive.getState();
  if (s.status !== 'signedIn' || !eventReady || !navigator.onLine) return;
  const previous = generation;
  if (syncFlight?.generation === previous) {
    if (!force) return syncFlight.promise;
    await syncFlight.promise;
    if (previous !== generation) return;
    return syncProgress();
  }
  const work = (async () => {
    useLive.setState({ syncing: true });
    try {
      const base = `/events/${EVENT_ID}/me`;
      const [progress, visits, favorites, streak] = await Promise.all([
        request<GamificationDto>(`${base}/gamification`, { auth: true }),
        request<VisitDto[]>(`${base}/visits`, { auth: true }),
        request<FavoriteDto[]>(`${base}/favorites`, { auth: true }).catch(() => null),
        request<StreakDto>(`${base}/streak`, { auth: true }).catch(() => null),
      ]);
      if (generation !== previous) return;
      const state = useLive.getState();
      const notices = [...state.notices];
      if (state.syncedAt)
        for (const visit of visits.data) {
          if (
            state.visits.some((v) => v.visitId === visit.visitId) ||
            notices.some((n) => n.id === `visit-${visit.visitId}`)
          )
            continue;
          notices.unshift({
            id: `visit-${visit.visitId}`,
            title: '¡Visita registrada!',
            body: `${visit.standName} · +${visit.pointsAwarded} puntos`,
            art: 'contact',
            at: visit.visitedAt,
            read: false,
          });
        }
      useLive.setState({
        progress: progress.data,
        visits: visits.data,
        favorites: favorites?.data.map((v) => v.standId) ?? state.favorites,
        streak: streak?.data ?? state.streak,
        notices: notices.slice(0, 50),
        syncedAt: new Date().toISOString(),
        progressError: '',
      });
      const newest = notices.find(
        (notice) => !state.notices.some((previous) => previous.id === notice.id),
      );
      if (newest) useUI.getState().notify(`${newest.title} ${newest.body}`);
      await savePrivate();
    } catch (e) {
      if (generation === previous) useLive.setState({ progressError: message(e) });
    } finally {
      if (generation === previous) useLive.setState({ syncing: false });
    }
  })();
  syncFlight = { generation: previous, promise: work };
  try {
    await work;
  } finally {
    if (syncFlight?.promise === work) syncFlight = null;
  }
}
export async function loadQr() {
  const previous = generation;
  const qr = (await request<UserQrToken>(`/me/qr?eventId=${EVENT_ID}`, { auth: true })).data;
  if (generation !== previous) return;
  useLive.setState({ qr });
  await savePrivate();
}
async function sendPending(job: Pending) {
  return (
    await request<CheckinResponse>(`/stands/${job.standId}/check-ins`, {
      auth: true,
      method: 'POST',
      body: { method: 'nfc', credential: job.credential, requestKey: job.requestKey },
    })
  ).data;
}
export async function registerNfc(standId: string, credential: string) {
  if (useLive.getState().status !== 'signedIn')
    throw new Error('Inicia sesión para registrar la visita.');
  const waiting = useLive.getState().pending.find((job) => job.standId === standId && !job.blocked);
  if (waiting)
    return { status: 'pending' as const, response: null, requestKey: waiting.requestKey };
  const previous = generation;
  const job: Pending = {
    standId,
    credential,
    requestKey: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
  };
  try {
    if (!navigator.onLine) throw new ApiError('OFFLINE', 'Sin conexión.');
    const response = await sendPending(job);
    if (generation !== previous) throw new ApiError('SESSION_CHANGED', 'La sesión cambió.');
    // Do not derive or optimistically award points. The next read is authoritative.
    await syncProgress(true);
    return { status: 'confirmed' as const, response, requestKey: job.requestKey };
  } catch (e) {
    if (generation !== previous || !(e instanceof ApiError) || !e.retryable) throw e;
    // Persist before acknowledging. If storage fails, do not claim it is queued.
    const pending = [...useLive.getState().pending, job];
    const key = privateKey();
    const s = useLive.getState();
    await set(key, {
      progress: s.progress,
      visits: s.visits,
      favorites: s.favorites,
      streak: s.streak,
      qr: s.qr,
      notices: s.notices,
      syncedAt: s.syncedAt,
      pending,
    });
    if (generation !== previous) {
      await del(key);
      throw new Error('La sesión cambió. Vuelve a leer la tarjeta.');
    }
    useLive.setState({ pending });
    return { status: 'pending' as const, response: null, requestKey: job.requestKey };
  }
}
export async function flushPending() {
  const previous = generation;
  if (queueFlight?.generation === previous) return queueFlight.promise;
  const work = (async () => {
    if (useLive.getState().status !== 'signedIn' || !navigator.onLine) return;
    let confirmed = false;
    for (const job of [...useLive.getState().pending]) {
      if (generation !== previous || job.blocked) continue;
      try {
        await sendPending(job);
        if (generation !== previous) return;
        confirmed = true;
        useLive.setState((s) => ({
          pending: s.pending.filter((j) => j.requestKey !== job.requestKey),
        }));
      } catch (e) {
        if (generation !== previous) return;
        if (!(e instanceof ApiError) || e.retryable || e.status === 401) break;
        useLive.setState((s) => ({
          pending: s.pending.map((j) =>
            j.requestKey === job.requestKey ? { ...j, blocked: true, error: message(e) } : j,
          ),
        }));
      }
      await savePrivate();
    }
    await syncProgress(confirmed);
  })();
  queueFlight = { generation: previous, promise: work };
  try {
    await work;
  } finally {
    if (queueFlight?.promise === work) queueFlight = null;
  }
}
