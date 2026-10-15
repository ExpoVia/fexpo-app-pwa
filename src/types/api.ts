// SINCRONIZAR CON: fexpo-dashboard/src/types/api.ts
// DTOs del backend NestJS. Fuente: fexpo_database/docs/04_API_CONTRACT.md y el
// Swagger de fexpo-backend (/api/docs). Si cambian alla, se cambian aca.
import type { Visit } from './domain';

// ─── Envoltorio estandar ─────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: PaginationMeta | null;
}

export interface ApiFailure {
  success: false;
  error: { code: string; message: string; details: unknown };
}

export interface Page<T> {
  items: T[];
  meta: PaginationMeta;
}

// ─── Sesion y visitante ──────────────────────────────────────────────────────

export interface VisitorProfile {
  id: string;
  name: string;
  email: string;
  eventId: string;
}

/** POST /auth/google → tokens propios del backend (el idToken no se guarda). */
export interface GoogleLoginRequest {
  idToken: string;
  device: { id: string; platform: 'android' | 'ios' | 'web' };
}

export interface AuthUserDto {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  /** Segundos de vida del access token. */
  expiresIn: number;
  user: AuthUserDto;
}

/** POST /auth/refresh — rota el refresh token. */
export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** Respuesta de GET /me/qr: token firmado por el servidor. */
/** GET /me/qr?eventId= — QR personal persistente del visitante para un evento. */
export interface UserQrToken {
  qrId: string;
  eventId: string;
  /** Contenido a codificar en el QR; el staff lo canjea en manual-check-ins. */
  token: string;
  /** ISO 8601. */
  issuedAt: string;
}

// ─── Stands (GET /events/:eventId/stands, GET /stands/:standId) ─────────────

export interface StandCategoryDto {
  id: string;
  slug: string;
  label: string;
}

export interface StandLocationDto {
  floorId: string;
  zoneId: string | null;
  /** Centro del stand, normalizado 0..1 sobre el plano del piso. */
  x: number;
  y: number;
}

export interface StandDto {
  id: string;
  boothCode: string;
  displayName: string;
  description: string | null;
  company: { id: string; displayName: string };
  categories: StandCategoryDto[];
  tags: string[];
  featured: boolean;
  activityHighlight: string | null;
  promotionHighlight: string | null;
  /** Puntos de la primera visita (stands.visit_points). Opcional: backends viejos no lo traen. */
  visitPoints?: number;
  location: StandLocationDto | null;
}

export interface StandListItemDto extends StandDto {
  /** Relevancia de la busqueda (0..1). 1 cuando no hay texto. */
  relevance: number;
}

export interface ListStandsParams {
  query?: string;
  categoryId?: string;
  featured?: boolean;
  floorId?: string;
  zoneId?: string;
  page?: number;
  limit?: number;
}

// ─── Mapa (GET /events/:eventId/map) ─────────────────────────────────────────
//
// Dos sistemas de coordenadas, igual que en la DB:
//  - Geometria del piso (outline, structures, zones.path): unidades del
//    `viewBox` del piso, como un SVG (map_floors.view_box / map_zones.geometry).
//  - Stands y POI: normalizados 0..1 sobre ese viewBox (stand_locations,
//    map_pois). La app los convierte: X = minX + x * ancho.

export type PoiType =
  | 'entrance'
  | 'exit'
  | 'toilet'
  | 'food'
  | 'stage'
  | 'info'
  | 'health'
  | 'parking'
  | 'other';

export interface MapZoneDto {
  id: string;
  name: string;
  shortCode: string | null;
  /** Token de color de la zona (red, yellow, green, entrance, food…). */
  colorToken: string | null;
  /** Contorno SVG de la zona en unidades del viewBox (map_zones.geometry). */
  path: string | null;
  /** Posicion de la etiqueta, normalizada 0..1 (map_zones.label_x/label_y). */
  labelX: number | null;
  labelY: number | null;
}

