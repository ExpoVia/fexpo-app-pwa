import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useDemo } from './demo';
import { useCampusLocation } from '@/features/campus/location';
export interface LocalProfile {
  id: string;
  name: string;
  picture: string | null;
  connectedAt: string;
  provider?: 'google' | 'trial';
}
let generation = 0;
/** Local personalization only. No JWT, OAuth token or backend authority is persisted. */
export const useLocalAccount = create<{
  ready: boolean;
  profile: LocalProfile | null;
  connect: (googleAccessToken: string) => Promise<void>;
  enterTrial: () => Promise<void>;
  signOut: () => void;
}>()(
  persist(
    (update, read) => ({
      ready: false,
      profile: null,
      enterTrial: async () => {
        const current = ++generation;
        await useDemo.persist.rehydrate();
        if (current !== generation) return;
        if (read().profile?.id !== 'local-trial') useDemo.getState().signOut();
        useDemo.getState().signIn('Visitante de prueba');
        update({
          profile: {
            id: 'local-trial',
            name: 'Visitante de prueba',
            picture: null,
            connectedAt: new Date().toISOString(),
            provider: 'trial',
          },
        });
      },
      connect: async (googleAccessToken) => {
        const current = ++generation;
        const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
          headers: { Authorization: `Bearer ${googleAccessToken}` },
          credentials: 'omit',
          cache: 'no-store',
          signal: AbortSignal.timeout(12000),
        });
        if (!response.ok)
          throw new Error('Google no pudo confirmar tu cuenta. Inténtalo de nuevo.');
        const user = (await response.json()) as {
          sub?: unknown;
          name?: unknown;
          picture?: unknown;
        };
        if (
          typeof user.sub !== 'string' ||
          !user.sub ||
          typeof user.name !== 'string' ||
          !user.name.trim()
        )
          throw new Error('No pudimos obtener tu perfil de Google.');
        if (current !== generation) return;
        await useDemo.persist.rehydrate();
        if (current !== generation) return;
        if (read().profile?.id !== user.sub) useDemo.getState().signOut();
        useDemo.getState().signIn(user.name);
        update({
          profile: {
            id: user.sub,
            name: user.name.slice(0, 80),
            picture:
              typeof user.picture === 'string' && user.picture.startsWith('https://')
                ? user.picture
                : null,
            connectedAt: new Date().toISOString(),
            provider: 'google',
          },
        });
      },
      signOut: () => {
        generation++;
        useCampusLocation.getState().clear();
        useDemo.getState().signOut();
        update({ profile: null });
        window.google?.accounts.id.disableAutoSelect();
      },
    }),
    {
      name: 'fexpo-local-profile-v1',
      partialize: (state) => ({ profile: state.profile }),
      onRehydrateStorage: () => () =>
        queueMicrotask(() => useLocalAccount.setState({ ready: true })),
    },
  ),
);
