import { RefreshCw, WifiOff } from 'lucide-react';
import { useLive, loadCatalog, syncProgress } from '@/state/live';
import { LIVE } from '@/services/config';
export function ConnectionStatus() {
  const s = useLive();
  if (!LIVE) return null;
  const error = s.error || s.progressError;
  if (!error && !s.catalogLoading) return null;
  return (
    <div className="connection-status card" role="status">
      <WifiOff size={19} />
      <span className="grow">
        <strong>{s.catalogLoading ? 'Conectando con la feria…' : 'Conexión pendiente'}</strong>
        <small>
          {error || 'Preparando los stands y el mapa.'}
          {error && s.stands.length > 0 && ' Puedes explorar la última información guardada.'}
        </small>
      </span>
      {!s.catalogLoading && (
        <button
          className="icon-button"
          aria-label="Reintentar conexión"
          onClick={() => {
            void loadCatalog();
            void syncProgress();
          }}
        >
          <RefreshCw size={19} />
        </button>
      )}
    </div>
  );
}
