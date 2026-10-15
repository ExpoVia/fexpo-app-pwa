import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  X,
  Store,
  Compass,
  Plus,
  Minus,
  LocateFixed,
  Layers,
  Nfc,
  ChevronRight,
  RotateCcw,
  Navigation,
  List,
  Info,
  Pause,
} from 'lucide-react';
import { STANDS } from '@/data/demo-data';
import { PLAN_GEOMETRY, PLAN_LOTS } from '@/data/map-plans';
import { CategoryTile, Modal } from '@/ui/components';
import { nfcAvailable, readRawNfc } from '@/services/nfc';
import { audioFeedback } from '@/features/audio/feedback';
import { useCampusLocation } from './location';
import { CAMPUS_POINTS, standAtLot } from './model';
import { useRelativeGps } from './gps';
import IndoorPlan from './IndoorPlan';
import type { CampusCamera } from './IndoorScene';
import './campus.css';
const Scene = lazy(() => import('./IndoorScene'));
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
const buildings = [
  { id: 'red', name: 'Bloque Rojo' },
  { id: 'yellow', name: 'Bloque Amarillo' },
  { id: 'green', name: 'Bloque Verde' },
  { id: 'entrance', name: 'Plaza Akapana' },
  { id: 'food', name: 'Patio de comidas' },
];

