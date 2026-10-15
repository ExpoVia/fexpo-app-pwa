import { useDemo, pointsFor, levelFor } from './demo';
import { useLive } from './live';
import { LIVE, LOCAL } from '@/services/config';
import { useLocalAccount } from './local-account';
import { STANDS } from '@/data/demo-data';
export function useExperience() {
  const demo = useDemo();
  const live = useLive();
  const account = useLocalAccount();
  return LIVE
    ? {
        hydrated: live.ready,
        signedIn: live.status === 'signedIn',
        name: live.user?.displayName || 'Visitante',
        visits: live.visits.map((v) => ({
          standId: v.standId,
          at: v.visitedAt,
          points: v.pointsAwarded,
        })),
        favorites: live.favorites,
        redeemed: [] as string[],
        notices: live.notices,
        points: live.progress?.pointsBalance ?? null,
        level: live.progress?.level.number ?? null,
        favorite: live.favorite,
        readNotices: live.readNotices,
        clearNotices: live.clearNotices,
      }
    : {
        ...demo,
        ...(LOCAL
          ? { signedIn: !!account.profile, name: account.profile?.name || 'Visitante' }
          : {}),
        points: pointsFor(demo.visits, demo.redeemed),
        level: levelFor(demo.visits),
      };
}
export function useStands() {
  const stands = useLive((s) => s.stands);
  return LIVE ? stands : STANDS;
}
