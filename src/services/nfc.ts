import { extractStandIds, normalizeUid } from './nfc-payload';
import { UUID, EVENT_ID } from './config';
type NdefRecord = {
  recordType: string;
  encoding?: string;
  data?: DataView;
  toRecords?: () => NdefRecord[];
};
interface Reading extends Event {
  serialNumber: string;
  message: { records: NdefRecord[] };
}
interface Reader extends EventTarget {
  scan(options: { signal: AbortSignal }): Promise<void>;
}
declare global {
  interface Window {
    NDEFReader?: new () => Reader;
  }
}
export const nfcAvailable = () => window.isSecureContext && !!window.NDEFReader;
function decode(records: NdefRecord[]): string[] {
  return records.flatMap((record) => {
    if (record.recordType === 'smart-poster' && record.toRecords) return decode(record.toRecords());
    if (!record.data || !['url', 'text', 'mime', 'absolute-url'].includes(record.recordType))
      return [];
    try {
      return [new TextDecoder(record.encoding || 'utf-8').decode(record.data)];
    } catch {
      return [];
    }
  });
}
export function resolveReading(serialNumber: string, records: string[], context?: string) {
  const ids = extractStandIds(records);
  if (ids.length > 1 || (context && ids.length && context !== ids[0]))
    throw new Error('La tarjeta corresponde a otro stand. Abre su perfil y vuelve a leerla.');
  for (const record of records) {
    const event = record.match(/\/e\/([^/]+)\/s\//)?.[1];
    if (event && event !== EVENT_ID) throw new Error('Esta tarjeta pertenece a otra feria.');
  }
  const standId = ids[0] || context;
  if (!standId || !UUID.test(standId))
    throw new Error('No se identificó el stand. Abre su perfil y pulsa Registrar visita.');
  if (!serialNumber || !/^[0-9a-f:\-\s]+$/i.test(serialNumber))
    throw new Error('No se pudo leer el identificador de esta tarjeta. Usa Mi QR en el stand.');
  const credential = normalizeUid(serialNumber);
  if (!credential)
    throw new Error('Esta tarjeta no entrega un identificador NFC válido. Usa Mi QR.');
  return { standId, credential };
}
export interface RawNfcReading {
  uid: string | null;
  records: string[];
  recordTypes: string[];
  readAt: string;
}
/** Hardware probe: accepts any readable NDEF tag, without stand/backend validation. */
export function readRawNfc(signal: AbortSignal): Promise<RawNfcReading> {
  if (!nfcAvailable())
    return Promise.reject(
      new Error('Este navegador no admite lectura Web NFC. Usa Chrome en Android con NFC.'),
    );
  return new Promise((resolve, reject) => {
    const reader = new window.NDEFReader!();
    const scanController = new AbortController();
    let finished = false;
    const finish = (error?: unknown, result?: RawNfcReading) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      reader.removeEventListener('reading', reading);
      reader.removeEventListener('readingerror', failed);
      signal.removeEventListener('abort', abort);
      scanController.abort();
      if (error) reject(error);
      else resolve(result!);
    };
    const abort = () => finish(new DOMException('Lectura cancelada.', 'AbortError'));
    const failed = () =>
      finish(
        new Error(
          'Chrome detectó una tarjeta que no pudo leer. Web NFC necesita etiquetas NDEF; las tarjetas bancarias o sin formato pueden ser incompatibles.',
        ),
      );
    const reading = (event: Event) => {
      try {
        const e = event as Reading;
        const uid =
          e.serialNumber && /^[0-9a-f:\-\s]+$/i.test(e.serialNumber)
            ? normalizeUid(e.serialNumber)
            : null;
        finish(undefined, {
          uid,
          records: decode(e.message.records),
          recordTypes: e.message.records.map((r) => r.recordType),
          readAt: new Date().toISOString(),
        });
      } catch (error) {
        finish(error);
      }
    };
    const timer = setTimeout(
      () =>
        finish(
          new Error(
            'No encontramos una tarjeta. Retírala, inicia otra lectura y vuelve a acercarla.',
          ),
        ),
      30000,
    );
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener('abort', abort, { once: true });
    reader.addEventListener('reading', reading);
    reader.addEventListener('readingerror', failed);
    try {
      void reader.scan({ signal: scanController.signal }).catch((error) => finish(error));
    } catch (error) {
      finish(error);
    }
  });
}
export function readNfc(
  signal: AbortSignal,
  context?: string,
): Promise<{ standId: string; credential: string }> {
  return readRawNfc(signal).then((result) =>
    resolveReading(result.uid || '', result.records, context),
  );
}
