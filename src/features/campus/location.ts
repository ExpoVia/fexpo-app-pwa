import { create } from 'zustand';
import { resolveCampusTag } from './model';

/** Session-only last tag location. Never retain the tag UID or its contents. */
export const useCampusLocation = create<{
  last: { standId: string; at: string } | null;
  locate: (records: readonly string[]) => string;
  clear: () => void;
}>((set) => ({
  last: null,
  locate(records) {
    const point = resolveCampusTag(records);
    set({ last: { standId: point.id, at: new Date().toISOString() } });
    return point.id;
  },
  clear: () => set({ last: null }),
}));
