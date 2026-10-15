import { STANDS } from '@/data/demo-data';
import { extractStandIds } from '@/services/nfc-payload';
import { EVENT_ID } from '@/services/config';
import { PLAN_GEOMETRY, PLAN_LOTS, type PlanGeometry } from '@/data/map-plans';

export const CAMPUS_POINTS = STANDS.flatMap((stand) => {
  const lot = PLAN_LOTS[stand.planId]?.find(
    ([code]) => Number(code) === Number(stand.boothCode.split('-').at(-1)),
  );
  if (!lot) return [];
  return [
    {
      id: stand.id,
      planId: stand.planId,
      x: lot[1] + lot[3] / 2,
      y: lot[2] + lot[4] / 2,
      color: PLAN_GEOMETRY.find((p) => p.id === stand.planId)!.color,
    },
  ];
});
export type CampusPoint = (typeof CAMPUS_POINTS)[number];
export type PlanPosition = { x: number; y: number };
export const WORLD_SCALE = 0.04;
export function toWorld(plan: PlanGeometry, point: PlanPosition) {
  const [x, y, w, h] = plan.viewBox.split(' ').map(Number);
  return { x: (point.x - x - w / 2) * WORLD_SCALE, z: (point.y - y - h / 2) * WORLD_SCALE };
}
export function standAtLot(planId: string, code: string | number) {
  return STANDS.find(
    (s) => s.planId === planId && Number(s.boothCode.split('-').at(-1)) === Number(code),
  );
}
export function resolveCampusTag(records: readonly string[]): CampusPoint {
  const ids = extractStandIds(records);
  if (ids.length !== 1)
    throw new Error(
      'Tarjeta leída. Necesita identificar un único stand de Fexpo para ubicarte en el mapa.',
    );
  for (const record of records) {
    const event = record.match(/\/e\/([^/]+)\/s\//)?.[1];
    if (event && event !== EVENT_ID)
      throw new Error('Esta etiqueta pertenece a otra feria. Tu ubicación no cambió.');
  }
  const point = CAMPUS_POINTS.find((p) => p.id === ids[0]);
  if (!point || !STANDS.some((s) => s.id === point.id))
    throw new Error('Tarjeta leída. Este stand todavía no tiene una ubicación en la maqueta.');
  return point;
}
