import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Map,
  Scan,
  Flag,
  UserRound,
  QrCode,
  Bell,
  ArrowLeft,
  WifiOff,
  Download,
  X,
  Sun,
  Moon,
  Monitor,
  ArrowUpRight,
} from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useDemo, useUI, pointsFor } from '@/state/demo';
import { Points } from './components';
import { useTheme } from './theme';

const tabs = [
  { path: '/', label: 'Inicio', icon: Home },
  { path: '/map', label: 'Mapa', icon: Map },
  { path: '/scan', label: 'Check-in', icon: Scan },
  { path: '/missions', label: 'Misiones', icon: Flag },
  { path: '/profile', label: 'Perfil', icon: UserRound },
];
const titles: Record<string, string> = {
  '/map': 'Mapa',
  '/scan': 'Check-in',
  '/missions': 'Misiones',
  '/profile': 'Perfil',
  '/stands': 'Stands',
  '/my-qr': 'Mi código QR',
  '/rewards': 'Premios',
  '/notifications': 'Avisos',
};
interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

export function Shell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const state = useDemo();
  const toast = useUI((s) => s.toast);
  const notify = useUI((s) => s.notify);
  const { mode, setMode } = useTheme();
  const [online, setOnline] = useState(navigator.onLine);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [installHidden, setInstallHidden] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const secondary = !tabs.some((tab) => tab.path === pathname);
  const title =
    titles[pathname] ??
    (pathname.startsWith('/stands/')
      ? 'Perfil del stand'
      : pathname.startsWith('/events/')
        ? 'La feria'
        : 'Fexpo');
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    const available = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    const installed = () => setInstall(null);
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    window.addEventListener('beforeinstallprompt', available);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
      window.removeEventListener('beforeinstallprompt', available);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = `${pathname === '/' ? 'Inicio' : title} · Fexpo`;
  }, [pathname, title]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => notify(''), 4500);
    return () => clearTimeout(timer);
  }, [toast, notify]);
  const unread = state.notices.filter((n) => !n.read).length;
  return (
    <div className="preview-stage">
      <aside className="preview-rail">
        <Link to="/" className="preview-brand">
          <span className="brand-mark">F</span>Fexpo<span className="preview-tag">PWA</span>
        </Link>
        <div>
          <span className="eyebrow">TU FERIA, A TU RITMO</span>
          <h1>
            Descubre.
            <br />
            Conecta.
            <br />
            Vuelve por más.
          </h1>
          <p>
            El mismo Fexpo.
            <br />
            Ahora, desde tu navegador.
          </p>
        </div>
        <nav aria-label="Navegación de escritorio">
          {tabs.map((tab) => (
            <NavLink end={tab.path === '/'} to={tab.path} key={tab.path}>
              <tab.icon size={20} />
              {tab.label}
              <ArrowUpRight size={15} />
            </NavLink>
          ))}
        </nav>
        <div className="preview-bottom">
          <span className="preview-tag">Prototipo visual</span>
          <p>
            Datos de demostración.
            <br />
            Backend y NFC en la siguiente etapa.
          </p>
          <div className="desktop-themes">
            {(
              [
                { key: 'system', icon: Monitor, label: 'Sistema' },
                { key: 'light', icon: Sun, label: 'Claro' },
                { key: 'dark', icon: Moon, label: 'Oscuro' },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                aria-label={`Tema ${item.label}`}
                aria-pressed={mode === item.key}
                onClick={() => setMode(item.key)}
              >
                <item.icon size={18} />
              </button>
            ))}
          </div>
        </div>
      </aside>
      <div className="app-shell">
        <a className="skip-link" href="#content">
          Ir al contenido
        </a>
        <header className="app-header">
          {secondary ? (
            <button
              className="icon-button back"
              aria-label="Volver"
              onClick={() => {
                if (window.history.state?.idx > 0) navigate(-1);
                else navigate('/');
              }}
            >
              <ArrowLeft size={23} />
            </button>
          ) : pathname === '/' ? (
            <Link to="/" className="brand-mark" aria-label="Fexpo, inicio">
              F
            </Link>
          ) : null}
          <span className="header-title">{title}</span>
          <Points value={pointsFor(state.visits, state.redeemed)} />
          <Link
            className="icon-button bell-button"
            to="/notifications"
            aria-label={`Avisos${unread ? `, ${unread} sin leer` : ''}`}
          >
            <Bell size={21} />
            {unread > 0 && <i className="unread-dot" />}
          </Link>
          <Link className="icon-button qr-button" to="/my-qr" aria-label="Mi código QR">
            <QrCode size={22} />
          </Link>
        </header>
        {!online && (
          <div className="offline-banner" role="status">
            <WifiOff size={15} />
            Sin conexión · puedes explorar la vista previa
          </div>
        )}
        <main id="content" className="page" key={pathname}>
          {state.hydrated ? (
            <Outlet />
          ) : (
            <div className="loading-view" role="status" aria-label="Cargando tu recorrido">
              <span />
              <span />
              <span />
            </div>
          )}
        </main>
        <nav className="bottom-nav" aria-label="Navegación principal">
          {tabs.map((tab) => (
            <NavLink
              end={tab.path === '/'}
              to={tab.path}
              className={({ isActive }) =>
                `nav-item ${tab.path === '/scan' ? 'scan-nav' : ''} ${isActive ? 'active' : ''}`
              }
              key={tab.path}
            >
              <span>
                <tab.icon size={23} strokeWidth={2} />
              </span>
              <small>{tab.label}</small>
            </NavLink>
          ))}
        </nav>
        {toast && (
          <div className="toast" role="status">
            {toast}
            <button aria-label="Cerrar mensaje" onClick={() => notify('')}>
              <X size={17} />
            </button>
          </div>
        )}
        {install && !installHidden && (
          <div className="install-banner">
            <Download size={21} />
            <span>
              <strong>Fexpo, siempre a mano</strong>
              <small>Agrega la app a tu pantalla de inicio.</small>
            </span>
            <button
              onClick={async () => {
                await install.prompt();
                await install.userChoice;
                setInstall(null);
              }}
            >
              Instalar
            </button>
            <button
              className="icon-button"
              aria-label="Ocultar instalación"
              onClick={() => setInstallHidden(true)}
            >
              <X size={17} />
            </button>
          </div>
        )}
        {needRefresh && (
          <div className="install-banner" role="status">
            <span>
              <strong>Hay una nueva versión</strong>
              <small>Actualiza cuando termines tu recorrido.</small>
            </span>
            <button onClick={() => void updateServiceWorker(true)}>Actualizar</button>
            <button
              className="icon-button"
              aria-label="Actualizar después"
              onClick={() => setNeedRefresh(false)}
            >
              <X size={17} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
