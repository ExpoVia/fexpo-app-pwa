import { useEffect, useRef, useState, useId } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Bookmark,
  ChevronRight,
  Ellipsis,
  ExternalLink,
  Globe,
  Instagram,
  MapPin,
  Share2,
  Store,
  Ticket,
  RotateCw,
  Sparkles,
  Check,
  Clock3,
} from 'lucide-react';
import { STANDS, CATEGORIES, ZONES } from '@/data/demo-data';
import { useDemo, useUI } from '@/state/demo';
import { Art, CategoryTile, Empty, Modal, Pill, categoryMeta, SectionTitle } from '@/ui/components';

export function StandsPage() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? 'general';
  const [favorites, setFavorites] = useState(false);
  const state = useDemo();
  const filtered = STANDS.filter(
    (s) =>
      (category === 'general' || s.category === category) &&
      (!favorites || state.favorites.includes(s.id)),
  );
  return (
    <div className="stack">
      <div className="section-intro">
        <span className="eyebrow">NUEVAS CONEXIONES</span>
        <h2>Encuentra tu próxima parada.</h2>
        <p>Seis empresas de ejemplo para explorar Fexpo.</p>
      </div>
      <div className="catalog-toolbar">
        <Link className="button secondary" to="/map">
          <MapPin size={17} />
          Buscar en el mapa
        </Link>
        <button
          className={`icon-button ${favorites ? 'selected' : ''}`}
          aria-label="Mostrar solo favoritos"
          aria-pressed={favorites}
          onClick={() => setFavorites((v) => !v)}
        >
          <Bookmark size={21} fill={favorites ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="catalog-chips">
        <button
          className={category === 'general' ? 'selected' : ''}
          onClick={() => setParams({ category: 'general' })}
        >
          Todos
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={category === c.id ? 'selected' : ''}
            onClick={() => setParams({ category: c.id })}
          >
            {c.label}
          </button>
        ))}
      </div>
      <small className="muted">
        {filtered.length} {filtered.length === 1 ? 'stand' : 'stands'} · expositores ficticios
      </small>
      {filtered.length ? (
        filtered.map((stand) => (
          <Link className="card catalog-card" to={`/stands/${stand.id}`} key={stand.id}>
            <CategoryTile category={stand.category} />
            <span className="grow">
              <strong>{stand.name}</strong>
              <small>
                {categoryMeta[stand.category].label} · {stand.boothCode}
              </small>
              <span className="catalog-description">{stand.description}</span>
              <span className="row">
                {state.visits.some((v) => v.standId === stand.id) ? (
                  <Pill tone="green">
                    <Check size={12} />
                    Visitado
                  </Pill>
                ) : (
                  <Pill>+50 pts demo</Pill>
                )}
                {state.favorites.includes(stand.id) && <Bookmark size={14} />}
              </span>
            </span>
            <ChevronRight size={18} className="muted" />
          </Link>
        ))
      ) : (
        <Empty title="Tu colección empieza aquí">
          Guarda los stands que quieras visitar y encuéntralos fácilmente.
        </Empty>
      )}
    </div>
  );
}
function ScratchGame() {
  const id = useId();
  const [paths, setPaths] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const pen = useRef<{ x: number; y: number; distance: number } | null>(null);
  const total = useRef(0);
  return (
    <div className="stack">
      <div className="scratch-card">
        <div className="scratch-prize">
          <Art name="rewards" size={78} />
          <strong>¡Una sorpresa te espera!</strong>
          <small>Pregunta por las novedades del stand.</small>
        </div>
        {!revealed && (
          <svg
            viewBox="0 0 320 200"
            aria-label="Superficie para raspar"
            className="scratch-overlay"
            onPointerDown={(e) => {
              const box = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - box.left) / box.width) * 320;
              const y = ((e.clientY - box.top) / box.height) * 200;
              pen.current = { x, y, distance: 0 };
              setPaths((p) => [...p, `M${x} ${y}`]);
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!pen.current) return;
              const box = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - box.left) / box.width) * 320;
              const y = ((e.clientY - box.top) / box.height) * 200;
              total.current += Math.hypot(x - pen.current.x, y - pen.current.y);
              pen.current = { x, y, distance: total.current };
              setPaths((p) => [...p.slice(0, -1), `${p.at(-1)} L${x} ${y}`]);
              if (total.current > 1000) {
                setRevealed(true);
                pen.current = null;
              }
            }}
            onPointerUp={() => {
              pen.current = null;
            }}
            onPointerCancel={() => {
              pen.current = null;
            }}
          >
            <defs>
              <mask id={id}>
                <rect width="320" height="200" fill="white" />
                {paths.map((path, i) => (
                  <path
                    d={path}
                    key={i}
                    stroke="black"
                    strokeWidth={34}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </mask>
              <linearGradient id={`${id}-shine`}>
                <stop stopColor="#91aabb" />
                <stop offset=".5" stopColor="#d7e5ee" />
                <stop offset="1" stopColor="#91aabb" />
              </linearGradient>
            </defs>
            <g mask={`url(#${id})`}>
              <rect width="320" height="200" rx={18} fill={`url(#${id}-shine)`} />
              <text
                x="160"
                y="90"
                textAnchor="middle"
                fontWeight="700"
                fontSize="23"
                fill="#254962"
              >
                Raspa y descubre
              </text>
              <text x="160" y="120" textAnchor="middle" fontSize="14" fill="#254962">
                Desliza tu dedo sobre la tarjeta
              </text>
            </g>
          </svg>
        )}
      </div>
      <button className="button secondary" onClick={() => setRevealed(true)} disabled={revealed}>
        {revealed ? '¡Sorpresa revelada!' : 'Revelar sin raspar'}
      </button>
      <p className="footnote">Dinámica visual de demostración. No entrega premios reales.</p>
    </div>
  );
}
function WheelGame() {
  const [angle, setAngle] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function spin() {
    setRunning(true);
    setResult(false);
    setAngle((a) => a + 1080 + Math.floor(Math.random() * 360));
    timer.current = setTimeout(
      () => {
        setRunning(false);
        setResult(true);
      },
      matchMedia('(prefers-reduced-motion: reduce)').matches ? 50 : 3000,
    );
  }
  return (
    <div className="stack">
      <div className="wheel-stage">
        <span className="wheel-pointer" />
        <div className="wheel" style={{ transform: `rotate(${angle}deg)` }}>
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} style={{ transform: `rotate(${i * 60 + 30}deg) translateY(-82px)` }}>
              <Sparkles size={24} />
            </span>
          ))}
          <span className="wheel-center">F</span>
        </div>
      </div>
      <div className="game-result" aria-live="polite">
        {result ? (
          <>
            <strong>¡Una nueva conexión!</strong>
            <p>Visita el stand y descubre lo que tiene para ti.</p>
          </>
        ) : (
          <p>Un giro. Una sorpresa por descubrir.</p>
        )}
      </div>
      <button className="button" onClick={spin} disabled={running}>
        <RotateCw size={19} />
        {running ? 'Girando…' : result ? 'Volver a girar' : 'Girar ruleta demo'}
      </button>
      <p className="footnote">Resultado ilustrativo. No modifica puntos ni entrega premios.</p>
    </div>
  );
}
export function StandPage() {
  const { id } = useParams();
  const stand = STANDS.find((s) => s.id === id);
  const state = useDemo();
  const notify = useUI((s) => s.notify);
  const [tab, setTab] = useState('catalog');
  const [game, setGame] = useState<'wheel' | 'scratch' | null>(null);
  const [product, setProduct] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  useEffect(
    () => () => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
    },
    [],
  );
  if (!stand)
    return (
      <Empty
        title="Stand no encontrado"
        action={
          <Link className="button" to="/stands">
            Explorar stands
          </Link>
        }
      >
        Vuelve al catálogo para elegir una empresa de la demo.
      </Empty>
    );
  const favorite = state.favorites.includes(stand.id);
  const visited = state.visits.some((v) => v.standId === stand.id);
  const meta = categoryMeta[stand.category];
  async function share(name?: string) {
    const data = {
      title: stand!.name,
      text: `${name ? name + ' · ' : ''}${stand!.name} · Stand ${stand!.boothCode} en Fexpo (demostración)`,
      url: `${location.origin}/stands/${stand!.id}`,
    };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(data.url);
        notify('Enlace del stand copiado.');
      }
    } catch {
      notify('No se compartió el enlace. Puedes intentarlo de nuevo.');
    }
  }
  function cancelPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  }
  return (
    <div className="stack stand-page">
      <div className="stand-profile card">
        <span className="stand-avatar" style={{ color: meta.color, background: `${meta.color}15` }}>
          {stand.name
            .split(' ')
            .map((s) => s[0])
            .join('')}
        </span>
        <h2>{stand.name}</h2>
        <div className="row center">
          <Pill>
            <MapPin size={13} />
            Stand {stand.boothCode}
          </Pill>
          <small>{meta.label}</small>
        </div>
        <p>{stand.description}</p>
        <div className="stand-socials">
          <button disabled aria-label="Instagram aún no publicado">
            <Instagram size={17} />
            Instagram
          </button>
          <button disabled aria-label="Sitio web aún no publicado">
            <Globe size={17} />
            Web
          </button>
        </div>
        <small className="muted">Logo y redes del expositor por publicar</small>
        <div className="row stand-actions">
          <button
            className={`button ${favorite ? 'secondary' : ''}`}
            onClick={() => state.favorite(stand.id)}
            aria-pressed={favorite}
          >
            <Bookmark size={18} fill={favorite ? 'currentColor' : 'none'} />
            {favorite ? 'Stand guardado' : 'Guardar stand'}
          </button>
          <button
            className="icon-button outline"
            aria-label="Compartir stand"
            onClick={() => void share()}
          >
            <Share2 size={20} />
          </button>
          <Link
            className="icon-button outline"
            aria-label="Ver stand en el mapa"
            to={`/map?stand=${stand.id}`}
          >
            <MapPin size={21} />
          </Link>
        </div>
      </div>
      {visited && (
        <Pill tone="green">
          <Check size={14} />
          Visita registrada en la demo
        </Pill>
      )}
      <div className="stand-tabs" role="tablist" aria-label="Contenido del stand">
        {[
          { id: 'catalog', label: 'Catálogo' },
          { id: 'games', label: 'Dinámicas' },
          { id: 'offers', label: 'Ofertas' },
        ].map((item) => (
          <button
            key={item.id}
            id={`tab-${item.id}`}
            role="tab"
            aria-selected={tab === item.id}
            aria-controls={`panel-${item.id}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="stack">
        {tab === 'catalog' && (
          <>
            <div className="section-title">
              <h3>Descubre sus productos</h3>
              <Pill>Ejemplo</Pill>
            </div>
            <small className="muted">
              Toca para ver detalles · mantén pulsado para más opciones.
            </small>
            <div className="product-grid">
              {stand.tags.map((tag) => (
                <div className="product-card card" key={tag}>
                  <button
                    className="product-main"
                    onPointerDown={() => {
                      longPressed.current = false;
                      pressTimer.current = setTimeout(() => {
                        longPressed.current = true;
                        setMenu(tag);
                      }, 550);
                    }}
                    onPointerUp={cancelPress}
                    onPointerCancel={cancelPress}
                    onPointerLeave={cancelPress}
                    onPointerMove={cancelPress}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setMenu(tag);
                    }}
                    onClick={() => {
                      if (!longPressed.current) setProduct(tag);
                    }}
                  >
                    <CategoryTile category={stand.category} large />
                    <strong>{tag}</strong>
                    <small>Consultar en stand</small>
                  </button>
                  <button
                    className="product-options icon-button"
                    aria-label={`Opciones de ${tag}`}
                    onClick={() => setMenu(tag)}
                  >
                    <Ellipsis size={19} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
        {tab === 'games' && (
          <>
            <div className="game-hero">
              <span className="grow">
                <Pill>Demo interactiva</Pill>
                <h2>Descubre algo inesperado.</h2>
                <p>Otra forma de conectar con el stand.</p>
              </span>
              <img src="/assets/stand-profile/prize-wheel.png" alt="" width="120" height="140" />
            </div>
            <div className="games-grid">
              <button className="card game-card" onClick={() => setGame('wheel')}>
                <RotateCw size={27} />
                <h3>Ruleta</h3>
                <p>Gira y descubre</p>
                <span>
                  Probar demo <ChevronRight size={15} />
                </span>
              </button>
              <button className="card game-card" onClick={() => setGame('scratch')}>
                <Ticket size={27} />
                <h3>Raspa y gana</h3>
                <p>Revela la sorpresa</p>
                <span>
                  Probar demo <ChevronRight size={15} />
                </span>
              </button>
            </div>
            <p className="footnote">Estas demostraciones no entregan premios ni suman puntos.</p>
          </>
        )}
        {tab === 'offers' && (
          <>
            <h3>Beneficios de tu visita</h3>
            {stand.promotion ? (
              <button
                className={`offer-card flip-card ${flipped ? 'flipped' : ''}`}
                aria-label="Ver condiciones de la promoción"
                aria-pressed={flipped}
                onClick={() => setFlipped((v) => !v)}
              >
                <span className="flip-inner">
                  <span className="flip-front">
                    <span className="row">
                      <Ticket size={22} />
                      <small>OFERTA DEL STAND</small>
                    </span>
                    <strong>{stand.promotion}</strong>
                    <span>Oferta de demostración · toca para ver condiciones</span>
                  </span>
                  <span className="flip-back">
                    <strong>Consulta las condiciones</strong>
                    <span>Ejemplo visual. No es un cupón real ni canjeable.</span>
                    <small>
                      {stand.name} · {stand.boothCode}
                    </small>
                  </span>
                </span>
              </button>
            ) : (
              <Empty title="Las novedades llegarán aquí" art="rewards">
                Este stand todavía no tiene promociones de ejemplo.
              </Empty>
            )}
          </>
        )}
      </div>
      <SectionTitle>En el stand</SectionTitle>
      <div className="card stand-activity">
        <Clock3 size={22} />
        <span>
          <strong>{stand.activity ?? 'Sin actividades programadas'}</strong>
          <small>
            {ZONES.find((z) => z.id === stand.zoneId)?.buildingName} · contenido de demostración
          </small>
        </span>
      </div>
      <Link className="button" to={`/scan?stand=${stand.id}`}>
        <Store size={19} />
        {visited ? 'Ver experiencia de check-in' : 'Simular visita · +50 pts'}
      </Link>
      {game && (
        <Modal
          title={game === 'wheel' ? 'Ruleta del stand' : 'Raspa y gana'}
          onClose={() => setGame(null)}
        >
          {game === 'wheel' ? <WheelGame /> : <ScratchGame />}
        </Modal>
      )}
      {product && (
        <Modal title={product} onClose={() => setProduct(null)}>
          <div className="product-detail-art">
            <CategoryTile category={stand.category} large />
          </div>
          <Pill>Producto de ejemplo</Pill>
          <p>
            Conoce la propuesta de {stand.name} en {product.toLowerCase()}. Los detalles y precios
            se publicarán al conectar el catálogo real.
          </p>
          <Link className="button" to={`/map?stand=${stand.id}`}>
            Ver ubicación
            <MapPin size={18} />
          </Link>
        </Modal>
      )}
      {menu && (
        <Modal title={menu} onClose={() => setMenu(null)}>
          <button
            className="button secondary"
            onClick={() => {
              setProduct(menu);
              setMenu(null);
            }}
          >
            <ExternalLink size={17} />
            Ver detalles
          </button>
          <button className="button secondary" onClick={() => void share(menu)}>
            <Share2 size={17} />
            Compartir producto
          </button>
          <button
            className="button secondary"
            onClick={() => {
              state.favorite(stand.id);
              setMenu(null);
            }}
          >
            <Bookmark size={17} />
            {favorite ? 'Quitar stand de favoritos' : 'Guardar stand'}
          </button>
        </Modal>
      )}
    </div>
  );
}
