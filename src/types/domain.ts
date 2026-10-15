// SINCRONIZAR CON: fexpo-dashboard/src/types/domain.ts
export type StandCategory =
  | 'technology'
  | 'health'
  | 'finance'
  | 'gastronomy'
  | 'education'
  | 'startups';

export interface Category {
  id: StandCategory;
  label: string;
  iconName: string;
}

export interface FexpoEvent {
  id: string;
  name: string;
  city: string;
  venue: string;
  startsAt: string;
  endsAt: string;
  isSimulated: boolean;
}

export interface Zone {
  id: string;
  name: string;
  shortCode: string;
  categoryIds: StandCategory[];
  buildingName: string;
}

export interface Stand {
  id: string;
  name: string;
  category: StandCategory;
  categoryLabel?: string;
  description: string;
  zoneId: string;
  planId: string;
  boothCode: string;
  tags: string[];
  activity?: string;
  promotion?: string;
  points: number;
  featured?: boolean;
}

export interface Mission {
  id: string;
  title: string;
  shortDescription: string;
  category: StandCategory | 'general';
  standIds?: string[];
  target: number;
  rewardPoints: number;
  specialAction?: 'selfie' | 'share' | 'agenda';
  unlockedBy?: string;
  featured?: boolean;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  cost: number;
  stockLabel?: string;
}

export interface Visit {
  id: string;
  standId: string;
  standName: string;
  visitedAt: string;
  /** Lo que acredito el servidor (0 si la visita ya contaba). */
  pointsAwarded: number;
  method: 'nfc' | 'qr';
  /** true mientras el servidor no confirme. No se muestran como puntos ganados. */
  pending?: boolean;
}

/** Contenido del QR que el visitante muestra y el stand escanea. */
export interface UserQrPayload {
  version: 'v1';
  visitorId: string;
  eventId: string;
  timestamp: number;
  expiresAt: number;
  signature: string;
}
