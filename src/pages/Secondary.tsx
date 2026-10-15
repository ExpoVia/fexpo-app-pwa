import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { ArrowRight, Bell, CalendarDays, MapPin, RefreshCw, Trash2 } from 'lucide-react';
import { EVENTS, eventStatus } from '@/data/events';
import { useDemo } from '@/state/demo';
import { Art, Empty, Pill } from '@/ui/components';

export function QrPage() {
  const state = useDemo();
  if (!state.signedIn)
    return (
      <Empty
        title="Tu pase te está esperando"
        art="my-qr"
        action={
          <Link className="button" to="/profile">
            Activar sesión demo
          </Link>
        }
      >
        Activa el perfil de demostración para ver esta pantalla.
      </Empty>
    );
  return (
    <div className="stack">
      <div className="qr-pass">
        <div className="row">
          <h2>Muéstralo en el stand</h2>
          <Art name="my-qr" size={45} />
        </div>
        <p>Tu próxima visita, en un solo código.</p>
        <div className="qr-paper">
          <QRCode
            value="FEXPO-DEMO-SIN-VALIDEZ-NO-ES-UNA-CREDENCIAL"
            size={236}
            bgColor="#ffffff"
            fgColor="#123f59"
            title="Código QR de demostración, sin validez real"
          />
        </div>
        <span className="qr-perforation" />
        <small>CÓDIGO DE DEMOSTRACIÓN</small>
        <strong className="qr-code-label">FX-DEMO</strong>
        <span>{state.name}</span>
      </div>
      <div className="card qr-note">
        <Bell size={21} />
        <p>
          Este código muestra cómo será tu pase. Todavía no identifica una cuenta real ni registra
          visitas.
        </p>
      </div>
      <Link className="button secondary" to="/scan">
        <RefreshCw size={18} />
        Probar el check-in
      </Link>
    </div>
  );
}
export function NotificationsPage() {
  const notices = useDemo((s) => s.notices);
  const read = useDemo((s) => s.readNotices);
  const clear = useDemo((s) => s.clearNotices);
  useEffect(() => {
    read();
  }, [read]);
  return (
    <div className="stack">
      <p className="intro-copy">Las pequeñas novedades de tu recorrido.</p>
      {notices.length ? (
        <>
          {notices.map((notice) => (
            <Link
              className="card notification-row"
              key={notice.id}
              to={notice.id.startsWith('visit-') ? '/profile' : '/missions'}
            >
              <Art name={notice.art} size={45} />
              <span className="grow">
                <strong>{notice.title}</strong>
                <p>{notice.body}</p>
                <small>
                  {new Date(notice.at).toLocaleTimeString('es-BO', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  · demostración
                </small>
              </span>
              <ArrowRight size={16} />
            </Link>
          ))}
          <button className="button ghost" onClick={clear}>
            <Trash2 size={17} />
            Borrar avisos
          </button>
        </>
      ) : (
        <Empty title="Tu próxima aventura te espera">
          Aquí verás las visitas simuladas, misiones completadas y novedades de tu recorrido.
        </Empty>
      )}
    </div>
  );
}
export function EventPage() {
  const { id } = useParams();
  const event = EVENTS.find((e) => e.id === id);
  if (!event)
    return (
      <Empty
        title="Feria no encontrada"
        action={
          <Link className="button" to="/">
            Volver al inicio
          </Link>
        }
      />
    );
  return (
    <div className="stack event-detail">
      <div className="event-cover">
        <img src={`/assets/events/${event.cover}`} alt={`Portada de ${event.name}`} />
        <span className="event-cover-shade" />
        <div>
          <Pill>{eventStatus(event, Date.now())}</Pill>
          <span className="eyebrow">{event.edition}</span>
          <h1>{event.name}</h1>
          <p>{event.lead}</p>
        </div>
      </div>
      <div className="event-meta">
        <span>
          <CalendarDays size={19} />
          {event.date}
        </span>
        <span>
          <MapPin size={19} />
          {event.venue}
        </span>
      </div>
      <p>{event.description}</p>
      {event.canExplore ? (
        <>
          <Link className="button" to="/map">
            Explorar el recinto
            <ArrowRight size={19} />
          </Link>
          <Link className="button secondary" to="/stands">
            Conocer stands
          </Link>
        </>
      ) : (
        <div className="card">
          <h3>Una nueva experiencia se prepara</h3>
          <p>Su mapa, expositores y actividades aparecerán cuando se publique el contenido.</p>
        </div>
      )}
      <p className="footnote">
        Datos y fechas heredados del prototipo Expo. Confirma la información con la organización.
      </p>
    </div>
  );
}
export function NotFoundPage() {
  return (
    <Empty
      title="Este camino todavía no existe"
      action={
        <Link className="button" to="/">
          Volver a Fexpo
        </Link>
      }
    >
      Elige una pantalla desde la navegación para continuar explorando.
    </Empty>
  );
}
