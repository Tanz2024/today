// Small, optional feedback layer for the canvas games. It never throws when a
// browser blocks audio or does not expose vibration.
export function createGameFeedback() {
  let audio: AudioContext | null = null;
  const enabled = () => {
    try { return window.localStorage.getItem("brisastory:play:sound") !== "off"; } catch { return true; }
  };
  const tone = (frequency: number, duration = 0.08, volume = 0.025) => {
    if (typeof window === "undefined" || !enabled()) return;
    try {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      audio ??= new AudioCtor();
      if (audio.state === "suspended") void audio.resume();
      const oscillator = audio.createOscillator(); const gain = audio.createGain();
      oscillator.type = "sine"; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, audio.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
      oscillator.connect(gain).connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + duration);
    } catch { /* optional */ }
  };
  const vibrate = (pattern: number | number[]) => {
    try { if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern); } catch { /* optional */ }
  };
  return { tone, vibrate };
}
