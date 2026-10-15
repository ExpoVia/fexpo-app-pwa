import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bookmark, MapPin, Share2, Store } from 'lucide-react';
import { get, set } from 'idb-keyval';
import { request, allPages } from '@/services/api';
import { EVENT_ID, UUID } from '@/services/config';
import { useLive, normalizeStand, message } from '@/state/live';
import { useUI } from '@/state/demo';
import { CategoryTile, Empty, Pill } from '@/ui/components';
import type { ActivityDto, StandDto } from '@/types/api';
import type { Stand } from '@/types/domain';
export function LiveStand() {
  const { id = '' } = useParams();
  const s = useLive();
  const [detail, setDetail] = useState<Stand | null>(null);
  const [activities, setActivities] = useState<ActivityDto[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('catalog');
  const stand = detail || s.stands.find((item) => item.id === id);
  useEffect(() => {
    let active = true;
    setDetail(null);
    setActivities([]);
    setError('');
    setLoading(true);
    if (!UUID.test(id)) {
      setError('El identificador del stand no es válido.');
      setLoading(false);
      return;
    }
    const key = `fexpo-stand-v1:${EVENT_ID}:${id}`;
    void (async () => {
      const cache = await get<{ stand: Stand; activities: ActivityDto[] }>(key).catch(
        () => undefined,
      );
      if (active && cache) {
        setDetail(cache.stand);
        setActivities(cache.activities);
      }
      try {
        const item = normalizeStand((await request<StandDto>(`/stands/${id}`)).data);
        const events = await allPages<ActivityDto>(
          `/events/${EVENT_ID}/activities?standId=${id}`,
        ).catch(() => []);
        if (active) {
          setDetail(item);
          setActivities(events);
        }
        await set(key, { stand: item, activities: events }).catch(() => {});
      } catch (e) {
        if (active) setError(message(e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);
  if (!stand)
    return (
      <Empty
        title={loading ? 'Buscando el stand…' : 'No pudimos abrir el stand'}
        action={
          <Link className="button" to="/stands">
            Explorar stands
          </Link>
        }
      >
        {error || 'Un momento, estamos preparando su perfil.'}
      </Empty>
    );
  const saved = s.favorites.includes(stand.id);
  const visited = s.visits.some((v) => v.standId === stand.id);
  async function share() {
    try {
      const data = { title: stand!.name, url: `${location.origin}/stands/${id}` };
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(data.url);
        useUI.getState().notify('Enlace copiado.');
      }
    } catch {
      useUI.getState().notify('No se compartió el enlace.');
    }
  }
  return (
    <div className="stack stand-page">
      <div className="stand-profile card">
        <span className="stand-avatar">{stand.name.slice(0, 2).toUpperCase()}</span>
        <h2>{stand.name}</h2>
        <Pill>Stand {stand.boothCode}</Pill>
        <small>{stand.categoryLabel}</small>
        <p>{stand.description}</p>
        <small className="muted">Logo y redes del expositor por publicar</small>
        <div className="row stand-actions">
          <button className="button" aria-pressed={saved} onClick={() => void s.favorite(id)}>
            <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} />
            {saved ? 'Stand guardado' : 'Guardar stand'}
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
            to={`/map?stand=${id}`}
            aria-label="Ver stand en el mapa"
          >
            <MapPin size={20} />
          </Link>
        </div>
      </div>
      {error && (
        <p role="status" className="muted">
          {error} Mostrando la información guardada.
        </p>
      )}
      {visited && <Pill tone="green">Visita confirmada</Pill>}
      <div className="stand-tabs" role="tablist" aria-label="Contenido del stand">
        {[
          { id: 'catalog', title: 'Catálogo' },
          { id: 'games', title: 'Dinámicas' },
          { id: 'offers', title: 'Ofertas' },
        ].map((t) => (
          <button
            role="tab"
            id={`live-tab-${t.id}`}
            aria-controls={`live-panel-${t.id}`}
            aria-selected={tab === t.id}
            key={t.id}
            onClick={() => setTab(t.id)}
          >
            {t.title}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`live-panel-${tab}`}
        aria-labelledby={`live-tab-${tab}`}
        className="stack"
      >
        {tab === 'catalog' && (
          <>
            <h3>Lo que encontrarás</h3>
            {stand.tags.length ? (
              <div className="product-grid">
                {stand.tags.map((tag) => (
                  <div className="product-card card" key={tag}>
                    <CategoryTile category={stand.category} large />
                    <strong>{tag}</strong>
                    <small>Consulta en el stand</small>
                  </div>
                ))}
              </div>
            ) : (
              <Empty title="Conoce su propuesta">
                Consulta los productos y servicios directamente con el expositor.
              </Empty>
            )}
          </>
        )}
        {tab === 'games' && (
          <>
            <h3>Experiencias del stand</h3>
            {stand.activity && <p className="card">{stand.activity}</p>}
            {activities.map((activity) => (
              <div className="card" key={activity.id}>
                <h3>{activity.title}</h3>
                <p>{activity.description}</p>
                {activity.startsAt && (
                  <small>{new Date(activity.startsAt).toLocaleString('es-BO')}</small>
                )}
              </div>
            ))}
            {!stand.activity && !activities.length && (
              <Empty title="Nuevas experiencias por descubrir" art="missions">
                Las actividades publicadas aparecerán aquí.
              </Empty>
            )}
          </>
        )}
        {tab === 'offers' &&
          (stand.promotion ? (
            <div className="card">
              <Pill tone="gold">Promoción del stand</Pill>
              <h3>{stand.promotion}</h3>
              <p>Consulta las condiciones y disponibilidad con el expositor.</p>
            </div>
          ) : (
            <Empty title="Las novedades llegarán aquí" art="rewards">
              Este stand aún no publicó promociones.
            </Empty>
          ))}
      </div>
      <Link className="button" to={`/scan?stand=${id}`}>
        <Store size={19} />
        Registrar visita
      </Link>
    </div>
  );
}
