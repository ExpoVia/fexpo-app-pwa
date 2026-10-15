import { describe, expect, it, vi } from 'vitest';
import { AudioFeedback } from '@/features/audio/feedback';
const tick = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};
describe('Audio aprobado: un canal y prioridad de lectura', () => {
  it('interrumpe voz, prioriza NFC y continúa con el aviso', async () => {
    const engine = new AudioFeedback();
    const starts: string[] = [];
    const signals: AbortSignal[] = [];
    const finishes: (() => void)[] = [];
    engine.attach(
      (cue, signal) =>
        new Promise((resolve) => {
          starts.push(cue);
          signals.push(signal);
          finishes.push(resolve);
          signal.addEventListener('abort', () => resolve(), { once: true });
        }),
    );
    engine.speakOnce('welcome');
    engine.request('notification');
    engine.request('nfcRead');
    expect(signals[0].aborted).toBe(true);
    await tick();
    expect(starts).toEqual(['welcome', 'nfcRead']);
    finishes[1]();
    await tick();
    expect(starts).toEqual(['welcome', 'nfcRead', 'notification']);
    finishes[2]();
  });
  it('detiene audio al ocultar la app y no repite la bienvenida', async () => {
    const engine = new AudioFeedback();
    const playback = vi.fn(
      (_cue, signal: AbortSignal) =>
        new Promise<void>((resolve) => signal.addEventListener('abort', () => resolve())),
    );
    const detach = engine.attach(playback);
    engine.speakOnce('welcome');
    engine.speakOnce('welcome');
    expect(playback).toHaveBeenCalledTimes(1);
    engine.setEnabled(false);
    expect(playback.mock.calls[0][1].aborted).toBe(true);
    await tick();
    detach();
  });
});
