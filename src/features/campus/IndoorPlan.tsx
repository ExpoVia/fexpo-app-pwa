import { useEffect } from 'react';
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import { PLAN_LOTS, type PlanGeometry } from '@/data/map-plans';
import { standAtLot, type PlanPosition } from './model';
import type { CampusCamera } from './IndoorScene';
function Controls({ cameraRef }: { cameraRef: React.RefObject<CampusCamera | null> }) {
  const c = useControls();
  useEffect(() => {
    cameraRef.current = {
      zoom: (factor) => (factor > 1 ? c.zoomIn() : c.zoomOut()),
      reset: () => c.resetTransform(),
      rotate: () => {},
      follow: () => c.centerView(),
    };
    return () => {
      cameraRef.current = null;
    };
  }, [c, cameraRef]);
  return null;
}
export default function IndoorPlan({
  plan,
  position,
  selectedLot,
  onSelectLot,
  cameraRef,
}: {
  plan: PlanGeometry;
  position: PlanPosition;
  selectedLot: number | null;
  onSelectLot: (index: number) => void;
  cameraRef: React.RefObject<CampusCamera | null>;
}) {
  return (
    <div className="indoor-plan">
      <TransformWrapper key={plan.id} minScale={0.7} maxScale={6} centerOnInit>
        <Controls cameraRef={cameraRef} />
        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{ width: '100%', height: '100%' }}
        >
          <svg viewBox={plan.viewBox} className="indoor-svg" aria-label={`Plano de ${plan.name}`}>
            <path d={plan.outline} fill="var(--surface)" stroke={plan.color} strokeWidth={5} />
            {plan.structures.map((s, i) => (
              <g key={i}>
                <path
                  d={s.path}
                  fill="var(--surface-muted)"
                  stroke="var(--border)"
                  strokeWidth={2}
                />
                <text x={s.x} y={s.y} textAnchor="middle" fontSize={15} fill="var(--muted)">
                  {s.label}
                </text>
              </g>
            ))}
            {PLAN_LOTS[plan.id].map(([code, x, y, w, h], index) => {
              const stand = standAtLot(plan.id, code);
              return (
                <g
                  key={index}
                  data-lot={String(code)}
                  role="button"
                  tabIndex={0}
                  aria-label={
                    stand ? `Ver ${stand.name}, stand ${stand.boothCode}` : `Espacio ${code}`
                  }
                  onClick={() => onSelectLot(index)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectLot(index);
                    }
                  }}
                >
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill={
                      selectedLot === index
                        ? '#087ec2'
                        : stand
                          ? plan.color
                          : `color-mix(in srgb, ${plan.color} 14%, var(--surface))`
                    }
                    stroke={selectedLot === index ? '#087ec2' : plan.color}
                    strokeWidth={selectedLot === index ? 4 : 1.3}
                  />
                  <text
                    x={x + w / 2}
                    y={y + h / 2 + 5}
                    textAnchor="middle"
                    fontSize={w < 35 ? 12 : 16}
                    fill={stand || selectedLot === index ? 'white' : 'var(--ink)'}
                  >
                    {code}
                  </text>
                </g>
              );
            })}
            <g
              className="indoor-avatar"
              data-avatar-x={position.x}
              data-avatar-y={position.y}
              transform={`translate(${position.x} ${position.y})`}
              aria-label="Avatar"
            >
              <circle r={19} fill="#219bea" opacity={0.18} />
              <circle r={10} fill="#087ec2" stroke="white" strokeWidth={4} />
            </g>
          </svg>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
