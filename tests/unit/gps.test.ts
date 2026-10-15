import { describe, expect, it } from 'vitest';
import { displacement, relativePosition, type GpsFix } from '@/features/campus/gps';
import { PLAN_GEOMETRY, PLAN_LOTS } from '@/data/map-plans';
import { CAMPUS_POINTS, toWorld } from '@/features/campus/model';
const fix: GpsFix = { latitude: -16.5, longitude: -68.1, accuracy: 4, timestamp: 1 };
describe('GPS relativo y geometría compartida', () => {
  it('no mueve el avatar cuando las coordenadas no cambian', () =>
    expect(relativePosition({ x: 100, y: 200 }, fix, fix)).toEqual({ x: 100, y: 200 }));
  it('convierte desplazamientos al este y al norte con escala provisional', () => {
    const next = { ...fix, latitude: fix.latitude + 0.0001, longitude: fix.longitude + 0.0001 };
    const delta = displacement(fix, next),
      point = relativePosition({ x: 100, y: 200 }, fix, next);
    expect(delta.east).toBeCloseTo(10.66, 1);
    expect(delta.north).toBeCloseTo(11.12, 1);
    expect(point.x).toBeGreaterThan(100);
    expect(point.y).toBeLessThan(200);
  });
  it('cada marcador usa el centro del mismo lote del plano original', () => {
    for (const point of CAMPUS_POINTS) {
      const plan = PLAN_GEOMETRY.find((p) => p.id === point.planId)!;
      expect(
        PLAN_LOTS[plan.id].some(([, x, y, w, h]) => x + w / 2 === point.x && y + h / 2 === point.y),
      ).toBe(true);
      const [x, y, w, h] = plan.viewBox.split(' ').map(Number);
      expect(toWorld(plan, { x: x + w / 2, y: y + h / 2 })).toEqual({ x: 0, z: 0 });
    }
  });
});
