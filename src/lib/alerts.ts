/**
 * Alerts outside the page: browser (desktop) notifications and a short chime. Both are choices
 * of this device, kept in localStorage; the browser's own permission still has the last word.
 */

const DESKTOP_KEY = "edu.alerts.desktop";
const SOUND_KEY = "edu.alerts.sound";

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export type DesktopState = "unsupported" | "denied" | "on" | "off";

export function desktopState(): DesktopState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return Notification.permission === "granted" && read(DESKTOP_KEY) !== "0" ? "on" : "off";
}

/** Turns desktop alerts on (asking the browser if needed) or off; resolves to the new state. */
export async function setDesktopAlerts(on: boolean): Promise<DesktopState> {
  if (desktopState() === "unsupported") return "unsupported";
  if (!on) {
    write(DESKTOP_KEY, "0");
    return desktopState();
  }
  if (Notification.permission === "default") await Notification.requestPermission();
  write(DESKTOP_KEY, "1");
  return desktopState();
}

/**
 * Shows a desktop alert while the tab is hidden; a click brings the tab back and runs `onClick`.
 * `requireInteraction` keeps it on screen until it is clicked or closed (an incoming call); the
 * returned alert lets the caller close it sooner.
 */
export function desktopAlert(
  title: string,
  body: string,
  opts: { tag?: string; onClick?: () => void; requireInteraction?: boolean } = {},
): Notification | undefined {
  if (desktopState() !== "on" || document.visibilityState === "visible") return;
  try {
    const n = new Notification(title, {
      body: body.slice(0, 180),
      tag: opts.tag,
      icon: "/favicon.ico",
      lang: document.documentElement.lang,
      dir: "auto",
      requireInteraction: opts.requireInteraction,
    });
    n.onclick = () => {
      window.focus();
      opts.onClick?.();
      n.close();
    };
    return n;
  } catch {}
}

export function soundOn() {
  return read(SOUND_KEY) !== "0";
}

export function setSound(on: boolean) {
  write(SOUND_KEY, on ? "1" : "0");
}

let audio: AudioContext | null = null;
let lastChime = 0;

/** How often an incoming call rings: a one-second trill, then two seconds of quiet. */
const RING_EVERY_MS = 3_000;

/**
 * A phone ringing until the returned function stops it: a trill (when sound is on) and a buzz on
 * phones. Browsers stay silent until the page has been touched once; the buzz and the screen
 * itself still tell the person.
 */
export function ringtone(): () => void {
  const ring = () => {
    if (soundOn()) trill();
    try {
      navigator.vibrate?.([400, 200, 400]);
    } catch {}
  };
  ring();
  const timer = setInterval(ring, RING_EVERY_MS);
  return () => {
    clearInterval(timer);
    try {
      navigator.vibrate?.(0);
    } catch {}
  };
}

function trill() {
  try {
    audio ??= new AudioContext();
    void audio.resume().catch(() => undefined);
    const start = audio.currentTime;
    for (let i = 0; i < 12; i++) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.value = i % 2 ? 660 : 880;
      const at = start + i * 0.08;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.07, at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.075);
      osc.connect(gain).connect(audio.destination);
      osc.start(at);
      osc.stop(at + 0.08);
    }
  } catch {}
}

/** Two soft notes; at most one chime every two seconds however many events arrive. */
export function chime() {
  if (!soundOn() || Date.now() - lastChime < 2_000) return;
  lastChime = Date.now();
  try {
    audio ??= new AudioContext();
    const start = audio.currentTime;
    for (const [i, freq] of [880, 1320].entries()) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const at = start + i * 0.12;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.08, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
      osc.connect(gain).connect(audio.destination);
      osc.start(at);
      osc.stop(at + 0.3);
    }
  } catch {}
}