/**
 * Elemento fijo del plano, no interactivo como stand:
 *  - area  → banos, rampas, ingreso, escaleras (con etiqueta).
 *  - space → espacio numerado sin expositor asignado.
 */
export interface MapStructureDto {
  id: string;
  kind: 'area' | 'space';
  /** Path SVG en unidades del viewBox. */
  path: string;
  label: string | null;
  labelX: number | null;
  labelY: number | null;
}

export interface MapPoiDto {
  id: string;
  type: PoiType;
  label: string;
  zoneId: string | null;
  x: number;
  y: number;
}

/** Una fila de stand_locations unida con los datos visibles del stand. */
export interface MapStandDto {
  standId: string;
  boothCode: string;
  displayName: string;
  zoneId: string | null;
  categories: StandCategoryDto[];
  /** Centro del stand, normalizado 0..1. */
  x: number;
  y: number;
  /** Tamano de la caja, normalizado 0..1. null = se dibuja como pin. */
  width: number | null;
  height: number | null;
  /** Grados, sentido horario, alrededor del centro. */
  rotation: number;
}

export interface MapFloorDto {
  id: string;
  code: string;
  name: string;
  levelLabel: string | null;
  /** "minX minY ancho alto": sistema de coordenadas del piso. */
  viewBox: string;
  /** Contorno del piso (path SVG). */
  outline: string | null;
  structures: MapStructureDto[];
  /**
   * SVG completo del piso publicado en storage (map_floors.svg_path), opcional.
   * Solo se usa como fondo si el piso no trae `outline`.
   */
  svgUrl: string | null;
  zones: MapZoneDto[];
  pois: MapPoiDto[];
  stands: MapStandDto[];
}

export interface EventMapDto {
  version: number;
  floors: MapFloorDto[];
}

// ─── Actividades (GET /events/:eventId/activities?standId=) ──────────────────

export interface ActivityDto {
  id: string;
  title: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: string | null;
}

// ─── Check-in (POST /stands/:standId/check-ins) ──────────────────────────────

export type CheckinMethod = 'nfc' | 'qr';

export interface CheckinRequest {
  method: CheckinMethod;
  /** UID del tag NFC o token QR. El backend decide si es valido. */
  credential: string;
  /** Idempotencia: identico en cada reintento. */
  requestKey: string;
}

export interface CheckinResponse {
  checkinId: string;
  visitId: string;
  isFirstVisit: boolean;
  /** true = ya habia check-in hoy en ese stand. No es un error. */
  dailyDuplicate: boolean;
  pointsAwarded: number;
  scoreAwarded: number;
}

/** Lo que se guarda en la cola offline para un check-in. */
export interface PendingCheckinPayload {
  standId: string;
  standName?: string;
  method: CheckinMethod;
  credential: string;
  /** Momento real del tap, no del envio: la cola puede tardar horas. */
  occurredAt: string;
}

// ─── Progreso del visitante (fuente de verdad: el servidor) ──────────────────

/** GET /events/:eventId/me/gamification */
export interface GamificationDto {
  pointsBalance: number;
  rankingScore: number;
  level: { number: number; name: string | null; nextLevelScore: number | null };
}

/** GET /events/:eventId/me/visits — una fila por stand visitado. */
export interface VisitDto {
  visitId: string;
  standId: string;
  standName: string;
  boothCode: string;
  pointsAwarded: number;
  scoreAwarded: number;
  /** ISO 8601. */
  visitedAt: string;
}

/** GET /events/:eventId/me/favorites */
export interface FavoriteDto {
  standId: string;
  standName: string;
  boothCode: string;
  createdAt: string;
}

/** GET /events/:eventId/me/streak */
export interface StreakDto {
  currentStreak: number;
  bestStreak: number;
  days: { date: string; active: boolean }[];
}

export interface VisitsResponse {
  items: Visit[];
}
