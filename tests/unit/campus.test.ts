import { beforeEach, describe, expect, it } from 'vitest';
import { useCampusLocation } from '@/features/campus/location';
describe('ubicación NFC en la maqueta', () => {
  beforeEach(() => useCampusLocation.getState().clear());
  it('acepta un stand conocido y conserva solo su ID y la hora', () => {
    const id = useCampusLocation.getState().locate(['FIPAZ:2026:STAND:stand-altura-labs']);
    expect(id).toBe('stand-altura-labs');
    expect(Object.keys(useCampusLocation.getState().last!)).toEqual(['standId', 'at']);
  });
  it('una tarjeta desconocida no sobrescribe la última ubicación', () => {
    useCampusLocation.getState().locate(['stand-altura-labs']);
    expect(() => useCampusLocation.getState().locate(['Tarjeta bancaria'])).toThrow(/único stand/);
    expect(() => useCampusLocation.getState().locate(['stand-desconocido'])).toThrow(/ubicación/);
    expect(useCampusLocation.getState().last?.standId).toBe('stand-altura-labs');
  });
  it('rechaza etiquetas ambiguas y de otra feria', () => {
    expect(() =>
      useCampusLocation.getState().locate(['stand-altura-labs', 'stand-sabor-andino']),
    ).toThrow();
    expect(() =>
      useCampusLocation.getState().locate(['https://fexpo.test/e/otra-feria/s/stand-altura-labs']),
    ).toThrow(/otra feria/);
    expect(useCampusLocation.getState().last).toBeNull();
  });
});
