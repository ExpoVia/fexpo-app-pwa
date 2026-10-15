import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { Bell, Gift, LogOut, Monitor, Moon, QrCode, RefreshCw, Store, Sun } from 'lucide-react';
import { useLive, loadQr, message, syncProgress, flushPending } from '@/state/live';
import { Art, Empty, MenuLink, Modal, Pill, Progress, SectionTitle } from '@/ui/components';
import { GoogleLogin } from '@/ui/GoogleLogin';
import { useTheme } from '@/ui/theme';
import { FeedbackPreferences } from '@/features/audio/AudioHost';

export function LiveProfile() {
  const s = useLive();
  const { mode, setMode } = useTheme();
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="stack profile-page">
      <div className="profile-identity">
        <span className="avatar">{s.user?.displayName?.slice(0, 2).toUpperCase() || 'V'}</span>
        <span className="grow">
          <strong>{s.user?.displayName || 'Visitante'}</strong>
          <small>{s.status === 'signedIn' ? 'Tu cuenta · Google' : 'Explora a tu ritmo'}</small>
        </span>
        {s.progress && <Pill tone="purple">Nivel {s.progress.level.number}</Pill>}
      </div>
      {s.status !== 'signedIn' ? (
        s.status === 'loading' ? (
          <p role="status">Comprobando tu sesión…</p>
        ) : (
          <GoogleLogin />
        )
      ) : (
        <>
          <div className="passport live-passport">
            <div className="row passport-top">
              <span>MI PASAPORTE DE FERIA</span>
              <Art name="level" size={58} />
            </div>
            <strong className="passport-title">Cada visita cuenta.</strong>
            <p>Descubre, conecta y desbloquea experiencias.</p>
            <div className="passport-stats">
              <span>
                <b>{s.progress?.pointsBalance ?? '—'}</b>
                <small>Puntos</small>
              </span>
              <span>
                <b>{s.visits.length}</b>
                <small>Stands</small>
              </span>
              <span>
                <b>{s.streak?.currentStreak ?? '—'}</b>
                <small>Días de racha</small>
              </span>
            </div>
          </div>
          <MenuLink
            to="/my-qr"
            icon={QrCode}
            title="Mi código QR"
            description="Tu pase para registrar visitas"
          />
        </>
      )}
      <div className="card menu-group">
        <MenuLink
          to="/stands"
          icon={Store}
          title="Explorar stands"
          description="Empresas y experiencias"
        />
        <MenuLink to="/missions" icon={Gift} title="Mi progreso y premios" tone="purple" />
        <MenuLink to="/notifications" icon={Bell} title="Mis avisos" />
      </div>
      <SectionTitle>Apariencia</SectionTitle>
      <div className="theme-switch" role="group" aria-label="Apariencia">
        {(
          [
            { key: 'system', label: 'Sistema', icon: Monitor },
            { key: 'light', label: 'Claro', icon: Sun },
            { key: 'dark', label: 'Oscuro', icon: Moon },
          ] as const
        ).map((item) => (
          <button key={item.key} aria-pressed={mode === item.key} onClick={() => setMode(item.key)}>
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </div>
      <SectionTitle>Audio y vibración</SectionTitle>
      <FeedbackPreferences />
      {s.status === 'signedIn' && (
        <>
          <SectionTitle>Mi recorrido</SectionTitle>
          {s.visits.length ? (
            <div className="card menu-group">
              {s.visits.map((v) => (
                <Link className="menu-link" key={v.visitId} to={`/stands/${v.standId}`}>
                  <Art name="contact" size={38} />
                  <span className="grow">
                    <strong>{v.standName}</strong>
                    <small>
                      {v.boothCode} · {new Date(v.visitedAt).toLocaleDateString('es-BO')}
                    </small>
                  </span>
                  <Pill tone="green">+{v.pointsAwarded}</Pill>
                </Link>
              ))}
            </div>
          ) : (
            <Empty title="Tu primera parada te espera">
              Tus visitas confirmadas aparecerán aquí.
            </Empty>
          )}
          {!!s.pending.length && (
            <div className="card stack">
              <h3>Visitas pendientes · {s.pending.length}</h3>
              <p>
                Se enviarán al recuperar conexión. Los puntos se muestran después de la
                confirmación.
              </p>
              {s.pending.map((job) => (
                <p key={job.requestKey}>
                  {s.stands.find((stand) => stand.id === job.standId)?.name || 'Stand'} ·{' '}
                  {job.error || 'Pendiente de envío'}
                </p>
              ))}
              <button className="button secondary" onClick={() => void flushPending()}>
                Enviar pendientes
              </button>
            </div>
          )}
          <button
            className="button secondary"
            disabled={s.syncing}
            onClick={() => void syncProgress()}
          >
            <RefreshCw size={18} />
            {s.syncing ? 'Actualizando…' : 'Actualizar recorrido'}
          </button>
          <button className="button ghost" onClick={() => setClosing(true)}>
            <LogOut size={18} />
            Cerrar sesión
          </button>
          {s.syncedAt && (
            <p className="footnote">
              Última actualización: {new Date(s.syncedAt).toLocaleString('es-BO')}
            </p>
          )}
        </>
      )}
      {closing && (
        <Modal
          title="Cerrar sesión"
          onClose={() => {
            if (!busy) setClosing(false);
          }}
        >
          <p>
            Se borrarán de este dispositivo el QR, el recorrido guardado y las visitas pendientes de
            envío.
            {s.pending.length
              ? ` Tienes ${s.pending.length} visitas pendientes; envíalas antes para conservarlas.`
              : ''}
          </p>
          <button
            className="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await s.signOut();
              window.google?.accounts.id.disableAutoSelect();
              setClosing(false);
              setBusy(false);
            }}
          >
            {busy ? 'Cerrando…' : 'Cerrar sesión y limpiar dispositivo'}
          </button>
          <button className="button secondary" disabled={busy} onClick={() => setClosing(false)}>
            Seguir explorando
          </button>
        </Modal>
      )}
    </div>
  );
}
export function LiveQr() {
  const s = useLive();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fetchQr = async () => {
    setBusy(true);
    setError('');
    try {
      await loadQr();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (s.status === 'signedIn') void fetchQr();
  }, [s.user?.id]);
  if (s.status !== 'signedIn')
    return (
      <Empty
        title="Tu pase te está esperando"
        art="my-qr"
        action={
          <Link className="button" to="/profile">
            Acceder con Google
          </Link>
        }
      >
        Inicia sesión para mostrar tu QR personal.
      </Empty>
    );
  return (
    <div className="stack">
      <div className="qr-pass">
        <h2>Muéstralo en el stand</h2>
        <p>El personal registrará tu visita.</p>
        {s.qr ? (
          <>
            <div className="qr-paper">
              <QRCode
                value={s.qr.token}
                size={236}
                bgColor="#fff"
                fgColor="#123f59"
                title="Tu QR personal de Fexpo"
              />
            </div>
            <span className="qr-perforation" />
            <small>MI PASE DE FERIA</small>
            <strong>{s.user?.displayName}</strong>
          </>
        ) : (
          <Art name="my-qr" size={140} />
        )}
      </div>
      {error && (
        <p className="card" role="alert">
          {error}
          {s.qr && ' Estás viendo tu último QR guardado.'}
        </p>
      )}
      <button className="button secondary" disabled={busy} onClick={() => void fetchQr()}>
        <RefreshCw size={18} />
        {busy ? 'Preparando pase…' : 'Actualizar QR'}
      </button>
      <p className="footnote">
        Mantén esta pantalla abierta. El progreso se actualizará cuando el stand confirme la visita.
      </p>
    </div>
  );
}
export function LiveMissions({ rewards = false }: { rewards?: boolean }) {
  const s = useLive();
  const p = s.progress;
  return (
    <div className="stack">
      <div className="mission-hero">
        <div className="row">
          <span className="grow">
            <b>{p?.pointsBalance ?? '—'}</b>
            <p>puntos confirmados</p>
          </span>
          <Art name="level" size={72} />
        </div>
        <strong>
          {p
            ? `Nivel ${p.level.number} · ${p.level.name || 'Explorador'}`
            : 'Tu recorrido en la feria'}
        </strong>
        {p?.level.nextLevelScore != null && (
          <>
            <Progress
              value={p.rankingScore}
              total={p.level.nextLevelScore}
              label="Progreso al siguiente nivel"
            />
            <small>
              {Math.max(0, p.level.nextLevelScore - p.rankingScore)} de score para el siguiente
              nivel
            </small>
          </>
        )}
      </div>
      {s.status !== 'signedIn' && (
        <Link className="button" to="/profile">
          Acceder con Google
        </Link>
      )}
      <div className="card row">
        <Art name="explorer" size={56} />
        <span className="grow">
          <strong>{s.visits.length} stands visitados</strong>
          <small>
            {s.streak
              ? `${s.streak.currentStreak} días de racha · mejor racha: ${s.streak.bestStreak}`
              : 'Cada nueva conexión, una experiencia.'}
          </small>
        </span>
      </div>
      <Empty
        title={rewards ? 'Los premios llegarán aquí' : 'Nuevos retos por descubrir'}
        art={rewards ? 'rewards' : 'missions'}
      >
        Los organizadores publicarán{' '}
        {rewards ? 'los premios y sus condiciones de canje' : 'las misiones disponibles'}. Mientras
        tanto, sigue explorando los stands.
      </Empty>
      <Link className="button secondary" to="/stands">
        Explorar stands
      </Link>
    </div>
  );
}
