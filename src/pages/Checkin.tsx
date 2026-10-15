import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Check,
  CheckCircle2,
  Nfc as Contactless,
  Info,
  QrCode,
  Scan,
  Smartphone,
} from 'lucide-react';
import { STANDS } from '@/data/demo-data';
import { useDemo, type Receipt } from '@/state/demo';
import { Art, Modal, Pill, CircleStar } from '@/ui/components';

export function WalletPass({
  busy = false,
  success = false,
}: {
  busy?: boolean;
  success?: boolean;
}) {
  return (
    <div className={`wallet-stack ${busy ? 'reading' : ''} ${success ? 'scanned' : ''}`}>
      <div className="wallet-layer gold-layer" />
      <div className="wallet-layer blue-layer" />
      <div className="wallet-card">
        <div className="row">
          <strong>Fexpo</strong>
          <small>PASE DE FERIA</small>
        </div>
        <span className="chip">
          <i />
          <i />
          <i />
        </span>
        <Art name="checkin" size={126} className="wallet-phone" />
        <div className="wallet-copy">
          <small>ACERCA · DESCUBRE</small>
          <strong>Tu próxima experiencia</strong>
        </div>
        {success && <CheckCircle2 className="wallet-check" size={26} />}
      </div>
    </div>
  );
}
export function CheckinPage() {
  const [params] = useSearchParams();
  const state = useDemo();
  const [target, setTarget] = useState(
    params.get('stand') ??
      STANDS.find((s) => !state.visits.some((v) => v.standId === s.id))?.id ??
      STANDS[0].id,
  );
  const [phase, setPhase] = useState<'ready' | 'reading' | 'success'>('ready');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [info, setInfo] = useState(false);
  const [choose, setChoose] = useState(false);
  const [award, setAward] = useState(0);
  const [duplicate, setDuplicate] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function cancel() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setPhase('ready');
  }
  function simulate() {
    if (!STANDS.some((s) => s.id === target)) return;
    setPhase('reading');
    timer.current = setTimeout(() => {
      const result = useDemo.getState().visit(target);
      timer.current = null;
      if (!result) {
        setPhase('ready');
        return;
      }
      setAward(result.points);
      setDuplicate(result.duplicate);
      setPhase('success');
      setReceipt(result);
    }, 1600);
  }
  const stand = STANDS.find((s) => s.id === target);
  const receiptStand = STANDS.find((s) => s.id === receipt?.standId);
  return (
    <div className="stack checkin-page">
      <div className="checkin-stage">
        <div className="row checkin-eyebrow">
          <span>TU PASE A LA FERIA</span>
          <button
            className="icon-button"
            aria-label="Información del check-in"
            onClick={() => setInfo(true)}
          >
            <Info size={19} />
          </button>
        </div>
        <WalletPass busy={phase === 'reading'} success={phase === 'success'} />
        <div className="checkin-status" aria-live="polite">
          <h2>
            {phase === 'success'
              ? duplicate
                ? 'Ya la tenías registrada'
                : '¡Visita registrada!'
              : 'Acerca. Conecta. Descubre.'}
          </h2>
          {phase === 'success' ? (
            <>
              <span className="award-pill">
                <CircleStar size={23} />
                {award ? `+${award} puntos` : 'Sin puntos duplicados'}
              </span>
              <Pill>
                <CheckCircle2 size={16} />
                {duplicate ? 'Visita ya registrada' : 'Visita simulada'}
              </Pill>
            </>
          ) : (
            <>
              <p>
                Tu próxima conexión empieza
                <br />
                con un pequeño gesto.
              </p>
              <Pill>Vista previa · sin lectura NFC real</Pill>
            </>
          )}
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
      {state.signedIn ? (
        <>
          <button
            className="button scan-button"
            onClick={simulate}
            disabled={phase === 'reading' || !stand}
          >
            <Contactless size={22} />
            {phase === 'success' ? 'Simular otra lectura' : 'Simular lectura NFC'}
          </button>
          <div className="checkin-actions">
            <button className="button secondary" onClick={() => setChoose(true)}>
              <Smartphone size={21} />
              Elegir stand
            </button>
            <Link className="button outline" to="/my-qr">
              <QrCode size={21} />
              Mi QR
            </Link>
          </div>
          <small className="scan-target">
            Prueba con <strong>{stand?.name ?? 'un stand de la demo'}</strong>
          </small>
        </>
      ) : (
        <div className="card">
          <h3>Activa tu sesión demo</h3>
          <p>Personaliza el perfil para probar el recorrido de una visita.</p>
          <Link className="button" to="/profile">
            Ir a mi perfil
          </Link>
        </div>
      )}
      {choose && (
        <Modal title="Elige tu próxima parada" onClose={() => setChoose(false)}>
          <p>Selecciona un stand para simular la lectura de su tarjeta.</p>
          {STANDS.map((s) => (
            <button
              className="stand-option"
              key={s.id}
              onClick={() => {
                setTarget(s.id);
                setPhase('ready');
                setChoose(false);
              }}
            >
              <span className="grow">
                <strong>{s.name}</strong>
                <small>Stand {s.boothCode}</small>
              </span>
              {state.visits.some((v) => v.standId === s.id) && <Check size={18} />}
            </button>
          ))}
        </Modal>
      )}
      {info && (
        <Modal title="Un gesto, una nueva conexión" onClose={() => setInfo(false)}>
          <Art name="checkin" size={110} />
          <p>
            En la experiencia final, acercarás tu celular a la tarjeta del stand o usarás su código
            QR.
          </p>
          <p>
            Ahora puedes probar la animación y el comprobante con una lectura simulada. No se
            utiliza la antena NFC ni se envían datos.
          </p>
          <button className="button" onClick={() => setInfo(false)}>
            Entendido
          </button>
        </Modal>
      )}
      {phase === 'reading' && (
        <Modal title="Buscando la tarjeta…" onClose={cancel}>
          <div className="reading-animation">
            <span />
            <span />
            <Scan size={46} />
          </div>
          <h3 className="text-center">Simulando una lectura NFC</h3>
          <p className="text-center">Un momento. Estamos preparando tu comprobante demo.</p>
          <button className="button secondary" onClick={cancel}>
            Cancelar lectura
          </button>
        </Modal>
      )}
      {receipt && receiptStand && (
        <Modal
          title={receipt.duplicate ? 'Visita ya registrada' : '¡Una nueva conexión!'}
          onClose={() => setReceipt(null)}
        >
          <div className="visit-ticket">
            <div className="row">
              <span className="ticket-brand">Fexpo</span>
              <CheckCircle2 size={30} />
            </div>
            <span className="ticket-award">
              {receipt.duplicate ? 'Ya registrada' : `+${receipt.points}`}
              <small>
                {receipt.duplicate ? 'No se suman puntos de nuevo' : 'puntos de demostración'}
              </small>
            </span>
            <div className="ticket-perforation" />
            <dl>
              <div>
                <dt>Stand</dt>
                <dd>{receiptStand.name}</dd>
              </div>
              <div>
                <dt>Ubicación</dt>
                <dd>{receiptStand.boothCode}</dd>
              </div>
              <div>
                <dt>Feria</dt>
                <dd>FIPAZ 2026</dd>
              </div>
              <div>
                <dt>Método</dt>
                <dd>Lectura simulada</dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>
                  {new Date(receipt.at).toLocaleString('es-BO', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </dd>
              </div>
            </dl>
            <Pill>Comprobante demo · sin validez real</Pill>
          </div>
          <Link
            className="button secondary"
            to={`/stands/${receiptStand.id}`}
            onClick={() => setReceipt(null)}
          >
            Ver stand
          </Link>
          <button className="button" onClick={() => setReceipt(null)}>
            Listo
          </button>
        </Modal>
      )}
    </div>
  );
}
