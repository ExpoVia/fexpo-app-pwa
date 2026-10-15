/**
 * Interpretacion del contenido de un tag NFC, sin dependencias nativas para
 * poder probarlo con jest.
 *
 * El tag de cada stand lleva:
 *  - UID del chip  → `credential` del check-in. El backend lo compara contra
 *    nfc_tags.uid_hash; la app nunca decide si es valido.
 *  - Registro NDEF → a que stand pertenece (el endpoint es por stand). Formatos
 *    aceptados, en orden:
 *      https://<dominio>/e/<evento>/s/<standId>   (app link acordado)
 *      fexpo://stand/<standId>  ·  .../stands/<standId>
 *      ...?standId=<standId>
 *      {"standId":"<standId>"}                    (registro de texto JSON)
 *      <standId>                                  (texto plano)
 */

const ID = '([A-Za-z0-9][A-Za-z0-9_-]{1,63})';
const PATTERNS = [
  new RegExp(`/s/${ID}(?:[/?#]|$)`),
  new RegExp(`^fexpo://stands?/${ID}(?:[/?#]|$)`, 'i'),
  new RegExp(`/stands?/${ID}(?:[/?#]|$)`),
  new RegExp(`[?&]standId=${ID}(?:[&#]|$)`),
];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLAIN_ID = /^stand-[a-z0-9-]+$/i;
const TEST_TAG = /^FIPAZ:2026:STAND:([A-Za-z0-9][A-Za-z0-9_-]{1,63})$/i;

function fromJson(text: string): string | null {
  if (!text.trim().startsWith('{')) return null;
  try {
    const value = (JSON.parse(text) as { standId?: unknown }).standId;
    return typeof value === 'string' && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

/** Busca el standId en los registros NDEF ya decodificados a texto. */
export function extractStandIds(records: readonly string[]): string[] {
  const ids = new Set<string>();
  for (const raw of records) {
    const text = raw.trim();
    if (!text) continue;
    const json = fromJson(text);
    if (json) {
      ids.add(json);
      continue;
    }
    const testTag = text.match(TEST_TAG);
    if (testTag) {
      ids.add(testTag[1]);
      continue;
    }
    for (const pattern of PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        ids.add(match[1]);
        break;
      }
    }
    if (UUID.test(text) || PLAIN_ID.test(text)) ids.add(text);
  }
  return [...ids];
}

/** Un tag con dos stands distintos no identifica una visita inequívoca. */
export function extractStandId(records: readonly string[]): string | null {
  const ids = extractStandIds(records);
  return ids.length === 1 ? ids[0] : null;
}

/**
 * UID del chip en hexadecimal, en mayusculas y sin separadores. Android lo
 * entrega como "04a2b3c4d5e6f7" y algunas librerias con ":"; se normaliza para
 * que el mismo tag produzca siempre la misma credencial.
 */
export function normalizeUid(id: string | undefined | null): string | null {
  if (!id) return null;
  const hex = id.replace(/[^0-9a-f]/gi, '').toUpperCase();
  return hex.length >= 4 ? hex : null;
}
