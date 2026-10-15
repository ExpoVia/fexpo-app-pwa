import { beforeEach, describe, expect, it } from 'vitest';
import { useDemo, pointsFor, missionValue } from '@/state/demo';
import { STANDS } from '@/data/demo-data';
import { MISSIONS } from '@/data/missions';

beforeEach(async () => {
  await useDemo.persist.rehydrate();
  useDemo.getState().reset();
});
describe('Recorrido exclusivamente de demostración', () => {
  it('una visita avanza las misiones; repetirla no duplica puntos ni avisos', () => {
    expect(useDemo.getState().visit(STANDS[0].id)?.points).toBe(50);
    const count = useDemo.getState().notices.length;
    expect(useDemo.getState().visit(STANDS[0].id)).toMatchObject({ duplicate: true, points: 0 });
    expect(useDemo.getState().notices).toHaveLength(count);
    expect(pointsFor(useDemo.getState().visits, [])).toBe(50);
    expect(missionValue(MISSIONS[0], useDemo.getState().visits)).toBe(1);
    expect(missionValue(MISSIONS[1], useDemo.getState().visits)).toBe(1);
  });
  it('un stand desconocido o una sesión desactivada no generan visitas', () => {
    expect(useDemo.getState().visit('desconocido')).toBeNull();
    useDemo.getState().signOut();
    expect(useDemo.getState().visit(STANDS[0].id)).toBeNull();
    expect(useDemo.getState().visits).toEqual([]);
  });
  it('un canje no deja saldo negativo ni puede repetirse', () => {
    const state = useDemo.getState();
    expect(state.redeem('reward-coffee')).toBe(false);
    expect(state.redeem('premio-inventado')).toBe(false);
    STANDS.forEach((stand) => state.visit(stand.id));
    expect(useDemo.getState().redeem('reward-coffee')).toBe(true);
    expect(pointsFor(useDemo.getState().visits, useDemo.getState().redeemed)).toBe(50);
    expect(useDemo.getState().redeem('reward-coffee')).toBe(false);
  });
});
