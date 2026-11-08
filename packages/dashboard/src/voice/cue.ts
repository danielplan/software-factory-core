// A short, soft sound when the owner's turn is sent: two quiet notes going
// up, so they hear that it was taken and the AI is working on it. Made by the
// browser's Web Audio; nothing plays where it is missing (the tests).

let audio: AudioContext | null = null;

export function playCue(): void {
  if (typeof AudioContext === "undefined") return;
  audio ??= new AudioContext();
  const start = audio.currentTime;
  for (const [index, frequency] of [660, 880].entries()) {
    const at = start + index * 0.09;
    const tone = audio.createOscillator();
    const volume = audio.createGain();
    tone.type = "sine";
    tone.frequency.value = frequency;
    volume.gain.setValueAtTime(0, at);
    volume.gain.linearRampToValueAtTime(0.08, at + 0.015);
    volume.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    tone.connect(volume).connect(audio.destination);
    tone.start(at);
    tone.stop(at + 0.18);
  }
}
