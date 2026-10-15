import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, MapPin, ChevronRight, Plus, Minus, RotateCcw } from 'lucide-react';
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import { useLive } from '@/state/live';
import { Empty, Pill } from '@/ui/components';
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
function Controls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="zoom-buttons">
      <button className="icon-button" aria-label="Acercar plano" onClick={() => zoomIn()}>
        <Plus size={18} />
      </button>
      <button className="icon-button" aria-label="Alejar plano" onClick={() => zoomOut()}>
        <Minus size={18} />
      </button>
      <button
        className="icon-button"
        aria-label="Restablecer plano"
        onClick={() => resetTransform()}
      >
        <RotateCcw size={18} />
      </button>
    </div>
  );
}
export function LiveMap() {
  const s = useLive();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const target = params.get('stand');
  const floor =
    s.map?.floors.find((f) => f.id === params.get('floor')) ||
    s.map?.floors.find((f) => f.stands.some((stand) => stand.standId === target)) ||
    s.map?.floors[0];
  const stands = s.stands.filter((stand) =>
    norm(
      `${stand.name} ${stand.boothCode} ${stand.categoryLabel || ''} ${stand.tags.join(' ')}`,
    ).includes(norm(query)),
  );
  const view = floor?.viewBox.trim().split(/[ ,]+/).map(Number) || [0, 0, 1000, 1000];
  const [x, y, w, h] =
    view.length === 4 && view.every(Number.isFinite) && view[2] > 0 && view[3] > 0
      ? view
      : [0, 0, 1000, 1000];
  const coordinates = (px: number | null, py: number | null) => ({
    x: x + (px || 0) * w,
    y: y + (py || 0) * h,
  });
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
      </label>
      {!!s.map?.floors.length && (
        <div className="catalog-chips">
          {s.map.floors.map((f) => (
            <button
              className={floor?.id === f.id ? 'selected' : ''}
              key={f.id}
              onClick={() => setParams({ floor: f.id })}
            >
              {f.name}
              {f.levelLabel ? ` · ${f.levelLabel}` : ''}
            </button>
          ))}
        </div>
      )}
      {floor && !query && (
        <>
          <div className="section-title">
            <span>
              <h2>{floor.name}</h2>
              <small className="muted">{floor.stands.length} stands en este plano</small>
            </span>
            <MapPin size={24} />
          </div>
          <div className="floor-viewport">
            <TransformWrapper key={floor.id} minScale={0.8} maxScale={5} centerOnInit>
              <Controls />
              <TransformComponent
                wrapperStyle={{ width: '100%', height: '100%' }}
                contentStyle={{ width: '100%', height: '100%' }}
              >
                <svg
                  className="floor-svg"
                  viewBox={`${x} ${y} ${w} ${h}`}
                  aria-label={`Plano de ${floor.name}; también puedes usar la lista inferior`}
                >
                  {!floor.outline && floor.svgUrl && /^https?:\/\//.test(floor.svgUrl) && (
                    <image href={floor.svgUrl} x={x} y={y} width={w} height={h} />
                  )}
                  {floor.outline && (
                    <path
                      d={floor.outline}
                      fill="var(--surface)"
                      stroke="var(--muted)"
                      strokeWidth={w / 250}
                    />
                  )}
                  {floor.zones.map((zone) => (
                    <g key={zone.id}>
                      {zone.path && (
                        <path
                          d={zone.path}
                          fill="var(--blue)"
                          fillOpacity=".06"
                          stroke="var(--border)"
                        />
                      )}
                      {zone.labelX != null && zone.labelY != null && (
                        <text
                          {...coordinates(zone.labelX, zone.labelY)}
                          fill="var(--muted)"
                          fontSize={w / 45}
                          textAnchor="middle"
                        >
                          {zone.name}
                        </text>
                      )}
                    </g>
                  ))}
                  {floor.structures.map((structure) => (
                    <g key={structure.id}>
                      <path d={structure.path} fill="var(--surface-muted)" stroke="var(--border)" />
                      {structure.label && (
                        <text
                          {...coordinates(structure.labelX, structure.labelY)}
                          fill="var(--muted)"
                          fontSize={w / 60}
                          textAnchor="middle"
                        >
                          {structure.label}
                        </text>
                      )}
                    </g>
                  ))}
                  {floor.pois.map((poi) => (
                    <g key={poi.id}>
                      <circle
                        cx={coordinates(poi.x, poi.y).x}
                        cy={coordinates(poi.x, poi.y).y}
                        r={w / 100}
                        fill="#d8a137"
                      />
                      <title>{poi.label}</title>
                    </g>
                  ))}
                  {floor.stands.map((stand) => {
                    const p = coordinates(stand.x, stand.y);
                    const sw = (stand.width || 0.035) * w;
                    const sh = (stand.height || 0.035) * h;
                    const visited = s.visits.some((v) => v.standId === stand.standId);
                    return (
                      <Link
                        to={`/stands/${stand.standId}`}
                        key={stand.standId}
                        aria-label={`${stand.displayName}, stand ${stand.boothCode}`}
                      >
                        <g transform={`rotate(${stand.rotation || 0} ${p.x} ${p.y})`}>
                          <rect
                            x={p.x - sw / 2}
                            y={p.y - sh / 2}
                            width={sw}
                            height={sh}
                            rx={w / 400}
                            fill={
                              target === stand.standId ? '#d4a12d' : visited ? '#2e9e68' : '#087ec2'
                            }
                            stroke="var(--surface)"
                            strokeWidth={w / 500}
                          />
                          <text
                            x={p.x}
                            y={p.y + w / 200}
                            textAnchor="middle"
                            fontSize={Math.min(sw / 4, w / 55)}
                            fill="#fff"
                          >
                            {stand.boothCode}
                          </text>
                        </g>
                        <title>{stand.displayName}</title>
                      </Link>
                    );
                  })}
                </svg>
              </TransformComponent>
            </TransformWrapper>
          </div>
          <p className="footnote">Pellizca para acercar · toca un stand para ver su perfil.</p>
        </>
      )}
      <h3>{query ? 'Resultados' : floor ? 'Stands en el recinto' : 'Explorar stands'}</h3>
      {!floor && !query && (
        <p className="muted">
          El plano se mostrará cuando lo publique la organización. Puedes explorar el catálogo.
        </p>
      )}
      {stands.map((stand) => (
        <Link className="card stand-result" key={stand.id} to={`/stands/${stand.id}`}>
          <MapPin size={22} />
          <span className="grow">
            <strong>{stand.name}</strong>
            <small>
              {stand.boothCode} · {stand.categoryLabel}
            </small>
          </span>
          {s.visits.some((v) => v.standId === stand.id) && <Pill tone="green">Visitado</Pill>}
          <ChevronRight size={18} />
        </Link>
      ))}
      {!stands.length && !s.catalogLoading && (
        <Empty title={query ? 'Sin coincidencias' : 'Esperando los stands'}>
          {query
            ? 'Prueba con otro nombre o número de stand.'
            : 'El catálogo aparecerá cuando conectemos con la feria.'}
        </Empty>
      )}
    </div>
  );
}
