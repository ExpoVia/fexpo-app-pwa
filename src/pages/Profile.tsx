import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Check,
  ChevronRight,
  Nfc as Contactless,
  Gift,
  LogOut,
  MapPin,
  Monitor,
  Moon,
  Pencil,
  QrCode,
  RotateCcw,
  Store,
  Sun,
} from 'lucide-react';
import { STANDS } from '@/data/demo-data';
import { MISSIONS } from '@/data/missions';
import { useDemo, levelFor, missionValue, pointsFor } from '@/state/demo';
import { Art, Empty, MenuLink, Modal, Pill, SectionTitle } from '@/ui/components';
import { useTheme } from '@/ui/theme';

export function ProfilePage() {
  const state = useDemo();
  const { mode, setMode } = useTheme();
  const [flipped, setFlipped] = useState(false);
  const [modal, setModal] = useState<'edit' | 'reset' | 'logout' | null>(null);
  const [name, setName] = useState(state.name);
  const completed = MISSIONS.filter((m) => missionValue(m, state.visits) >= m.target).length;
  const initials = state.signedIn
    ? state.name
        .split(' ')
        .slice(0, 2)
        .map((s) => s[0])
        .join('')
        .toUpperCase()
    : 'V';
  return (
    <div className="stack profile-page">
      <div className="profile-identity">
        <span className="avatar">{initials}</span>
        <span className="grow">
          <strong>{state.signedIn ? state.name : 'Visitante'}</strong>
          <small>{state.signedIn ? 'Tu cuenta · Demostración' : 'Explora a tu ritmo'}</small>
        </span>
        <Pill tone="purple">Nivel {levelFor(state.visits)}</Pill>
      </div>
      <button
        className={`passport flip-card ${flipped ? 'flipped' : ''}`}
        aria-label={flipped ? 'Ver frente de mi pasaporte' : 'Ver detalles de mi pasaporte'}
        aria-pressed={flipped}
        onClick={() => setFlipped((v) => !v)}
      >
        <span className="flip-inner">
          <span className="flip-front">
            <span className="row passport-top">
              <span>MI PASAPORTE DE FERIA</span>
              <Contactless size={22} />
            </span>
            <span className="row">
              <span className="grow">
                <strong className="passport-title">Cada visita cuenta.</strong>
                <span className="passport-description">
                  Descubre, conecta y desbloquea experiencias.
                </span>
              </span>
              <Art name="level" size={60} />
            </span>
            <span className="passport-stats">
              {[
                { value: pointsFor(state.visits, state.redeemed), label: 'Puntos' },
                {
                  value: state.visits.length,
                  label: state.visits.length === 1 ? 'Stand' : 'Stands',
                },
                { value: completed, label: completed === 1 ? 'Misión' : 'Misiones' },
              ].map((item) => (
                <span key={item.label}>
                  <b>{item.value}</b>
                  <small>{item.label}</small>
                </span>
              ))}
            </span>
          </span>
          <span className="flip-back">
            <span className="row">
              <strong>Tu recorrido en Fexpo</strong>
              <RotateCcw size={20} />
            </span>
            <span>
              {Math.max(0, [150, 300, 500].find((n) => n > state.visits.length * 50) ?? 500) -
                state.visits.length * 50 >
              0
                ? `${([150, 300, 500].find((n) => n > state.visits.length * 50) ?? 500) - state.visits.length * 50} puntos demo para tu próximo nivel.`
                : '¡Alcanzaste el nivel más alto de la demo!'}
            </span>
            <span className="passport-stamps">
              {STANDS.map((stand) => (
                <i
                  key={stand.id}
                  className={state.visits.some((v) => v.standId === stand.id) ? 'visited' : ''}
                >
                  <Store size={19} />
                </i>
              ))}
            </span>
            <small>
              {state.visits.length} de {STANDS.length} stands visitados
            </small>
          </span>
        </span>
      </button>
      <Link to="/my-qr" className="qr-profile">
        <QrCode size={31} />
        <span className="grow">
          <strong>Mi código QR</strong>
          <small>Tu pase para registrar visitas</small>
        </span>
        <ChevronRight size={20} />
      </Link>
      <div className="card menu-group">
        <MenuLink
          to="/stands"
          icon={Store}
          title="Explorar stands"
          description="Empresas, productos y experiencias"
        />
        <MenuLink to="/missions" icon={Gift} title="Mis premios y misiones" tone="purple" />
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
      <SectionTitle>Mi recorrido</SectionTitle>
      {state.visits.length ? (
        <div className="card menu-group">
          {[...state.visits].reverse().map((visit) => {
            const stand = STANDS.find((s) => s.id === visit.standId);
            return (
              <Link className="menu-link" key={visit.standId} to={`/stands/${visit.standId}`}>
                <span className="menu-icon green">
                  <Check size={20} />
                </span>
                <span className="grow">
                  <strong>{stand?.name}</strong>
                  <small>
                    {new Date(visit.at).toLocaleDateString('es-BO', {
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    · Stand {stand?.boothCode}
                  </small>
                </span>
                <Pill tone="green">+{visit.points}</Pill>
              </Link>
            );
          })}
        </div>
      ) : (
        <Empty title="Tu primera parada te espera">Las visitas que simules aparecerán aquí.</Empty>
      )}
      <div className="profile-actions">
        <button
          onClick={() => {
            setName(state.name);
            setModal('edit');
          }}
        >
          <Pencil size={17} />
          {state.signedIn ? 'Editar perfil demo' : 'Activar sesión demo'}
        </button>
        {state.signedIn && (
          <button onClick={() => setModal('logout')}>
            <LogOut size={17} />
            Cerrar sesión demo
          </button>
        )}
        <button onClick={() => setModal('reset')}>
          <RotateCcw size={17} />
          Reiniciar recorrido demo
        </button>
      </div>
      <p className="footnote">
        <MapPin size={13} /> FIPAZ · La Paz, Bolivia
        <br />
        Vista previa visual. No hay una sesión de Google real.
      </p>
      {modal === 'edit' && (
        <Modal title="Tu perfil demo" onClose={() => setModal(null)}>
          <p>Personaliza el nombre que aparece en este dispositivo.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              state.signIn(name);
              setModal(null);
            }}
          >
            <label className="field">
              Nombre
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                required
                autoComplete="name"
              />
            </label>
            <button className="button" type="submit">
              Guardar perfil demo
            </button>
          </form>
        </Modal>
      )}
      {modal === 'reset' && (
        <Modal title="¿Empezamos de nuevo?" onClose={() => setModal(null)}>
          <p>Se borrarán las visitas, los favoritos y los avisos de esta demostración.</p>
          <button
            className="button"
            onClick={() => {
              state.reset();
              setModal(null);
            }}
          >
            Reiniciar demo
          </button>
          <button className="button secondary" onClick={() => setModal(null)}>
            Seguir explorando
          </button>
        </Modal>
      )}
      {modal === 'logout' && (
        <Modal title="Cerrar sesión demo" onClose={() => setModal(null)}>
          <p>Se limpiará tu recorrido local de demostración.</p>
          <button
            className="button"
            onClick={() => {
              state.signOut();
              setModal(null);
            }}
          >
            Cerrar sesión demo
          </button>
        </Modal>
      )}
    </div>
  );
}
