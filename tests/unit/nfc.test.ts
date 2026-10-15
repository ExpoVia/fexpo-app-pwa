import { describe, expect, it, vi } from 'vitest';
vi.mock('@/services/config', () => ({
  EVENT_ID: 'e0000000-0000-4000-8000-000000000001',
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
}));
import { resolveReading } from '@/services/nfc';
const id = '5a000000-0000-4000-8000-000000000001';
describe('Web NFC: el enlace no sustituye al UID', () => {
  it('normaliza un UID real y acepta NDEF del stand', () =>
    expect(resolveReading('04:a1:b2:c3', [`https://fexpo.test/stands/${id}`])).toEqual({
      standId: id,
      credential: '04A1B2C3',
    }));
  it('permite contexto para una tarjeta sin stand escrito', () =>
    expect(resolveReading('04-a1-b2-c3', [], id).standId).toBe(id));
  it('rechaza UID ausente aunque exista un enlace', () =>
    expect(() => resolveReading('', [`https://fexpo.test/stands/${id}`])).toThrow('identificador'));
  it('rechaza otra feria, múltiples stands y discrepancias con el contexto', () => {
    expect(() => resolveReading('04a1b2c3', [`https://fexpo.test/e/otro/s/${id}`])).toThrow(
      'otra feria',
    );
    expect(() => resolveReading('04a1b2c3', [id, '5a000000-0000-4000-8000-000000000002'])).toThrow(
      'otro stand',
    );
    expect(() => resolveReading('04a1b2c3', [id], '5a000000-0000-4000-8000-000000000002')).toThrow(
      'otro stand',
    );
  });
});
