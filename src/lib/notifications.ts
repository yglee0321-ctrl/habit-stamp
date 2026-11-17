// Web Audio Synthesizer for pleasant tactile feedback and reminder alarms
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a cheerful chime when completing a habit
 */
export function playCompletionSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    // Harmonic chord: C5 -> E5 -> G5 -> C6
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.08); // E5
    osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.16); // G5
    osc1.frequency.exponentialRampToValueAtTime(1046.50, now + 0.24); // C6

    osc2.frequency.setValueAtTime(261.63, now); // C4
    osc2.frequency.setValueAtTime(523.25, now + 0.16);

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  } catch (err) {
    console.warn('Audio playback failed', err);
  }
}

/**
 * Play a gentle reminder chime
 */
export function playReminderSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Two pleasant bell notes
    const freqs = [880, 1174.66]; // A5 -> D6
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.18;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  } catch (err) {
    console.warn('Reminder audio playback failed', err);
  }
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Send a web notification
 */
export function sendHabitNotification(title: string, body: string): void {
  playReminderSound();
  if (isNotificationSupported() && Notification.permission === 'granted') {
    try {
      new Notification(`🌱 습관 알림: ${title}`, {
        body,
        icon: '/favicon.ico',
        tag: `habit-${title}-${Date.now()}`,
      });
    } catch {
      // Fallback if worker or iframe environment blocks direct Notification
    }
  }
}
