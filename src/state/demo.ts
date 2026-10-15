import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { STANDS } from '@/data/demo-data';
import { MISSIONS } from '@/data/missions';
import { REWARDS } from '@/data/rewards';
import type { Mission } from '@/types/domain';

export interface DemoVisit {
  standId: string;
  at: string;
  points: number;
}
export interface Notice {
  id: string;
  title: string;
  body: string;
  read: boolean;
  at: string;
  art: string;
}
export interface Receipt {
  standId: string;
  duplicate: boolean;
  points: number;
  at: string;
}
export type ThemeMode = 'system' | 'light' | 'dark';

export function missionValue(mission: Mission, visits: DemoVisit[]): number {
  return Math.min(
    mission.target,
    visits.filter((visit) => {
      const stand = STANDS.find((item) => item.id === visit.standId);
      return mission.standIds?.length
        ? mission.standIds.includes(visit.standId)
        : mission.category === 'general' || stand?.category === mission.category;
    }).length,
  );
}
export const pointsFor = (visits: DemoVisit[], redeemed: string[]) => {
  return Math.max(
    0,
    visits.reduce((total, visit) => total + visit.points, 0) -
      redeemed.reduce(
        (total, id) => total + (REWARDS.find((reward) => reward.id === id)?.cost ?? 0),
        0,
      ),
  );
};
export const levelFor = (visits: DemoVisit[]) =>
  [0, 150, 300, 500].filter((n) => visits.reduce((sum, v) => sum + v.points, 0) >= n).length;
export const missionArt = (id: string) =>
  id.includes('first')
    ? 'contact'
    : id.includes('tech')
      ? 'technology'
      : id.includes('flavors')
        ? 'food'
        : id.includes('explorer')
          ? 'explorer'
          : 'route';

// IndexedDB holds only fictional prototype data. No tokens or server state.
const fallback = new Map<string, string>();
const storage: StateStorage = {
  getItem: async (name) => {
    try {
      return (await get<string>(name)) ?? fallback.get(name) ?? null;
    } catch {
      return fallback.get(name) ?? null;
    }
  },
  setItem: async (name, value) => {
    fallback.set(name, value);
    try {
      await set(name, value);
    } catch {
      /* Works in memory if storage is unavailable. */
    }
  },
  removeItem: async (name) => {
    fallback.delete(name);
    try {
      await del(name);
    } catch {
      /* Nothing persisted. */
    }
  },
};

interface DemoState {
  hydrated: boolean;
  signedIn: boolean;
  name: string;
  visits: DemoVisit[];
  favorites: string[];
  redeemed: string[];
  notices: Notice[];
  visit: (standId: string) => Receipt | null;
  favorite: (standId: string) => void;
  redeem: (id: string) => boolean;
  readNotices: () => void;
  clearNotices: () => void;
  signIn: (name?: string) => void;
  signOut: () => void;
  reset: () => void;
}
const seedVisit = { standId: 'stand-altura-labs', at: '2026-10-15T14:30:00-04:00', points: 50 };
export const useDemo = create<DemoState>()(
  persist(
    (update, read) => ({
      hydrated: false,
      signedIn: true,
      name: 'Visitante demo',
      visits: [seedVisit],
      favorites: [],
      redeemed: [],
      notices: [],
      visit: (standId) => {
        const state = read();
        const stand = STANDS.find((item) => item.id === standId);
        if (!stand || !state.signedIn) return null;
        const previous = state.visits.find((v) => v.standId === standId);
        if (previous) return { standId, duplicate: true, points: 0, at: previous.at };
        const at = new Date().toISOString();
        const visits = [...state.visits, { standId, at, points: 50 }];
        const notice: Notice = {
          id: `visit-${standId}`,
          title: '¡Visita simulada!',
          body: `${stand.name} · +50 puntos de demostración.`,
          read: false,
          at,
          art: 'contact',
        };
        const newMissions = MISSIONS.filter(
          (m) => missionValue(m, state.visits) < m.target && missionValue(m, visits) >= m.target,
        );
        update({
          visits,
          notices: [
            notice,
            ...newMissions.map((m) => ({
              id: m.id,
              title: '¡Misión completada!',
              body: m.title,
              read: false,
              at,
              art: missionArt(m.id),
            })),
            ...state.notices,
          ].slice(0, 30),
        });
        return { standId, duplicate: false, points: 50, at };
      },
      favorite: (id) => {
        if (STANDS.some((s) => s.id === id))
          update((s) => ({
            favorites: s.favorites.includes(id)
              ? s.favorites.filter((v) => v !== id)
              : [...s.favorites, id],
          }));
      },
      redeem: (id) => {
        const state = read();
        const reward = REWARDS.find((item) => item.id === id);
        if (
          !reward ||
          !state.signedIn ||
          state.redeemed.includes(id) ||
          pointsFor(state.visits, state.redeemed) < reward.cost
        )
          return false;
        update({ redeemed: [...state.redeemed, id] });
        return true;
      },
      readNotices: () => update((s) => ({ notices: s.notices.map((n) => ({ ...n, read: true })) })),
      clearNotices: () => update({ notices: [] }),
      signIn: (name = 'Visitante demo') =>
        update({ signedIn: true, name: name.trim().slice(0, 40) || 'Visitante demo' }),
      signOut: () =>
        update({ signedIn: false, visits: [], favorites: [], redeemed: [], notices: [] }),
      reset: () =>
        update({
          visits: [],
          favorites: [],
          redeemed: [],
          notices: [],
          signedIn: true,
          name: 'Visitante demo',
        }),
    }),
    {
      name: 'fexpo-pwa-visual-v1',
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({
        signedIn: state.signedIn,
        name: state.name,
        visits: state.visits,
        favorites: state.favorites,
        redeemed: state.redeemed,
        notices: state.notices,
      }),
      onRehydrateStorage: () => () => useDemo.setState({ hydrated: true }),
    },
  ),
);

export const useUI = create<{ toast: string; notify: (message: string) => void }>((setState) => ({
  toast: '',
  notify: (toast) => setState({ toast }),
}));
