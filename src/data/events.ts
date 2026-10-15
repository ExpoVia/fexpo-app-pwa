export const EVENTS = [
  {
    id: 'huaynafex-preview',
    name: 'HuaynaFEX',
    edition: 'Internacional',
    date: '7 — 11 oct',
    location: 'El Alto',
    venue: 'Terminal Metropolitana · El Alto',
    start: '2026-10-07T09:00:00-04:00',
    end: '2026-10-11T23:00:00-04:00',
    banner: 'huayna-banner.jpg',
    cover: 'huayna-cover.webp',
    hasText: true,
    lead: 'El Alto se llena de ideas.',
    description: 'El mapa, los stands y los retos aparecerán cuando se publiquen sus datos.',
    canExplore: false,
  },
  {
    id: 'event-fipaz-2026',
    name: 'FIPAZ',
    edition: '2026',
    date: '28 oct — 8 nov',
    location: 'La Paz',
    venue: 'Campo Ferial Chuquiago Marka · La Paz',
    start: '2026-10-28T09:00:00-04:00',
    end: '2026-11-08T21:00:00-04:00',
    banner: 'fipaz-banner.jpg',
    cover: 'fipaz-cover.webp',
    hasText: false,
    lead: 'Una feria. Mil caminos por descubrir.',
    description:
      'Explora el recinto, encuentra stands y convierte cada visita en parte de tu recorrido.',
    canExplore: true,
  },
  {
    id: 'feipobol-preview',
    name: 'FEIPOBOL',
    edition: 'Potosí',
    date: '6 — 15 nov',
    location: 'Potosí',
    venue: 'Campo Ferial Potosí · Cantumarca',
    start: '2026-11-06T09:00:00-04:00',
    end: '2026-11-15T21:00:00-04:00',
    banner: 'feipobol-banner.jpg',
    cover: 'feipobol-banner.jpg',
    hasText: true,
    lead: 'La feria más alta del mundo.',
    description: 'Mapa, stands y retos disponibles cuando la organización publique sus datos.',
    canExplore: false,
  },
] as const;
export function eventStatus(event: (typeof EVENTS)[number], now: number) {
  return now < Date.parse(event.start)
    ? 'Próximamente'
    : now > Date.parse(event.end)
      ? 'Finalizada'
      : 'En curso';
}
