import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Nfc, ShieldCheck, Smartphone, X } from 'lucide-react';
import { nfcAvailable, readRawNfc, type RawNfcReading } from '@/services/nfc';
import { WalletPass } from './Checkin';
import { audioFeedback } from '@/features/audio/feedback';
import { Pill } from '@/ui/components';
import { useCampusLocation } from '@/features/campus/location';

export function NfcProbe() {
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState<RawNfcReading | null>(null);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const available = nfcAvailable();
  useEffect(() => {
    const hide = () => {
      if (document.hidden) controller.current?.abort();
    };
    document.addEventListener('visibilitychange', hide);
    return () => {
      generation.current++;
      controller.current?.abort();
      document.removeEventListener('visibilitychange', hide);
    };
  }, []);
  async function scan() {
    if (controller.current) return;
    const current = ++generation.current;
    const abort = new AbortController();
    controller.current = abort;
    setReading(null);
    setError('');
    setBusy(true);
    try {
      const result = await readRawNfc(abort.signal);
      if (current !== generation.current) return;
      setReading(result);
      audioFeedback.request('nfcRead');
      try {
        useCampusLocation.getState().locate(result.records);
      } catch {
        // A successful hardware probe does not imply a known stand location.
      }
    } catch (e) {
      if (current !== generation.current) return;
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Permite el acceso a NFC en Chrome para leer tu tarjeta.'
          : e instanceof Error
            ? e.message
            : 'No se pudo leer la tarjeta.',
      );
    } finally {
      if (current === generation.current) {
        controller.current = null;
        setBusy(false);
      }
    }
  }
  return (
    <div className="stack checkin-page nfc-probe">
      <div className="checkin-stage">
        <div className="checkin-eyebrow">TU PASE A LA FERIA</div>
        <WalletPass busy={busy} success={!!reading} />
        <div className="checkin-status" aria-live="polite">
          <h2>
            {busy
              ? 'Acerca tu tarjeta.'
              : reading
                ? '¡Tarjeta detectada!'
                : 'Conecta con un gesto.'}
          </h2>
          <p>
            {busy
              ? 'Mantén el celular desbloqueado y acerca la tarjeta a la parte trasera.'
              : reading
                ? 'La antena NFC respondió a una lectura real.'
                : 'Prueba la lectura NFC de tu celular, sin conexión con el backend.'}
          </p>
          <Pill tone={reading ? 'green' : 'blue'}>
            {reading ? 'Lectura real confirmada' : 'Prueba local · NFC real'}
          </Pill>
        </div>
      </div>
      {available ? (
        <button className="button scan-button" disabled={busy} onClick={() => void scan()}>
          <Nfc size={23} />
          {busy
            ? 'Esperando tu tarjeta…'
            : reading
              ? 'Leer otra tarjeta NFC'
              : 'Leer mi tarjeta NFC'}
        </button>
      ) : (
        <div className="card stack">
          <Smartphone size={28} />
          <h3>
            {window.isSecureContext ? 'Prueba desde tu Android' : 'Abre una dirección segura'}
          </h3>
          <p>
            {window.isSecureContext
              ? 'Necesitas un celular con NFC y Chrome para esta lectura.'
              : 'Usa HTTPS o, por USB, http://localhost:4174 después de configurar adb reverse.'}
          </p>
        </div>
      )}
      {busy && (
        <button className="button secondary" onClick={() => controller.current?.abort()}>
          <X size={18} />
          Cancelar lectura
        </button>
      )}
      {error && (
        <div className="card nfc-error" role="alert">
          <h3>No pudimos completar la lectura</h3>
          <p>{error}</p>
        </div>
      )}
      {reading && (
        <div className="card stack nfc-result" role="status">
          <div className="row">
            <CheckCircle2 size={25} />
            <h3>Tu tarjeta respondió</h3>
          </div>
          <dl>
            <div>
              <dt>UID de la tarjeta</dt>
              <dd>{reading.uid || 'Chrome no expuso el UID'}</dd>
            </div>
            <div>
              <dt>Registros NDEF</dt>
              <dd>
                {reading.recordTypes.length
                  ? reading.recordTypes.join(' · ')
                  : 'Mensaje NDEF vacío'}
              </dd>
            </div>
            <div>
              <dt>Hora de lectura</dt>
              <dd>{new Date(reading.readAt).toLocaleTimeString('es-BO')}</dd>
            </div>
          </dl>
          {reading.records.map((record, i) => (
            <div className="nfc-record" key={i}>
              <small>Contenido {i + 1}</small>
              <pre>{record.length > 4096 ? record.slice(0, 4096) + '…' : record}</pre>
            </div>
          ))}
          <p className="footnote">
            Lectura realizada en este dispositivo. Esta prueba no registra visitas ni acredita
            puntos.
          </p>
        </div>
      )}
      <div className="card row nfc-privacy">
        <ShieldCheck size={23} />
        <p>Solo lectura. No modificamos tu tarjeta ni enviamos su contenido.</p>
      </div>
      <p className="footnote">
        Activa NFC, pulsa Leer y después acerca la tarjeta. Web NFC admite etiquetas NDEF; algunas
        tarjetas usadas por la app nativa no son compatibles con el navegador.
      </p>
      <Link className="button ghost" to="/">
        Volver a Fexpo
      </Link>
    </div>
  );
}
