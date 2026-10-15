import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, LockKeyhole, Trophy } from 'lucide-react';
import { MISSIONS } from '@/data/missions';
import { REWARDS } from '@/data/rewards';
import { useDemo, missionValue, missionArt, pointsFor } from '@/state/demo';
import { Art, Progress, SectionTitle, Points, Modal, Pill } from '@/ui/components';

export function RewardCards({ grid = false }: { grid?: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const state = useDemo();
  const points = pointsFor(state.visits, state.redeemed);
  const reward = REWARDS.find((r) => r.id === selected);
  const redeemed = reward && state.redeemed.includes(reward.id);
  return (
    <>
      <div className={grid ? 'reward-grid' : 'reward-carousel'}>
        {REWARDS.map((item) => (
          <button className="reward-card" key={item.id} onClick={() => setSelected(item.id)}>
            <span className="reward-image">
              <Art name="rewards" size={78} />
            </span>
            <strong>{item.title}</strong>
            <Points value={item.cost} small />
            {state.redeemed.includes(item.id) && (
              <small className="success-text">Canje simulado</small>
            )}
          </button>
        ))}
      </div>
      {reward && (
        <Modal title={reward.title} onClose={() => setSelected(null)}>
          <div className="reward-detail">
            <Art name="rewards" size={140} />
          </div>
          <Pill tone="gold">Premio de demostración</Pill>
          <p>{reward.description}</p>
          <small className="muted">{reward.stockLabel} · disponibilidad ilustrativa</small>
          <Points value={reward.cost} />
          <button
            className="button"
            disabled={!!redeemed || points < reward.cost || !state.signedIn}
            onClick={() => state.redeem(reward.id)}
          >
            {redeemed
              ? 'Canje simulado'
              : !state.signedIn
                ? 'Activa la sesión demo desde Perfil'
                : points < reward.cost
                  ? `Te faltan ${reward.cost - points} puntos demo`
                  : 'Simular canje'}
          </button>
          <p className="footnote">Este prototipo no entrega premios ni genera cupones reales.</p>
        </Modal>
      )}
    </>
  );
}
export function MissionsPage() {
  const visits = useDemo((s) => s.visits);
  const done = MISSIONS.filter((m) => missionValue(m, visits) >= m.target).length;
  return (
    <div className="stack">
      <div className="mission-hero">
        <div className="row">
          <span className="grow">
            <b>
              {done}
              <small>/ {MISSIONS.length}</small>
            </b>
            <p>misiones completadas</p>
          </span>
          <span className="trophy-art">
            <Trophy size={53} fill="currentColor" strokeWidth={1.3} />
          </span>
        </div>
        <Progress value={done} total={MISSIONS.length} label="Misiones completadas" />
      </div>
      <div className="mission-list">
        {MISSIONS.map((mission) => {
          const value = missionValue(mission, visits);
          const complete = value >= mission.target;
          const locked =
            !!mission.unlockedBy &&
            missionValue(MISSIONS.find((m) => m.id === mission.unlockedBy)!, visits) === 0;
          return (
            <Link
              to={`/stands?category=${mission.category}`}
              key={mission.id}
              className={`mission-row ${locked ? 'locked' : ''}`}
            >
              <span className="mission-image">
                <Art name={missionArt(mission.id)} size={43} />
                {complete && (
                  <i>
                    <Check size={11} strokeWidth={3} />
                  </i>
                )}
              </span>
              <span className="grow">
                <span className="row mission-title">
                  <strong>{mission.title}</strong>
                  <b className={complete ? 'success-text' : 'muted'}>
                    {value}/{mission.target}
                  </b>
                </span>
                <small className="mission-description">
                  {locked
                    ? 'Completa Primer contacto para desbloquearla.'
                    : mission.shortDescription}
                </small>
                <Progress
                  value={value}
                  total={mission.target}
                  label={mission.title}
                  success={complete}
                />
              </span>
              {locked && <LockKeyhole size={14} className="muted" />}
            </Link>
          );
        })}
      </div>
      <SectionTitle to="/rewards">Premios</SectionTitle>
      <RewardCards />
      <p className="footnote">
        Las visitas simuladas actualizan este recorrido. No se acreditan puntos reales.
      </p>
    </div>
  );
}
export function RewardsPage() {
  return (
    <div className="stack">
      <div className="section-intro">
        <span className="eyebrow">CADA VISITA CUENTA</span>
        <h2>
          Pequeñas recompensas.
          <br />
          Grandes experiencias.
        </h2>
        <p>Descubre los beneficios de explorar la feria.</p>
      </div>
      <RewardCards grid />
    </div>
  );
}
