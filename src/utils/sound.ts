let audioCtx: AudioContext | null = null;
let _muted: boolean | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function storedMuted(): boolean {
  try {
    return localStorage.getItem('wheel_muted') === 'true';
  } catch {
    return false;
  }
}

export function isMuted(): boolean {
  if (_muted === null) _muted = storedMuted();
  return _muted;
}

export function toggleMute(): boolean {
  _muted = !isMuted();
  localStorage.setItem('wheel_muted', String(_muted));
  return _muted;
}

/** Short tick blip — played when crossing sector boundaries during spin */
export function playTick() {
  if (isMuted()) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1200;
    osc.type = 'sine';
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.start(t);
    osc.stop(t + 0.04);
  } catch {
    /* audio not available */
  }
}

/** Ascending celebration chime when result lands */
export function playWin() {
  if (isMuted()) return;
  try {
    const ctx = getCtx();
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'triangle';
      const t = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  } catch {
    /* audio not available */
  }
}
