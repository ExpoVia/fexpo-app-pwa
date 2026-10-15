import { useEffect, useRef, useState } from 'react';
import type { PlanPosition } from './model';
export interface GpsFix {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}
export function displacement(a: GpsFix, b: GpsFix) {
  const radians = Math.PI / 180;
  return {
    east:
      (b.longitude - a.longitude) *
      radians *
      6371000 *
      Math.cos(((a.latitude + b.latitude) / 2) * radians),
    north: (b.latitude - a.latitude) * radians * 6371000,
  };
}
export function relativePosition(
  origin: PlanPosition,
  first: GpsFix,
  current: GpsFix,
): PlanPosition {
  const { east, north } = displacement(first, current);
  // Provisional local scale, 10 SVG units per metre. Not a surveyed transform.
  return { x: origin.x + east * 10, y: origin.y - north * 10 };
}
export function useRelativeGps(planId: string) {
  const [status, setStatus] = useState<'off' | 'waiting' | 'active' | 'paused' | 'error'>('off');
  const [position, setPosition] = useState<PlanPosition | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState('');
  const watch = useRef<number | null>(null);
  const session = useRef(0);
  const anchor = useRef<{ fix: GpsFix; point: PlanPosition } | null>(null);
  const accepted = useRef<GpsFix | null>(null);
  const latest = useRef<GpsFix | null>(null);
  const clearWatch = () => {
    session.current++;
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
  };
  useEffect(() => {
    clearWatch();
    anchor.current = null;
    latest.current = null;
    accepted.current = null;
    setStatus('off');
    setPosition(null);
    setAccuracy(null);
    setError('');
    const hide = () => {
      if (document.hidden) {
        clearWatch();
        setStatus((s) => (s === 'waiting' || s === 'active' ? 'paused' : s));
      }
    };
    document.addEventListener('visibilitychange', hide);
    return () => {
      clearWatch();
      document.removeEventListener('visibilitychange', hide);
    };
  }, [planId]);
  const start = (point: PlanPosition) => {
    clearWatch();
    setError('');
    if (!window.isSecureContext || !navigator.geolocation) {
      setStatus('error');
      setError('Para usar GPS abre la app mediante HTTPS o localhost.');
      return;
    }
    setStatus('waiting');
    anchor.current = null;
    accepted.current = null;
    latest.current = null;
    const generation = session.current;
    try {
      watch.current = navigator.geolocation.watchPosition(
        (event) => {
          if (generation !== session.current || document.hidden) return;
          const fix = {
            latitude: event.coords.latitude,
            longitude: event.coords.longitude,
            accuracy: event.coords.accuracy,
            timestamp: event.timestamp,
          };
          if (
            ![fix.latitude, fix.longitude, fix.accuracy, fix.timestamp].every(Number.isFinite) ||
            fix.accuracy < 0
          )
            return;
          if (
            Date.now() - fix.timestamp > 15000 ||
            (latest.current && fix.timestamp <= latest.current.timestamp)
          )
            return;
          latest.current = fix;
          setAccuracy(fix.accuracy);
          setStatus('active');
          if (fix.accuracy > 35) {
            setError('Señal GPS débil. El avatar espera una lectura más precisa.');
            return;
          }
          setError('');
          if (!anchor.current) {
            anchor.current = { fix, point: { ...point } };
            accepted.current = fix;
            setPosition({ ...point });
            return;
          }
          const last = accepted.current!;
          const delta = displacement(last, fix);
          // Suppress stationary jitter; GPS cannot reliably report centimetre steps.
          if (Math.hypot(delta.east, delta.north) < Math.max(1.5, Math.min(5, fix.accuracy * 0.3)))
            return;
          const distance = displacement(last, fix);
          if (Math.hypot(distance.east, distance.north) > 500) {
            setError('Salto de GPS detectado. Reinicia Mi ubicación desde donde estás.');
            return;
          }
          accepted.current = fix;
          setPosition(relativePosition(anchor.current.point, anchor.current.fix, fix));
        },
        (failure) => {
          if (generation !== session.current) return;
          if (failure.code === 1) clearWatch();
          setStatus('error');
          setError(
            failure.code === 1
              ? 'Permite la ubicación en el navegador para mover el avatar.'
              : failure.code === 3
                ? 'El GPS está tardando. Puedes reintentar en un lugar con mejor señal.'
                : 'No pudimos obtener tu ubicación. Comprueba que el GPS esté activo.',
          );
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
      );
    } catch {
      clearWatch();
      setStatus('error');
      setError('No se pudo iniciar el GPS. Revisa el permiso de ubicación.');
    }
  };
  const stop = (reset = false) => {
    clearWatch();
    setStatus('off');
    if (reset) setPosition(null);
    setAccuracy(null);
    setError('');
  };
  return { status, position, accuracy, error, start, stop };
}