export default function CampusMap() {
  const [params, setParams] = useSearchParams();
  const requestedStand = STANDS.find((s) => s.id === params.get('stand'));
  const plan =
    PLAN_GEOMETRY.find((p) => p.id === (params.get('plan') || requestedStand?.planId)) ||
    PLAN_GEOMETRY[0];
  const mode = params.get('view') === '2d' || params.get('view') === 'plans' ? '2d' : '3d';
  const [query, setQuery] = useState(''),
    [selectedLot, setSelectedLot] = useState<number | null>(null);
  const [aerial, setAerial] = useState(false),
    [follow, setFollow] = useState(false),
    [failed, setFailed] = useState(false);
  const [dark, setDark] = useState(document.documentElement.dataset.theme === 'dark');
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [help, setHelp] = useState(false),
    [listing, setListing] = useState(false);
  const camera = useRef<CampusCamera | null>(null),
    abort = useRef<AbortController | null>(null);
  const last = useCampusLocation((s) => s.last),
    gps = useRelativeGps(plan.id);
  const lastPoint = CAMPUS_POINTS.find((p) => p.id === last?.standId && p.planId === plan.id);
  const position = gps.position || (lastPoint ? { x: lastPoint.x, y: lastPoint.y } : plan.origin);
  const lot = selectedLot !== null ? PLAN_LOTS[plan.id][selectedLot] : null;
  const selectedStand = lot ? standAtLot(plan.id, lot[0]) : null;
  const floors = PLAN_GEOMETRY.filter((p) => p.zoneId === plan.zoneId);
  const results = STANDS.filter((s) =>
    norm(`${s.name} ${s.boothCode} ${s.tags.join(' ')}`).includes(norm(query)),
  );
  const [vx, vy, vw, vh] = plan.viewBox.split(' ').map(Number);
  const outside =
    !!gps.position &&
    (position.x < vx || position.x > vx + vw || position.y < vy || position.y > vy + vh);
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setDark(document.documentElement.dataset.theme === 'dark'),
    );
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    const hide = () => {
      if (document.hidden) abort.current?.abort();
    };
    document.addEventListener('visibilitychange', hide);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', hide);
      abort.current?.abort();
    };
  }, []);
  useEffect(() => {
    const stand = STANDS.find((s) => s.id === params.get('stand') && s.planId === plan.id);
    const index = stand
      ? PLAN_LOTS[plan.id].findIndex(([code]) => standAtLot(plan.id, code)?.id === stand.id)
      : -1;
    setSelectedLot(index < 0 ? null : index);
    setAerial(false);
    setFollow(false);
  }, [plan.id, params.get('stand')]);
  const changePlan = (id: string) => {
    setQuery('');
    setSelectedLot(null);
    setParams({ plan: id, view: mode }, { replace: true });
  };
  const changeMode = (view: '2d' | '3d') => {
    setFailed(false);
    setParams(
      { plan: plan.id, view, ...(requestedStand ? { stand: requestedStand.id } : {}) },
      { replace: true },
    );
  };
  const select = (id: string) => {
    const stand = STANDS.find((s) => s.id === id)!;
    setQuery('');
    setListing(false);
    setFollow(false);
    setParams({ plan: stand.planId, view: mode, stand: id }, { replace: true });
  };
  const selectLot = (index: number) => {
    setSelectedLot(index);
    setFollow(false);
  };
  async function locateNfc() {
    if (abort.current) return;
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setMessage('Acerca la tarjeta del stand a la parte trasera del celular.');
    try {
      const reading = await readRawNfc(controller.signal);
      if (controller.signal.aborted) return;
      audioFeedback.request('nfcRead');
      const id = useCampusLocation.getState().locate(reading.records);
      gps.stop(true);
      select(id);
      setMessage('Última etiqueta localizada. Esta lectura no acredita puntos.');
    } catch (e) {
      if (controller.signal.aborted) setMessage('Lectura cancelada.');
      else
        setMessage(
          e instanceof DOMException && e.name === 'NotAllowedError'
            ? 'Permite el acceso a NFC en Chrome.'
            : e instanceof Error
              ? e.message
              : 'No se pudo leer la tarjeta.',
        );
    } finally {
      if (abort.current === controller) {
        abort.current = null;
        setBusy(false);
      }
    }
  }
  const toggleGps = () => {
    if (gps.status === 'active' || gps.status === 'waiting') {
      gps.stop();
      setFollow(false);
    } else {
      setFollow(true);
      gps.start(position);
    }
  };
  return (
    <section className="indoor-experience" aria-label="Mapa interactivo FIPAZ">
      <div className="indoor-toolbar">
        <div className="indoor-search-row">
          <label className="search-field">
            <Search size={18} />
            <input
              aria-label="Buscar stands y empresas"
              placeholder="Buscar stands y empresas"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button aria-label="Limpiar búsqueda" onClick={() => setQuery('')}>
                <X size={18} />
              </button>
            )}
          </label>
          <button
            className="icon-button"
            aria-label="Lista de stands"
            onClick={() => setListing(true)}
          >
            <List size={21} />
          </button>
          <button
            className="icon-button"
            aria-label="Acerca del mapa y GPS"
            onClick={() => setHelp(true)}
          >
            <Info size={20} />
          </button>
        </div>
        <div className="indoor-floor-row">
          <label className="indoor-building">
            <span style={{ background: plan.color }} />
            <select
              aria-label="Pabellón"
              value={plan.zoneId}
              onChange={(e) =>
                changePlan(PLAN_GEOMETRY.find((p) => p.zoneId === e.target.value)!.id)
              }
            >
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <div className="indoor-floor-tabs" aria-label="Planta">
            {floors.map((p) => (
              <button key={p.id} aria-pressed={p.id === plan.id} onClick={() => changePlan(p.id)}>
                {p.level === 'Planta baja'
                  ? 'Baja'
                  : p.level === 'Planta alta'
                    ? 'Alta'
                    : 'Exterior'}
              </button>
            ))}
          </div>
        </div>
        <div className="indoor-plan-title">
          <h2>{plan.name}</h2>
          <small>{PLAN_LOTS[plan.id].length} espacios</small>
        </div>
        {query && (
          <div className="indoor-results">
            <small>{results.length} stands</small>
            {results.length ? (
              results.map((s) => (
                <button key={s.id} onClick={() => select(s.id)}>
                  <span>
                    <strong>{s.name}</strong>
                    <small>{s.boothCode}</small>
                  </span>
                  <ChevronRight size={18} />
                </button>
              ))
            ) : (
              <p>No encontramos ese stand.</p>
            )}
          </div>
        )}
      </div>
      <div
        className="indoor-viewer"
        data-mode={mode}
        data-plan-id={plan.id}
        data-avatar-x={position.x}
        data-avatar-y={position.y}
        data-position-source={gps.position ? 'gps' : lastPoint ? 'nfc' : 'origin'}
      >
        {mode === '2d' ? (
          <IndoorPlan
            plan={plan}
            position={position}
            selectedLot={selectedLot}
            onSelectLot={selectLot}
            cameraRef={camera}
          />
        ) : (
          <Suspense
            fallback={
              <div className="campus-loading" role="status">
                Preparando el plano 3D…
              </div>
            }
          >
            <Scene
              plan={plan}
              dark={dark}
              aerial={aerial}
              position={position}
              follow={follow}
              selectedLot={selectedLot}
              onSelectLot={selectLot}
              cameraRef={camera}
              onFailure={() => {
                setFailed(true);
                setParams({ plan: plan.id, view: '2d' }, { replace: true });
              }}
            />
          </Suspense>
        )}
        {mode === '3d' && (
          <div className="indoor-markers" key={plan.id}>
            {plan.structures
              .filter((s) => s.x !== undefined && s.y !== undefined)
              .map((s, i) => (
                <span
                  className="indoor-service"
                  key={`service-${i}`}
                  data-plan-x={s.x}
                  data-plan-y={s.y}
                  data-elevation=".6"
                >
                  {s.label}
                </span>
              ))}
            {CAMPUS_POINTS.filter((p) => p.planId === plan.id).map((p) => {
              const s = STANDS.find((s) => s.id === p.id)!;
              return (
                <button
                  className="indoor-marker"
                  key={p.id}
                  data-plan-x={p.x}
                  data-plan-y={p.y}
                  aria-label={`Ver ${s.name}, stand ${s.boothCode}`}
                  onClick={() => select(p.id)}
                >
                  <Store size={16} />
                  <span>{s.boothCode}</span>
                </button>
              );
            })}
          </div>
        )}
        <div className="indoor-camera-top">
          {mode === '3d' && (
            <>
              <button aria-label="Girar mapa" onClick={() => camera.current?.rotate()}>
                <Compass size={20} />
              </button>
              <button
                aria-label="Alternar vista aérea"
                aria-pressed={aerial}
                onClick={() => setAerial(!aerial)}
              >
                <Layers size={20} />
              </button>
            </>
          )}
        </div>
        <div className="indoor-zoom">
          <button aria-label="Acercar mapa" onClick={() => camera.current?.zoom(1.2)}>
            <Plus size={22} />
          </button>
          <button aria-label="Alejar mapa" onClick={() => camera.current?.zoom(1 / 1.2)}>
            <Minus size={22} />
          </button>
          <button aria-label="Restablecer mapa" onClick={() => camera.current?.reset()}>
            <RotateCcw size={19} />
          </button>
          <button
            aria-label="Centrar avatar"
            aria-pressed={follow}
            onClick={() => {
              setFollow(!follow);
              camera.current?.follow();
            }}
          >
            <LocateFixed size={21} />
          </button>
        </div>
        <div className="indoor-view-bottom">
          <div className="indoor-modes">
            <button aria-pressed={mode === '2d'} onClick={() => changeMode('2d')}>
              2D
            </button>
            <button aria-pressed={mode === '3d'} onClick={() => changeMode('3d')}>
              3D
            </button>
          </div>
          <button
            className={`indoor-gps ${gps.status === 'active' ? 'active' : ''}`}
            aria-label={
              gps.status === 'active' || gps.status === 'waiting' ? 'Detener GPS' : 'Mi ubicación'
            }
            onClick={toggleGps}
          >
            {gps.status === 'active' || gps.status === 'waiting' ? (
              <Pause size={19} />
            ) : (
              <Navigation size={19} />
            )}
            <span>
              {gps.status === 'waiting'
                ? 'Buscando GPS…'
                : gps.status === 'active'
                  ? 'GPS activo'
                  : 'Mi ubicación'}
            </span>
          </button>
        </div>
        {lot && (
          <div className="indoor-selection">
            <div className="row">
              {selectedStand ? (
                <CategoryTile category={selectedStand.category} />
              ) : (
                <span className="indoor-lot-number">{lot[0]}</span>
              )}
              <span className="grow">
                <small>Espacio {lot[0]}</small>
                <h3>{selectedStand?.name || 'Expositor por publicar'}</h3>
              </span>
              <button
                className="icon-button"
                aria-label="Cerrar selección"
                onClick={() => setSelectedLot(null)}
              >
                <X size={18} />
              </button>
            </div>
            {selectedStand && (
              <Link className="button" to={`/stands/${selectedStand.id}`}>
                Ver perfil
                <ChevronRight size={16} />
              </Link>
            )}
          </div>
        )}
      </div>
      <div className="indoor-statusbar">
        <span aria-live="polite">
          {gps.status === 'waiting'
            ? 'Buscando señal…'
            : gps.status === 'active'
              ? `GPS relativo · ±${Math.round(gps.accuracy || 0)} m`
              : gps.status === 'paused'
                ? 'GPS pausado · pulsa Mi ubicación'
                : lastPoint
                  ? 'Última ubicación por NFC'
                  : 'Toca un espacio para explorarlo'}
        </span>
        <button disabled={!nfcAvailable() || busy} onClick={() => void locateNfc()}>
          <Nfc size={16} />
          {busy ? 'Leyendo…' : 'Ubicarme con NFC'}
        </button>
      </div>
      {(message || gps.error || outside || failed) && (
        <div className="indoor-notices">
          {message && (
            <div className="map-message" role="status">
              <span>{message}</span>
              <button
                aria-label={busy ? 'Cancelar lectura NFC' : 'Cerrar mensaje del mapa'}
                onClick={() => (busy ? abort.current?.abort() : setMessage(''))}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {gps.error && <p role="alert">{gps.error}</p>}
          {outside && (
            <p role="status">
              El desplazamiento relativo quedó fuera del plano. Detén GPS y vuelve a activarlo para
              iniciar otro recorrido.
            </p>
          )}
          {failed && (
            <p role="status">Vista 2D activada: el dispositivo no pudo iniciar el mapa 3D.</p>
          )}
        </div>
      )}
      {listing && (
        <Modal title="Stands" onClose={() => setListing(false)}>
          <div className="indoor-stand-list">
            {STANDS.map((s) => (
              <button key={s.id} onClick={() => select(s.id)}>
                <CategoryTile category={s.category} />
                <span className="grow">
                  <strong>{s.name}</strong>
                  <small>
                    {s.boothCode} · {PLAN_GEOMETRY.find((p) => p.id === s.planId)?.name}
                  </small>
                </span>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        </Modal>
      )}
      {help && (
        <Modal title="Mapa y movimiento GPS" onClose={() => setHelp(false)}>
          <div className="stack">
            <p>
              2D muestra los planos originales. El 3D usa sus mismos contornos, tamaños, espacios
              numerados y servicios.
            </p>
            <h3>Muévete con tu avatar</h3>
            <p>
              Pulsa Mi ubicación y permite el GPS. Desde ese punto, tus desplazamientos mueven el
              avatar. Por ahora es un recorrido relativo: escala provisional de 10 unidades del
              plano por metro, con norte hacia arriba; todavía no representa tu posición exacta
              dentro del recinto.
            </p>
            <p>
              El GPS puede perder precisión dentro de los edificios. Los pasos pequeños pueden no
              detectarse y una señal débil pausa el movimiento. Al cambiar de planta o volver desde
              otra pestaña puedes reiniciar Mi ubicación.
            </p>
            <h3>NFC</h3>
            <p>Una etiqueta de un stand conocido te lleva a su espacio. Ejemplo de texto NDEF:</p>
            <code className="campus-tag-example">FIPAZ:2026:STAND:stand-altura-labs</code>
            <p>Solo lectura. No se acreditan puntos ni se envía tu ubicación al backend.</p>
            <button className="button" onClick={() => setHelp(false)}>
              Entendido
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
