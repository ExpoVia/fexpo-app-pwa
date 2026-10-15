import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, Nfc } from 'lucide-react';
import { LOCAL } from '@/services/config';
import { useLocalAccount } from '@/state/local-account';

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.03 46.98 31.87 46.98 24.55Z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.7 23.7 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78Z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
      />
    </svg>
  );
}
export function Welcome() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function enterTrial() {
    setBusy(true);
    setError('');
    try {
      await useLocalAccount.getState().enterTrial();
    } catch {
      setBusy(false);
      setError('No se pudo abrir la prueba. Inténtalo de nuevo.');
    }
  }
  return (
    <main className="welcome-screen">
      <img
        className="welcome-backdrop"
        src="/assets/events/fipaz-cover.webp"
        alt=""
        fetchPriority="high"
      />
      <div className="welcome-shade" />
      <header className="welcome-header">
        <span className="welcome-brand">
          <span className="brand-mark">F</span>Fexpo
        </span>
        <span className="welcome-city">LA PAZ · BOLIVIA</span>
      </header>
      <div className="welcome-content">
        <div className="welcome-copy">
          <span className="welcome-kicker">BIENVENIDO A</span>
          <h1>
            FIPAZ
            <span>
              Conecta con
              <br />
              lo que viene.
            </span>
          </h1>
          <p>
            Una feria. Miles de encuentros.
            <br />
            Tu próxima experiencia empieza aquí.
          </p>
        </div>
        <div className="welcome-actions">
          <button
            className="google-connect"
            disabled
            title="Google estará disponible próximamente"
            aria-describedby="google-mock-note"
          >
            <GoogleMark />
            <span>Continuar con Google</span>
            <ArrowUpRight size={19} />
          </button>
          <small id="google-mock-note" className="welcome-google-note">
            Próximamente
          </small>
          <button className="button welcome-try" disabled={busy} onClick={() => void enterTrial()}>
            {busy ? 'Entrando…' : 'Entrar y probar la app'}
            <ArrowRight size={20} />
          </button>
          {error && (
            <p className="welcome-error" role="alert">
              {error}
            </p>
          )}
          <p className="welcome-privacy">
            Explora sin cuenta. Tu prueba se guarda solo en este dispositivo.
          </p>
          <Link className="welcome-nfc" to="/nfc-test">
            <Nfc size={20} />
            Probar mi NFC
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
    </main>
  );
}
export function LocalEntry() {
  const { pathname } = useLocation();
  const account = useLocalAccount();
  if (!LOCAL) return <Outlet />;
  if (!account.ready)
    return <div className="welcome-screen" role="status" aria-label="Preparando Fexpo" />;
  if (!account.profile && pathname !== '/nfc-test') return <Welcome />;
  return <Outlet />;
}
