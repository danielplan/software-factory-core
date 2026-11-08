// The computer's own voices, through the browser, for when Piper cannot be
// used: Microsoft's on Windows (its natural voices when the page is open in
// Edge), Apple's on a Mac (see pickVoice). A sentence the browser could not
// play, or that does not start within a few seconds, is reported instead of
// being taken as said, so the screen never says "Speaking" in silence.

import { type Language, LANGUAGES } from "./languages";

import {
  type Outcome,
  type Saying,
  START_WITHIN_MS,
  type Voice,
} from "./voice";

// Errors the browser gives when a sentence is cut short on purpose.
const CUT_SHORT = ["interrupted", "canceled"];

// The browser's speech, when it has one: some browsers and test pages have
// none, or no way to hear when the list of voices changes.
type Synthesis = Pick<SpeechSynthesis, "getVoices" | "speak" | "cancel"> &
  Partial<Pick<SpeechSynthesis, "addEventListener">>;

function browserSpeech(): Synthesis | undefined {
  return (globalThis as { speechSynthesis?: Synthesis }).speechSynthesis;
}

export class BrowserVoice implements Voice {
  // The sentence being said, kept so the browser does not drop its events.
  private current: SpeechSynthesisUtterance | null = null;

  constructor() {
    // Chrome loads its list of voices on first use; ask early.
    browserSpeech()?.getVoices();
  }

  async has(language: Language): Promise<boolean> {
    return Boolean(pickVoice(await voices(), language));
  }

  async speak(
    text: string,
    language: Language,
    saying: Saying,
  ): Promise<Outcome> {
    const list = await voices();
    if (!saying.stillWanted()) return "stopped";
    const voice = pickVoice(list, language);
    const synthesis = browserSpeech();
    if (!voice || !synthesis) return "no-voice";
    return await new Promise<Outcome>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      const end = (outcome: Outcome) => {
        clearTimeout(silent);
        if (this.current === utterance) this.current = null;
        resolve(outcome);
      };
      // Silent too long: it counts as failed (the status line says so).
      const silent = setTimeout(() => {
        end("failed");
      }, START_WITHIN_MS);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.onstart = () => {
        clearTimeout(silent);
      };
      utterance.onend = () => {
        end("said");
      };
      utterance.onerror = (event) => {
        if (CUT_SHORT.includes(event.error)) {
          end("said");
          return;
        }
        end("failed");
      };
      this.current = utterance;
      saying.onCut(() => {
        end("stopped");
      });
      synthesis.speak(utterance);
    });
  }

  cancel(): void {
    browserSpeech()?.cancel();
  }
}

// The browser's voices; Chrome may need a moment to list them at first.
async function voices(): Promise<SpeechSynthesisVoice[]> {
  const synthesis = browserSpeech();
  if (!synthesis) return [];
  const now = synthesis.getVoices();
  if (now.length > 0) return now;
  return await new Promise((resolve) => {
    const done = () => {
      resolve(synthesis.getVoices());
    };
    synthesis.addEventListener?.("voiceschanged", done, { once: true });
    setTimeout(done, 2000);
  });
}

// Apple's joke and old-style voices ("Eddy (Italian (Italy))", "Bubbles"…),
// which a Mac lists next to the real ones.
const NOVELTY = [
  ...["Eddy", "Flo", "Grandma", "Grandpa", "Reed", "Rocko", "Sandy"],
  ...["Shelley", "Albert", "Bad News", "Bahh", "Bells", "Boing", "Bubbles"],
  ...["Cellos", "Good News", "Jester", "Organ", "Superstar", "Trinoids"],
  ...["Whisper", "Wobble", "Zarvox"],
];
const isNovelty = (name: string) =>
  NOVELTY.some((joke) => name === joke || name.startsWith(`${joke} (`));

// The better versions of an Apple voice, which the owner can download in the
// Mac's settings: Premium sounds most like a person, then Enhanced.
const QUALITY = [/\(Premium\)/, /\(Enhanced\)/];

// The voice for the language: one of Edge's natural voices when the page is
// open in Edge, otherwise one on this computer: Apple's best version of a
// voice, else the system's default. Chrome's own online voices are not used.
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  language: Language,
): SpeechSynthesisVoice | undefined {
  const speaks = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith(language),
  );
  const natural = speaks.filter((voice) => /(Natural)/i.test(voice.name));
  // Microsoft Edge's natural voices, best first (languages.ts): they sound
  // like a person. The coach's sentences are then sent to Microsoft to be
  // spoken, never the owner's voice.
  for (const name of LANGUAGES[language].natural) {
    const found = natural.find((voice) => voice.name.includes(` ${name} `));
    if (found) return found;
  }
  if (natural[0]) return natural[0];
  const local = speaks.filter(
    (voice) => voice.localService && !isNovelty(voice.name),
  );
  for (const quality of QUALITY) {
    const found = local.find((voice) => quality.test(voice.name));
    if (found) return found;
  }
  return local.find((voice) => voice.default) ?? local[0];
}
