import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Nfc, QrCode, Scan } from 'lucide-react';
import { WalletPass } from './Checkin';
import { readNfc, nfcAvailable } from '@/services/nfc';
import { EVENT_ID } from '@/services/config';
import { registerNfc, useLive, message } from '@/state/live';
import { audioFeedback } from '@/features/audio/feedback';
import { useFeedback } from '@/features/audio/AudioHost';
import { Empty, Modal, Pill } from '@/ui/components';

type Receipt = {
  status: 'confirmed' | 'pending';
  points: number | null;
  duplicate: boolean;
  requestKey: string;
  standId: string;
};
export function StandTagLink() {
  const { event, stand } = useParams();
  if (event !== EVENT_ID)
    return (
      <Empty title="Esta tarjeta pertenece a otra feria">
        Abre el enlace del evento correcto para continuar.
      </Empty>
    );
  // A link identifies the stand; it never substitutes for the NFC credential.
  return <Navigate to={`/scan?stand=${encodeURIComponent(stand || '')}`} replace />;
}
export function LiveCheckin() {
  const [params] = useSearchParams();
  const s = useLive();
  const target = params.get('stand') || params.get('standId') || undefined;
  const [phase, setPhase] = useState<'ready' | 'reading' | 'sending' | 'done'>('ready');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const busy = phase === 'reading' || phase === 'sending';
  const available = nfcAvailable();
  useEffect(() => {
    mounted.current = true;
    const hide = () => {
      if (document.hidden) {
        controller.current?.abort();
        setPhase((p) => (p === 'reading' ? 'ready' : p));
      }
    };
    document.addEventListener('visibilitychange', hide);
    return () => {
      mounted.current = false;
      controller.current?.abort();
      useFeedback.getState().holdNotices(false);
      document.removeEventListener('visibilitychange', hide);
    };
  }, []);
  useEffect(() => {
    controller.current?.abort();
    setPhase('ready');
    setError('');
    setReceipt(null);
    useFeedback.getState().holdNotices(false);
  }, [target, s.user?.id]);
  function cancel() {
    controller.current?.abort();
    setPhase('ready');
  }
  function closeReceipt() {
    setReceipt(null);
    useFeedback.getState().holdNotices(false);
  }
  async function scan() {
    if (controller.current || s.status !== 'signedIn') return;
    const currentUser = s.user?.id;
    const abort = new AbortController();
    controller.current = abort;
    setError('');
    setPhase('reading');
    try {
      const reading = await readNfc(abort.signal, target);
      abort.abort();
      if (!mounted.current || useLive.getState().user?.id !== currentUser) return;
      audioFeedback.request('nfcRead');
      setPhase('sending');
      useFeedback.getState().holdNotices(true);
      const result = await registerNfc(reading.standId, reading.credential);
      if (!mounted.current || useLive.getState().user?.id !== currentUser) return;
      setReceipt({
        status: result.status,
        points: result.response?.pointsAwarded ?? null,
        duplicate: result.response?.dailyDuplicate || false,
        requestKey: result.requestKey,
        standId: reading.standId,
      });
      setPhase('done');
    } catch (e) {
      if (!mounted.current) return;
      useFeedback.getState().holdNotices(false);
      setPhase('ready');
      if (!(e instanceof DOMException && e.name === 'AbortError'))
        setError(
          e instanceof DOMException && e.name === 'NotAllowedError'
            ? 'No se concedió permiso NFC. Puedes intentarlo de nuevo o usar Mi QR.'
            : message(e),
        );
    } finally {
      abort.abort();
      controller.current = null;
    }
  }
  const selected = s.stands.find((stand) => stand.id === target);
  return (
    <div className="stack checkin-page">
      <div className="checkin-stage">
        <div className="checkin-eyebrow">TU PASE A LA FERIA</div>
        <WalletPass busy={busy} success={phase === 'done'} />
        <div className="checkin-status" aria-live="polite">
          <h2>
            {phase === 'sending'
              ? 'Confirmando tu visita…'
              : phase === 'done'
                ? 'Una nueva conexión.'
                : 'Acerca. Conecta. Descubre.'}
          </h2>
          <p>{selected ? selected.name : 'Acerca tu celular a la tarjeta del stand.'}</p>
          <Pill>
            {available
              ? 'Lectura NFC disponible'
              : !window.isSecureContext
                ? 'NFC requiere una conexión HTTPS'
                : 'Usa tu QR en este navegador'}
          </Pill>
        </div>
      </div>
      <div className="checkin-steps">
        {['Activa', 'Acerca', 'Confirma'].map((step, i) => (
          <span key={step}>
            <b>{i + 1}</b>
            {step}
          </span>
        ))}
      </div>
      {s.status === 'signedIn' ? (
        <>
          {available && (
            <button className="button scan-button" disabled={busy} onClick={() => void scan()}>
              <Nfc size={22} />
              {busy ? 'Lectura en curso…' : 'Leer tarjeta NFC'}
            </button>
          )}
          <Link className={`button ${available ? 'secondary' : ''}`} to="/my-qr">
            <QrCode size={21} />
            Mostrar Mi QR
          </Link>
          {!available && (
            <p className="footnote">
              Muestra tu QR al personal del stand para registrar la visita. La lectura Web NFC está
              disponible en navegadores Android compatibles.
            </p>
          )}
        </>
      ) : (
        <Link className="button" to="/profile">
          Acceder con Google para registrar visitas
        </Link>
      )}
      {error && (
        <p className="card" role="alert">
          {error}
        </p>
      )}
      {phase === 'reading' && (
        <Modal title="Buscando la tarjeta…" onClose={cancel}>
          <div className="reading-animation">
            <span />
            <span />
            <Scan size={46} />
          </div>
          <h3 className="text-center">Acerca la tarjeta al celular</h3>
          <p>Mantén la pantalla abierta y desbloqueada.</p>
          <button className="button secondary" onClick={cancel}>
            Cancelar lectura
          </button>
        </Modal>
      )}
      {receipt && (
        <Modal
          title={
            receipt.status === 'pending'
              ? 'Visita pendiente'
              : receipt.duplicate
                ? 'Visita ya registrada'
                : '¡Visita registrada!'
          }
          onClose={closeReceipt}
        >
          <div className="visit-ticket">
            <div className="row">
              <strong>Fexpo</strong>
              <CheckCircle2 size={28} />
            </div>
            <span className="ticket-award">
              {receipt.status === 'pending' ? 'Pendiente' : `+${receipt.points}`}
              <small>
                {receipt.status === 'pending'
                  ? 'Sin puntos hasta confirmar'
                  : 'puntos confirmados por la feria'}
              </small>
            </span>
            <div className="ticket-perforation" />
            <p>{s.stands.find((stand) => stand.id === receipt.standId)?.name || 'Stand'}</p>
            <p>
              {receipt.status === 'pending'
                ? 'Guardamos la lectura. La enviaremos cuando vuelva la conexión.'
                : receipt.duplicate
                  ? 'Esta visita ya estaba registrada hoy. No se suman puntos duplicados.'
                  : 'Tu visita fue confirmada por el servidor.'}
            </p>
            <small>Referencia: {receipt.requestKey.slice(0, 8)}</small>
          </div>
          <Link
            className="button secondary"
            to={`/stands/${receipt.standId}`}
            onClick={closeReceipt}
          >
            Ver stand
          </Link>
          <button className="button" onClick={closeReceipt}>
            Listo
          </button>
        </Modal>
      )}
    </div>
  );
}
