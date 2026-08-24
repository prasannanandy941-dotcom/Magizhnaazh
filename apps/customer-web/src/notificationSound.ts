// A short, bright two-tone chime played when a notification appears.
// Generated with the Web Audio API so there's no audio asset to ship or load.
//
// Browsers block audio until the user has interacted with the page, and they
// keep an AudioContext "suspended" if it was first created outside a gesture
// (e.g. from a background timer). To stay reliable we create the context up
// front and *unlock* it on the first real user gesture (click / key / touch),
// so every later sound — even one fired from a poll — plays immediately.
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    return audioCtx;
  } catch {
    return null;
  }
}

function unlock() {
  const ctx = getCtx();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  window.removeEventListener('pointerdown', unlock);
  window.removeEventListener('keydown', unlock);
  window.removeEventListener('touchstart', unlock);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  window.addEventListener('touchstart', unlock);
}

// One bell-like note: a fundamental sine plus a quieter octave for sparkle,
// with a fast attack and a smooth ring-out decay.
function playNote(ctx: AudioContext, freq: number, startAt: number, peak: number) {
  const dur = 0.6;

  const osc = ctx.createOscillator();
  const overtone = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  overtone.type = 'sine';
  osc.frequency.value = freq;
  overtone.frequency.value = freq * 2; // octave up = brightness

  const overtoneGain = ctx.createGain();
  overtoneGain.gain.value = 0.35;

  osc.connect(gain);
  overtone.connect(overtoneGain);
  overtoneGain.connect(gain);
  gain.connect(ctx.destination);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);

  osc.start(startAt);
  overtone.start(startAt);
  osc.stop(startAt + dur);
  overtone.stop(startAt + dur);
}

export function playNotificationSound() {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const now = ctx.currentTime;
    // Two ascending notes — a clear, friendly "ding-ding" chime.
    playNote(ctx, 784, now, 0.5);          // G5
    playNote(ctx, 1174.66, now + 0.14, 0.5); // D6
  } catch {
    // Audio is a nice-to-have; never let it break the notification itself.
  }
}
