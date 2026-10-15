import type { Reward } from '@/types/domain';

export const REWARDS: readonly Reward[] = [
  {
    id: 'reward-coffee',
    title: 'Cafe de cortesia',
    description: 'Retíralo en el stand de Sabor Andino mostrando tu código.',
    cost: 250,
    stockLabel: '100 por día',
  },
  {
    id: 'reward-diagnostic',
    title: 'Diagnostico de procesos (30 min)',
    description: 'Sesión agendada después de la feria con Altura Labs.',
    cost: 500,
    stockLabel: '20 cupos',
  },
  {
    id: 'reward-kit',
    title: 'Kit de escritorio',
    description: 'Stock limitado, entrega en el stand.',
    cost: 400,
    stockLabel: '30 unidades',
  },
] as const;
