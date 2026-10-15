import { useEffect, useRef, type ReactNode, type CSSProperties } from 'react';
import {
  ChevronRight,
  X,
  Gift,
  Cpu,
  HeartPulse,
  Landmark,
  Utensils,
  GraduationCap,
  Sprout,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { StandCategory } from '@/types/domain';
import { LIVE } from '@/services/config';

export function Art({
  name,
  size = 44,
  className = '',
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const path = ['map', 'stands', 'checkin', 'missions', 'rewards', 'my-qr'].includes(name)
    ? `quick-actions/${name}-v2.png`
    : `experience/${name}.png`;
  return (
    <img
      className={`art ${className}`}
      src={`/assets/${path}`}
      width={size}
      height={size}
      alt=""
      draggable="false"
    />
  );
}
export function Progress({
  value,
  total,
  label = 'Progreso',
  success = false,
}: {
  value: number;
  total: number;
  label?: string;
  success?: boolean;
}) {
  return (
    <span
      className={`progress ${success ? 'progress-success' : ''}`}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.min(value, total)}
      aria-valuemin={0}
      aria-valuemax={total}
    >
      <span style={{ width: `${total ? Math.min(value / total, 1) * 100 : 0}%` }} />
    </span>
  );
}
export function Points({ value, small = false }: { value: number | null; small?: boolean }) {
  return (
    <span
      className={`points-pill ${small ? 'small' : ''}`}
      aria-label={
        value == null
          ? 'Saldo pendiente de actualizar'
          : `${value} puntos${LIVE ? '' : ' de demostración'}`
      }
    >
      <CircleStar size={small ? 14 : 18} strokeWidth={2.3} />
      {value ?? '—'}
      {small && ' pts'}
    </span>
  );
}
export function CircleStar({
  size = 20,
  strokeWidth = 2,
}: {
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.5" />
      <path
        d="m12 6 1.8 3.8 4.2.6-3 3 .7 4.2-3.7-2-3.7 2 .7-4.2-3-3 4.2-.6Z"
        fill="currentColor"
        strokeWidth=".5"
      />
    </svg>
  );
}
export function SectionTitle({
  children,
  to,
  label = 'Ver todos',
}: {
  children: ReactNode;
  to?: string;
  label?: string;
}) {
  return (
    <div className="section-title">
      <h2>{children}</h2>
      {to && <Link to={to}>{label}</Link>}
    </div>
  );
}
export function Pill({ children, tone = 'blue' }: { children: ReactNode; tone?: string }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}
export function MenuLink({
  to,
  icon: Icon,
  title,
  description,
  tone = 'blue',
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  tone?: string;
}) {
  return (
    <Link className="menu-link" to={to}>
      <span className={`menu-icon ${tone}`}>
        <Icon size={23} />
      </span>
      <span className="grow">
        <strong>{title}</strong>
        {description && <small>{description}</small>}
      </span>
      <ChevronRight size={19} className="muted" />
    </Link>
  );
}
export function Empty({
  title,
  children,
  art = 'explorer',
  action,
}: {
  title: string;
  children?: ReactNode;
  art?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Art name={art} size={76} />
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'wide' : ''}`}
      aria-labelledby="modal-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close();
      }}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button
            className="icon-button"
            aria-label="Cerrar ventana"
            onClick={() => ref.current?.close()}
          >
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
export const categoryMeta: Record<
  StandCategory,
  { label: string; icon: LucideIcon; color: string; art: string }
> = {
  technology: { label: 'Tecnología', icon: Cpu, color: '#1684be', art: 'technology' },
  health: { label: 'Salud', icon: HeartPulse, color: '#df765f', art: 'contact' },
  finance: { label: 'Finanzas', icon: Landmark, color: '#9062ba', art: 'level' },
  gastronomy: { label: 'Gastronomía', icon: Utensils, color: '#d4a12d', art: 'food' },
  education: { label: 'Educación', icon: GraduationCap, color: '#608eb8', art: 'technology' },
  startups: { label: 'Emprendimientos', icon: Sprout, color: '#419b75', art: 'explorer' },
};
export function CategoryTile({
  category,
  large = false,
}: {
  category: StandCategory;
  large?: boolean;
}) {
  const meta = categoryMeta[category];
  return (
    <span
      className={`category-tile ${large ? 'large' : ''}`}
      style={{ '--category-color': meta.color } as CSSProperties}
    >
      <Art name={meta.art} size={large ? 88 : 44} />
    </span>
  );
}
export function GiftArt() {
  return (
    <div className="gift-art">
      <Art name="rewards" size={70} />
      <Gift className="sr-only" />
    </div>
  );
}
