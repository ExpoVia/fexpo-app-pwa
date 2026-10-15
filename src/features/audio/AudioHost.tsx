import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { audioFeedback, type AudioCue } from './feedback';
import { useExperience } from '@/state/experience';

export const useFeedback = create<{
  sounds: boolean;
  voice: boolean;
  vibration: boolean;
  receiptOpen: boolean;
  toggle: (key: 'sounds' | 'voice' | 'vibration') => void;
  holdNotices: (value: boolean) => void;
}>()(
  persist(
    (update) => ({
      sounds: true,
      voice: true,
      vibration: true,
      receiptOpen: false,
      toggle: (key) => update((s) => ({ [key]: !s[key] })),
      holdNotices: (receiptOpen) => update({ receiptOpen }),
    }),
    {
      name: 'fexpo-feedback-v1',
      partialize: (s) => ({ sounds: s.sounds, voice: s.voice, vibration: s.vibration }),
    },
  ),
);
const sources: Record<AudioCue, string> = {
  welcome: 'matilda-welcome.mp3',
  nfcGuide: 'matilda-nfc.mp3',
  notification: 'sonido-05.mp3',
  nfcRead: 'sonido-07.mp3',
};
export function AudioHost() {
  const prefs = useFeedback();
  const { pathname } = useLocation();
  const { notices } = useExperience();
  const [unlocked, setUnlocked] = useState(() => navigator.userActivation?.hasBeenActive || false);
  const seen = useRef<Set<string> | null>(null);
  const pendingNotice = useRef(false);
  useEffect(() => {
    const unlock = () => setUnlocked(true);
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);
  useEffect(
    () =>
      audioFeedback.attach(
        (cue, signal) =>
          new Promise<void>((resolve) => {
            const settings = useFeedback.getState();
            const voice = cue === 'welcome' || cue === 'nfcGuide';
            if (signal.aborted || (voice ? !settings.voice : !settings.sounds)) {
              resolve();
              return;
            }
            const audio = new Audio(`/assets/audio/${sources[cue]}`);
            audio.volume = 0.65;
            let finished = false;
            const finish = () => {
              if (finished) return;
              finished = true;
              clearTimeout(timer);
              audio.pause();
              audio.removeAttribute('src');
              audio.load();
              audio.onended = null;
              audio.onerror = null;
              audio.onplaying = null;
              signal.removeEventListener('abort', finish);
              resolve();
            };
            const timer = setTimeout(finish, 30000);
            audio.onended = finish;
            audio.onerror = finish;
            audio.onplaying = () => {
              if (!voice && settings.vibration) {
                try {
                  navigator.vibrate?.(80);
                } catch {
                  /* Unsupported devices keep audio. */
                }
              }
              audio.onplaying = null;
            };
            signal.addEventListener('abort', finish, { once: true });
            void audio.play().catch(finish);
          }),
      ),
    [],
  );
  useEffect(() => {
    const visibility = () =>
      audioFeedback.setEnabled(unlocked && document.visibilityState === 'visible');
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [unlocked]);
  useEffect(() => {
    if (!unlocked || !prefs.voice) return;
    const cue =
      pathname === '/' ? 'welcome' : ['/scan', '/nfc-test'].includes(pathname) ? 'nfcGuide' : null;
    if (!cue) return;
    audioFeedback.speakOnce(cue);
    return () => audioFeedback.stopVoice(cue);
  }, [pathname, unlocked, prefs.voice]);
  useEffect(() => {
    if (seen.current && notices.some((n) => !seen.current!.has(n.id) && !n.read))
      pendingNotice.current = true;
    seen.current = new Set(notices.map((n) => n.id));
    if (pendingNotice.current && unlocked && !prefs.receiptOpen) {
      pendingNotice.current = false;
      audioFeedback.request('notification');
    }
  }, [notices, unlocked, prefs.receiptOpen]);
  useEffect(() => {
    if (!prefs.voice) {
      audioFeedback.stopVoice('welcome');
      audioFeedback.stopVoice('nfcGuide');
    }
  }, [prefs.voice]);
  return null;
}
export function FeedbackPreferences() {
  const prefs = useFeedback();
  return (
    <div className="card menu-group feedback-settings" aria-label="Audio y vibración">
      {(
        [
          { key: 'sounds', title: 'Sonidos', detail: 'Avisos y lectura NFC' },
          { key: 'voice', title: 'Guía de voz', detail: 'Bienvenida y ayuda NFC · voz femenina' },
          {
            key: 'vibration',
            title: 'Vibración',
            detail: 'Acompaña cada sonido, si tu equipo la admite',
          },
        ] as const
      ).map((item) => (
        <button
          className="menu-link"
          role="switch"
          aria-checked={prefs[item.key]}
          key={item.key}
          onClick={() => prefs.toggle(item.key)}
        >
          <span className="grow">
            <strong>{item.title}</strong>
            <small>{item.detail}</small>
          </span>
          <span className={`toggle ${prefs[item.key] ? 'on' : ''}`} aria-hidden="true">
            <i />
          </span>
        </button>
      ))}
    </div>
  );
}
