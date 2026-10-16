// Whether something the owner said while the coach speaks asks it to stop,
// as plain rules (used by the call rules in call.ts).

// What the owner says to stop the coach's voice. Nothing else stops it.
export const STOP_WORDS = [
  "stop",
  "basta",
  "fermati",
  "ferma",
  "fermo",
  "zitto",
  "zitta",
  "silenzio",
  "aspetta",
  "smettila",
  "smetti",
  "wait",
  "hold on",
  "quiet",
  "shut up",
  "stopp",
  "warte",
  "ruhe",
  "arrete",
  "attends",
  "silence",
  "detente",
  "espera",
  "silencio",
  "callate",
];

// Whether the owner asked the coach to stop: a stop word, unless it only
// comes from the coach's own voice ("basta un pulsante" said by the coach and
// heard back from the speakers). A request is short ("basta", "stop now"),
// while the echo comes back as longer pieces of the coach's sentences.
export function asksToStop(heard: string, speech: string): boolean {
  const said = ` ${words(heard).join(" ")} `;
  const asked = STOP_WORDS.filter((word) => said.includes(` ${word} `));
  if (asked.length === 0) return false;
  const own = ` ${words(speech).join(" ")} `;
  const echo = asked.every((word) => own.includes(` ${word} `));
  return !echo || words(heard).length <= 2 || isInterruption(heard, speech);
}

// Words that mostly come from what is being spoken are the coach's echo;
// enough other words mean the owner is talking.
export function isInterruption(heard: string, speech: string): boolean {
  const spoken = new Set(words(speech));
  const other = words(heard).filter((word) => !spoken.has(word));
  const all = words(heard).length;
  return other.length >= 3 || (other.length > 0 && other.length / all >= 0.5);
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}
