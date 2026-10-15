import { useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Map as MapIcon,
  Search,
  ChevronRight,
  MapPin,
  Utensils,
  ArrowLeft,
  Plus,
  Minus,
  RotateCcw,
  Check,
  Layers,
  X,
} from 'lucide-react';
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import { PLAN_GEOMETRY, PLAN_LOTS } from '@/data/map-plans';
import { STANDS, ZONES } from '@/data/demo-data';
import { useDemo } from '@/state/demo';
import { CategoryTile, Empty, Pill } from '@/ui/components';

const blocks = [
  {
    id: 'red',
    name: 'Bloque Rojo',
    color: '#ef6664',
    floors: ['red-lower', 'red-upper'],
    description: '2 plantas · 2 stands',
  },
  {
    id: 'yellow',
    name: 'Bloque Amarillo',
    color: '#edbc38',
    floors: ['yellow-lower', 'yellow-upper'],
    description: '2 plantas · 3 stands',
  },
  {
    id: 'green',
    name: 'Bloque Verde',
    color: '#49aa79',
    floors: ['green-upper'],
    description: '1 planta · 1 stand',
  },
];
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export function PlanMiniature({ id }: { id: string }) {
  const plan = PLAN_GEOMETRY.find((p) => p.id === id)!;
  return (
    <svg viewBox={plan.viewBox} aria-hidden="true" className="plan-mini">
      <path
        d={plan.outline}
        fill="currentColor"
        fillOpacity=".06"
        stroke="currentColor"
        strokeWidth={9}
      />
      {PLAN_LOTS[id].map(([code, x, y, w, h]) => (
        <rect
          key={`${code}-${x}-${y}`}
          x={x}
          y={y}
          width={w}
          height={h}
          fill="currentColor"
          fillOpacity=".16"
          stroke="currentColor"
          strokeWidth={2}
        />
      ))}
    </svg>
  );
}
function CampusArt() {
  return (
    <svg className="campus-art" viewBox="0 0 400 90" aria-hidden="true">
      <path
        d="M-30 80 120-30M90 130 260-30M230 130 400-30"
        stroke="var(--campus-road)"
        strokeWidth={25}
      />
      <path d="M-30 15 390 120M60-30 440 65" stroke="var(--campus-road)" strokeWidth={18} />
      {[
        [20, 34],
        [80, 20],
        [132, 69],
        [200, 18],
        [236, 62],
        [302, 20],
        [352, 66],
        [389, 20],
      ].map(([x, y], i) => (
        <g key={i}>
          <path d={`M${x} ${y + 8}v15`} stroke="#9a8f70" strokeWidth={3} />
          <ellipse cx={x} cy={y} rx={11} ry={14} fill={i % 2 ? '#82a77e' : '#a0bc96'} />
          <ellipse cx={x - 3} cy={y - 4} rx={7} ry={10} fill="#b7cdae" />
        </g>
      ))}
    </svg>
  );
}
function ZoomButtons() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="zoom-buttons">
      <button className="icon-button" aria-label="Acercar plano" onClick={() => zoomIn()}>
        <Plus size={21} />
      </button>
      <button className="icon-button" aria-label="Alejar plano" onClick={() => zoomOut()}>
        <Minus size={21} />
      </button>
      <button
        className="icon-button"
        aria-label="Restablecer plano"
        onClick={() => resetTransform()}
      >
        <RotateCcw size={19} />
      </button>
    </div>
  );
}
export function MapPage() {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('stand');
  const initialStand = STANDS.find((s) => s.id === selectedId);
  const [planId, setPlanId] = useState<string | null>(
    params.get('plan') ?? initialStand?.planId ?? null,
  );
  const [query, setQuery] = useState('');
  const [space, setSpace] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(selectedId);
  const visits = useDemo((s) => s.visits);
  const plan = PLAN_GEOMETRY.find((p) => p.id === planId);
  const stand = STANDS.find((s) => s.id === selected);
  const results = STANDS.filter((s) =>
    normalize(`${s.name} ${s.boothCode} ${s.tags.join(' ')}`).includes(normalize(query)),
  );
  function changePlan(id: string | null) {
    setPlanId(id);
    setSelected(null);
    setSpace(null);
    setQuery('');
    setParams(id ? { plan: id } : {}, { replace: true });
  }
  function selectStand(id: string) {
    const next = STANDS.find((s) => s.id === id)!;
    setPlanId(next.planId);
    setSelected(id);
    setQuery('');
    setSpace(null);
    setParams({ plan: next.planId, stand: id }, { replace: true });
  }
  return (
    <div className="stack map-page">
      <label className="search-field">
        <Search size={21} />
        <input
          aria-label="Buscar stands y empresas"
          placeholder="Buscar stands y empresas"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            className="icon-button"
            aria-label="Limpiar búsqueda"
            onClick={() => setQuery('')}
          >
            <X size={17} />
          </button>
        )}
      </label>
      <div className="map-chips" aria-label="Pabellones">
        <button className={!planId ? 'selected' : ''} onClick={() => changePlan(null)}>
          {!planId && <Check size={13} />}Todo el recinto
        </button>
        {blocks.map((block) => (
          <button
            key={block.id}
            className={planId?.startsWith(block.id) ? 'selected' : ''}
            onClick={() => changePlan(block.floors[0])}
          >
            {block.name}
          </button>
        ))}
      </div>
      {query ? (
        <div className="stack">
          <div className="section-title">
            <h2>Resultados</h2>
            <small>{results.length} stands</small>
          </div>
          {results.length ? (
            results.map((s) => (
              <button className="card stand-result" key={s.id} onClick={() => selectStand(s.id)}>
                <CategoryTile category={s.category} />
                <span className="grow">
                  <strong>{s.name}</strong>
                  <small>
                    Stand {s.boothCode} · {ZONES.find((z) => z.id === s.zoneId)?.buildingName}
                  </small>
                </span>
                <ChevronRight size={18} />
              </button>
            ))
          ) : (
            <Empty title="No encontramos ese stand">
              Prueba con el nombre, su código o una categoría.
            </Empty>
          )}
        </div>
      ) : !plan ? (
        <>
          <div className="map-heading">
            <span>
              <h2>Vista general</h2>
              <small>3 pabellones · 7 planos para explorar</small>
            </span>
            <span className="map-heading-icon">
              <MapIcon size={25} />
            </span>
          </div>
          <div className="pavilion-list">
            {blocks.map((block, i) => {
              const visited = visits.filter((v) =>
                STANDS.find((s) => s.id === v.standId)?.planId.startsWith(block.id),
              ).length;
              return (
                <button
                  className="pavilion-card"
                  key={block.id}
                  onClick={() => changePlan(block.floors[0])}
                  style={{ '--block-color': block.color } as CSSProperties}
                >
                  <span className="pavilion-copy">
                    <span className="row">
                      <i>{String(i + 1).padStart(2, '0')}</i>
                      <strong>{block.name}</strong>
                    </span>
                    <small>{block.description}</small>
                    <small>
                      {visited
                        ? `${visited} ${visited === 1 ? 'visitado' : 'visitados'}`
                        : 'Sin visitas'}
                    </small>
                  </span>
                  <span className="pavilion-plan">
                    <PlanMiniature id={block.floors[0]} />
                  </span>
                  <ChevronRight size={18} className="muted" />
                </button>
              );
            })}
          </div>
          <CampusArt />
          <div className="exterior-links">
            <button onClick={() => changePlan('entrance')}>
              <MapPin size={19} />
              <strong>Plaza Akapana</strong>
              <ChevronRight size={15} />
            </button>
            <button onClick={() => changePlan('food-court')}>
              <Utensils size={18} />
              <strong>Patio de comidas</strong>
              <ChevronRight size={15} />
            </button>
          </div>
          <p className="footnote">Toca un pabellón para ver su plano · esquema de zonas</p>
        </>
      ) : (
        <>
          <div className="map-floor-heading">
            <button
              className="icon-button"
              aria-label="Volver al recinto"
              onClick={() => changePlan(null)}
            >
              <ArrowLeft size={20} />
            </button>
            <span className="grow">
              <h2>{plan.name}</h2>
              <small>{plan.level} · plano de referencia</small>
            </span>
            <Layers size={21} className="muted" />
          </div>
          {blocks.find((b) => b.floors.includes(plan.id))?.floors.length === 2 && (
            <div className="floor-tabs">
              {blocks
                .find((b) => b.floors.includes(plan.id))!
                .floors.map((id) => (
                  <button
                    key={id}
                    className={id === plan.id ? 'selected' : ''}
                    onClick={() => changePlan(id)}
                  >
                    {PLAN_GEOMETRY.find((p) => p.id === id)!.level}
                  </button>
                ))}
            </div>
          )}
          <div className="floor-viewport">
            <TransformWrapper key={plan.id} minScale={1} maxScale={5} centerOnInit>
              <ZoomButtons />
              <TransformComponent wrapperClass="floor-transform" contentClass="floor-content">
                <svg
                  viewBox={plan.viewBox}
                  className="floor-svg"
                  aria-label={`Plano de ${plan.name}. Los stands también aparecen en la lista inferior.`}
                >
                  <path
                    d={plan.outline}
                    fill="var(--surface)"
                    stroke={plan.color}
                    strokeWidth={7}
                  />
                  {plan.structures.map((structure, i) => (
                    <g key={i}>
                      <path
                        d={structure.path}
                        fill="var(--surface-muted)"
                        stroke="var(--border)"
                        strokeWidth={2}
                      />
                      <text
                        x={structure.x}
                        y={structure.y}
                        textAnchor="middle"
                        fontSize={15}
                        fill="var(--muted)"
                      >
                        {structure.label}
                      </text>
                    </g>
                  ))}
                  {PLAN_LOTS[plan.id].map(([code, x, y, w, h]) => {
                    const occupant = STANDS.find(
                      (s) =>
                        s.planId === plan.id &&
                        Number(s.boothCode.split('-').at(-1)) === Number(code),
                    );
                    const visited = occupant && visits.some((v) => v.standId === occupant.id);
                    return (
                      <g
                        key={`${code}-${x}-${y}`}
                        className="lot"
                        onClick={() => {
                          if (occupant) selectStand(occupant.id);
                          else {
                            setSelected(null);
                            setSpace(String(code));
                          }
                        }}
                      >
                        <rect
                          x={x}
                          y={y}
                          width={w}
                          height={h}
                          rx={2}
                          fill={
                            selected === occupant?.id
                              ? '#087ec2'
                              : visited
                                ? '#2e9e68'
                                : occupant
                                  ? plan.color
                                  : `color-mix(in srgb, ${plan.color} 12%, var(--surface))`
                          }
                          stroke={occupant ? 'var(--surface)' : plan.color}
                          strokeWidth={occupant ? 4 : 1.3}
                        />
                        <text
                          x={x + w / 2}
                          y={y + h / 2 + 5}
                          textAnchor="middle"
                          fill={occupant ? '#ffffff' : 'var(--ink)'}
                          fontSize={w < 35 ? 12 : 16}
                        >
                          {code}
                        </text>
                        {occupant && (
                          <title>
                            {occupant.name} · {occupant.boothCode}
                          </title>
                        )}
                      </g>
                    );
                  })}
                  <circle
                    cx={plan.origin.x}
                    cy={plan.origin.y}
                    r={10}
                    fill="#087ec2"
                    stroke="#ffffff"
                    strokeWidth={4}
                  />
                </svg>
              </TransformComponent>
            </TransformWrapper>
          </div>
          <div className="map-legend">
            <span>
              <i className="legend-dot blue" />
              Stand demo
            </span>
            <span>
              <i className="legend-dot green" />
              Visitado
            </span>
            <small>Pellizca para acercar</small>
          </div>
          {stand && (
            <div className="card selected-stand">
              <div className="row">
                <CategoryTile category={stand.category} />
                <span className="grow">
                  <strong>{stand.name}</strong>
                  <small>Stand {stand.boothCode}</small>
                </span>
                <button
                  className="icon-button"
                  aria-label="Cerrar selección"
                  onClick={() => setSelected(null)}
                >
                  <X size={18} />
                </button>
              </div>
              <p>{stand.description}</p>
              <Link className="button" to={`/stands/${stand.id}`}>
                Ver perfil del stand
                <ChevronRight size={18} />
              </Link>
            </div>
          )}
          {space && (
            <div className="card">
              <Pill>Espacio {space}</Pill>
              <h3>Expositor por publicar</h3>
              <p className="muted">Esta ubicación todavía no tiene una ficha en la demostración.</p>
            </div>
          )}
          <h3>Stands en este plano</h3>
          {STANDS.filter((s) => s.planId === plan.id).length ? (
            STANDS.filter((s) => s.planId === plan.id).map((s) => (
              <button className="card stand-result" key={s.id} onClick={() => selectStand(s.id)}>
                <CategoryTile category={s.category} />
                <span className="grow">
                  <strong>{s.name}</strong>
                  <small>{s.boothCode}</small>
                </span>
                <ChevronRight size={18} />
              </button>
            ))
          ) : (
            <p className="muted">Sin expositores de demostración asignados.</p>
          )}
          <p className="footnote">
            Geometría compartida con la app Expo. Ubicaciones ilustrativas, sujetas a confirmación.
          </p>
        </>
      )}
    </div>
  );
}
