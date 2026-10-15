import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, FlaskConical } from 'lucide-react';
import { STANDS } from '@/data/demo-data';
import { EVENTS, eventStatus } from '@/data/events';
import { MISSIONS } from '@/data/missions';
import { useDemo, pointsFor, levelFor, missionValue } from '@/state/demo';
import { Art, CategoryTile, Progress, SectionTitle } from '@/ui/components';

const actions = [
  { path: '/map', name: 'Mapa', art: 'map', tint: 'blue' },
  { path: '/stands', name: 'Stands', art: 'stands', tint: 'coral' },
  { path: '/scan', name: 'Check-in', art: 'checkin', tint: 'green' },
  { path: '/missions', name: 'Misiones', art: 'missions', tint: 'purple' },
  { path: '/rewards', name: 'Premios', art: 'rewards', tint: 'gold' },
  { path: '/my-qr', name: 'Mi QR', art: 'my-qr', tint: 'cyan' },
];
export function HomePage() {
  const state = useDemo();
  const carousel = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const routeProgress = missionValue(MISSIONS[0], state.visits);
  return (
    <div className="stack home-page">
      <div className="section-title">
        <h2>Ferias</h2>
        <span className="demo-label">
          <FlaskConical size={12} />
          Vista previa
        </span>
      </div>
      <div
        className="event-carousel"
        ref={carousel}
        onScroll={(e) => {
          const first = e.currentTarget.firstElementChild as HTMLElement;
          setIndex(Math.round(e.currentTarget.scrollLeft / (first.offsetWidth + 12)));
        }}
      >
        {EVENTS.map((event) => (
          <Link className="event-card" to={`/events/${event.id}`} key={event.id}>
            <span className="event-banner">
              <img
                src={`/assets/events/${event.banner}`}
                alt={`Feria ${event.name}`}
                fetchPriority="high"
              />
              <span className="event-status">{eventStatus(event, Date.now())}</span>
              {!event.hasText && (
                <span className="event-wordmark">
                  {event.name}
                  <small>{event.edition}</small>
                </span>
              )}
            </span>
            <span className="event-caption">
              <strong>{event.name}</strong>
              <small>
                {event.date} · {event.location}
              </small>
            </span>
          </Link>
        ))}
      </div>
      <div className="carousel-dots" aria-label="Seleccionar feria">
        {EVENTS.map((event, i) => (
          <button
            aria-label={`Ver ${event.name}`}
            aria-pressed={i === index}
            key={event.id}
            onClick={() => {
              const card = carousel.current?.firstElementChild as HTMLElement | undefined;
              if (card)
                carousel.current?.scrollTo({
                  left: i * (card.offsetWidth + 12),
                  behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
                    ? 'instant'
                    : 'smooth',
                });
            }}
          >
            <span />
          </button>
        ))}
      </div>
      <div className="quick-grid">
        {actions.map((action) => (
          <Link className="quick-action" to={action.path} key={action.path}>
            <span className={`quick-image ${action.tint}`}>
              <Art name={action.art} size={76} />
            </span>
            <span>
              <strong>{action.name}</strong>
              <ChevronRight size={15} />
            </span>
          </Link>
        ))}
      </div>
      <Link to="/missions" className="card level-card">
        <div className="row">
          <Art name="level" size={40} />
          <span className="grow">
            <strong>Nivel {levelFor(state.visits)}</strong>
            <small>
              {state.visits.length} de {STANDS.length} stands
            </small>
          </span>
          <b className="level-points">{pointsFor(state.visits, state.redeemed)}</b>
          <small>pts</small>
        </div>
        <div className="segments" aria-label={`${state.visits.length} stands visitados`}>
          {STANDS.map((stand) => (
            <span
              className={state.visits.some((v) => v.standId === stand.id) ? 'done' : ''}
              key={stand.id}
            />
          ))}
        </div>
      </Link>
      <Link to="/missions" className="route-card">
        <Art name="route" size={39} />
        <span className="grow">
          <strong>Ruta FIPAZ</strong>
          <Progress value={routeProgress} total={3} label="Ruta FIPAZ" />
        </span>
        <b>{routeProgress}/3</b>
      </Link>
      <SectionTitle to="/stands">Stands destacados</SectionTitle>
      <div className="featured-stands">
        {STANDS.filter((s) => s.featured).map((stand) => (
          <Link key={stand.id} to={`/stands/${stand.id}`}>
            <CategoryTile category={stand.category} large />
            <strong>{stand.name}</strong>
            <small>Stand {stand.boothCode}</small>
          </Link>
        ))}
      </div>
      <p className="footnote">
        Explora con libertad. Los stands y el progreso de esta vista previa son de demostración.
      </p>
    </div>
  );
}
