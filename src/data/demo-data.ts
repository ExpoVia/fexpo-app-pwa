// Catalogo de demostracion. Empresas ficticias: ninguna esta confirmada como
// expositora de FIPAZ 2026.
import type { Category, Stand, Zone } from '@/types/domain';

export const CATEGORIES: readonly Category[] = [
  { id: 'technology', label: 'Tecnología', iconName: 'cpu' },
  { id: 'health', label: 'Salud', iconName: 'heart' },
  { id: 'finance', label: 'Finanzas', iconName: 'bank' },
  { id: 'gastronomy', label: 'Gastronomía', iconName: 'food' },
  { id: 'education', label: 'Educación', iconName: 'school' },
  { id: 'startups', label: 'Emprendimientos', iconName: 'rocket' },
] as const;

export const ZONES: readonly Zone[] = [
  {
    id: 'zone-red',
    name: 'Bloque Rojo · Internacional',
    shortCode: 'R',
    categoryIds: ['health', 'finance'],
    buildingName: 'Bloque Rojo',
  },
  {
    id: 'zone-yellow',
    name: 'Bloque Amarillo · La Paz y Bolivia',
    shortCode: 'A/B',
    categoryIds: ['technology', 'startups', 'education'],
    buildingName: 'Bloque Amarillo',
  },
  {
    id: 'zone-green',
    name: 'Bloque Verde · Americano',
    shortCode: 'G/V',
    categoryIds: ['gastronomy'],
    buildingName: 'Bloque Verde',
  },
] as const;

export const STANDS: readonly Stand[] = [
  {
    id: 'stand-altura-labs',
    name: 'Altura Labs',
    category: 'technology',
    description: 'Plataforma de desarrollo de apps móviles con IA para el mercado andino.',
    zoneId: 'zone-yellow',
    planId: 'yellow-upper',
    boothCode: 'B-117',
    tags: ['IA', 'Integraciones', 'Cloud'],
    activity: 'Demo en vivo de asistente de voz en quechua · 16:00',
    promotion: '30 % de descuento en plan Starter',
    points: 50,
    featured: true,
  },
  {
    id: 'stand-kawsay-salud',
    name: 'Kawsay Salud',
    category: 'health',
    description: 'Telemedicina rural con diagnóstico asistido por imágenes médicas.',
    zoneId: 'zone-red',
    planId: 'red-lower',
    boothCode: 'R-24',
    tags: ['Salud', 'Telemedicina'],
    activity: 'Consulta rápida de bienestar',
    promotion: 'Control de presión sin costo',
    points: 50,
  },
  {
    id: 'stand-sabor-andino',
    name: 'Sabor Andino',
    category: 'gastronomy',
    description: 'Cocina fusión de alta gama con ingredientes de origen boliviano.',
    zoneId: 'zone-green',
    planId: 'green-upper',
    boothCode: 'G-08',
    tags: ['Cafe', 'Postres'],
    activity: 'Degustación de singani de altura',
    promotion: 'Degustación 11:00 a 13:00',
    points: 50,
    featured: true,
  },
  {
    id: 'stand-illimani-capital',
    name: 'Illimani Capital',
    category: 'finance',
    description: 'Creditos para pequenas empresas y educacion financiera.',
    zoneId: 'zone-red',
    planId: 'red-upper',
    boothCode: 'R-51',
    tags: ['Credito', 'Fintech'],
    points: 50,
  },
  {
    id: 'stand-yatiri-edu',
    name: 'Yatiri Educa',
    category: 'education',
    description: 'Formacion tecnica y becas para jovenes.',
    zoneId: 'zone-yellow',
    planId: 'yellow-lower',
    boothCode: 'A-12',
    tags: ['Becas', 'Cursos'],
    points: 50,
  },
  {
    id: 'stand-pachamama-tech',
    name: 'Pachamama Tech',
    category: 'startups',
    description: 'Sensores para agricultura de pequena escala.',
    zoneId: 'zone-yellow',
    planId: 'yellow-upper',
    boothCode: 'B-140',
    tags: ['AgroTech', 'IoT'],
    activity: 'Charla de emprendimiento · 18:00',
    points: 50,
  },
] as const;

export function findStand(standId: string): Stand | undefined {
  return STANDS.find((stand) => stand.id === standId);
}

export function zoneName(zoneId: string): string {
  return ZONES.find((zone) => zone.id === zoneId)?.name ?? 'Zona por confirmar';
}
