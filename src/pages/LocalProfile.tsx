import { useState } from 'react';
import { Bell, Gift, LogOut, Monitor, Moon, Nfc, QrCode, Store, Sun } from 'lucide-react';
import { useLocalAccount } from '@/state/local-account';
import { useExperience } from '@/state/experience';
import { Art, MenuLink, Modal, Pill, SectionTitle } from '@/ui/components';
import { useTheme } from '@/ui/theme';
import { FeedbackPreferences } from '@/features/audio/AudioHost';
export function LocalProfile() {
  const account = useLocalAccount();
  const state = useExperience();
  const { mode, setMode } = useTheme();
  const [closing, setClosing] = useState(false);
  return (
    <div className="stack profile-page">
      <div className="profile-identity">
        <span className="avatar">
          {account.profile?.picture ? (
            <img
              src={account.profile.picture}
              alt=""
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            state.name.slice(0, 2).toUpperCase()
          )}
        </span>
        <span className="grow">
          <strong>{state.name}</strong>
          <small>
            {account.profile?.provider === 'trial'
              ? 'Visitante · modo de prueba'
              : 'Perfil de Google · guardado aquí'}
          </small>
        </span>
        <Pill tone="purple">Modo local</Pill>
      </div>
      <div className="passport live-passport">
        <div className="row passport-top">
          <span>MI PASAPORTE DE FERIA</span>
          <Art name="level" size={58} />
        </div>
        <strong className="passport-title">La feria empieza contigo.</strong>
        <p>Descubre stands y prueba tu tarjeta NFC.</p>
        <div className="passport-stats">
          <span>
            <b>{state.points}</b>
            <small>Puntos demo</small>
          </span>
          <span>
            <b>{state.favorites.length}</b>
            <small>Favoritos</small>
          </span>
          <span>
            <b>{state.visits.length}</b>
            <small>Visitas demo</small>
          </span>
        </div>
      </div>
      <div className="card menu-group">
        <MenuLink
          to="/scan"
          icon={Nfc}
          title="Leer mi tarjeta NFC"
          description="Lectura real, sin backend"
        />
        <MenuLink
          to="/stands"
          icon={Store}
          title="Explorar stands"
          description="Catálogo local de demostración"
        />
        <MenuLink to="/missions" icon={Gift} title="Mis premios y misiones" tone="purple" />
        <MenuLink to="/notifications" icon={Bell} title="Mis avisos" />
        <MenuLink
          to="/my-qr"
          icon={QrCode}
          title="Vista previa de Mi QR"
          description="Código demo, sin validez real"
        />
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
      <button className="button ghost" onClick={() => setClosing(true)}>
        <LogOut size={18} />
        Cerrar sesión
      </button>
      <p className="footnote">
        La exploración y los favoritos se guardan en este dispositivo. Los puntos y premios de esta
        versión son de demostración.
      </p>
      {closing && (
        <Modal title="Cerrar sesión" onClose={() => setClosing(false)}>
          <p>Se limpiarán tu perfil y el recorrido local de este dispositivo.</p>
          <button className="button" onClick={() => account.signOut()}>
            Cerrar sesión y limpiar dispositivo
          </button>
        </Modal>
      )}
    </div>
  );
}
