export type AudioCue = 'welcome' | 'nfcGuide' | 'notification' | 'nfcRead';
export type AudioPlayback = (cue: AudioCue, signal: AbortSignal) => Promise<void>;
const isVoice = (cue: AudioCue) => cue === 'welcome' || cue === 'nfcGuide';

/** One channel: effects interrupt speech, NFC takes priority, background cancels. */
export class AudioFeedback {
  private playback: AudioPlayback | null = null;
  private enabled = true;
  private queue: AudioCue[] = [];
  private active: { cue: AudioCue; controller: AbortController } | null = null;
  private spoken = new Set<AudioCue>();

  attach(playback: AudioPlayback) {
    this.playback = playback;
    this.drain();
    return () => {
      this.clear();
      this.playback = null;
    };
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.clear();
    else this.drain();
  }

  speakOnce(cue: 'welcome' | 'nfcGuide') {
    if (!this.enabled || this.spoken.has(cue)) return;
    this.spoken.add(cue);
    this.request(cue);
  }

  request(cue: AudioCue) {
    if (!this.enabled) return;
    if (!isVoice(cue) && this.active && isVoice(this.active.cue)) this.active.controller.abort();
    if (cue === 'nfcRead') {
      this.queue = this.queue.filter((item) => !isVoice(item));
      this.queue.unshift(cue);
    } else {
      this.queue.push(cue);
    }
    this.drain();
  }

  stopVoice(cue: 'welcome' | 'nfcGuide') {
    this.queue = this.queue.filter((item) => item !== cue);
    if (this.active?.cue === cue) this.active.controller.abort();
  }

  private clear() {
    this.queue = [];
    this.active?.controller.abort();
  }

  private drain() {
    if (!this.enabled || !this.playback || this.active || !this.queue.length) return;
    const job = { cue: this.queue.shift()!, controller: new AbortController() };
    this.active = job;
    // An audio failure must never block the next cue or affect a domain action.
    void this.playback(job.cue, job.controller.signal)
      .catch(() => undefined)
      .finally(() => {
        if (this.active === job) this.active = null;
        this.drain();
      });
  }
}

export const audioFeedback = new AudioFeedback();
