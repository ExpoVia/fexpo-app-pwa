import type { Mission } from '@/types/domain';

export const MISSIONS: readonly Mission[] = [
  {
    id: 'explorador-expovia',
    title: 'Ruta FIPAZ',
    shortDescription: 'Visita Altura Labs, Kawsay Salud y Sabor Andino.',
    category: 'general',
    standIds: ['stand-altura-labs', 'stand-kawsay-salud', 'stand-sabor-andino'],
    target: 3,
    rewardPoints: 0,
    featured: true,
  },
  {
    id: 'mission-first-contact',
    title: 'Primer contacto',
    shortDescription: 'Registra tu primera visita en cualquier stand.',
    category: 'general',
    target: 1,
    rewardPoints: 100,
    featured: true,
  },
  {
    id: 'mission-tech-pioneer',
    title: 'Pionero tecnológico',
    shortDescription: 'Conoce 2 stands de tecnologia.',
    category: 'technology',
    target: 2,
    rewardPoints: 150,
  },
  {
    id: 'mission-flavors',
    title: 'Ruta de sabores',
    shortDescription: 'Visita 2 puntos gastronomicos.',
    category: 'gastronomy',
    target: 2,
    rewardPoints: 150,
  },
  {
    id: 'mission-explorer',
    title: 'Explorador Fexpo',
    shortDescription: 'Registra visitas en 4 stands distintos.',
    category: 'general',
    target: 4,
    rewardPoints: 300,
    unlockedBy: 'mission-first-contact',
  },
] as const;
