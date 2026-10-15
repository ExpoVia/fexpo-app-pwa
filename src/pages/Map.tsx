import { lazy, Suspense } from 'react';
import { LIVE } from '@/services/config';
import { LiveMap } from './LiveMap';
import '@/features/campus/campus.css';
const CampusMap = lazy(() => import('@/features/campus/CampusMap'));
export function MapPage() {
  return LIVE ? (
    <LiveMap />
  ) : (
    <Suspense
      fallback={
        <div className="loading-view" role="status">
          Cargando el recinto…
        </div>
      }
    >
      <CampusMap />
    </Suspense>
  );
}
