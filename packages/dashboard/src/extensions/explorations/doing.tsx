// PROTOTYPE (X-18, A): how the kobold says what it is doing while it thinks.
// Three ways, chosen by the page address (?variant=A|B|C, A without it, kept
// for the visit):
//   A. each step, in plain words ("Reading the product's description")
//   B. a few stages, only where it is ("Reading up on the product" →
//      "Thinking it through" → "Drawing on the board")
//   C. in its own words: the short line Doodle writes before it looks
// Words are written straight in, in English: the build translates them.

import { Check } from "lucide-react";
import { useRef } from "react";

import type { ExplorationPage } from "@/api/client";
import { cn } from "@/lib/utils";

type Talk = ExplorationPage["talk"];
export type Variant = "A" | "B" | "C";

// A value in the page address (before or after the #).
function fromAddress(name: string): string | null {
  const hash = window.location.hash;
  const inHash = hash.includes("?") ? hash.slice(hash.indexOf("?")) : "";
  return (
    new URLSearchParams(window.location.search).get(name) ??
    new URLSearchParams(inHash).get(name)
  );
}

function chooseVariant(): Variant {
  const key = "prototype-variant";
  const asked = fromAddress("variant")?.toUpperCase();
  if (asked === "A" || asked === "B" || asked === "C") {
    window.sessionStorage.setItem(key, asked);
    return asked;
  }
  const kept = window.sessionStorage.getItem(key);
  return kept === "B" || kept === "C" ? kept : "A";
}

// Read once, when the app loads.
export const VARIANT: Variant = chooseVariant();
// The made-up data to show (?state=thinking|problem|long), none without it.
export const MADE_UP_STATE: string | null = fromAddress("state");

// --- B: the stages ---------------------------------------------------------

export const STAGES = [
  "Reading up on the product",
  "Thinking it through",
  "Drawing on the board",
] as const;

// --- A: each step in plain words -------------------------------------------

const DRAWING: [RegExp, string][] = [
  [/add.note/, "Writing a note on the board"],
  [/add.choice/, "Drawing a choice"],
  [/add.diagram/, "Drawing a diagram"],
  [/change.thing/, "Changing something on the board"],
  [/make.prototype/, "Starting a prototype"],
  [/\blink\b/, "Joining two things with an arrow"],
  [/\bdraw\b|Drawing/, "Drawing on the board"],
];

function readingWords(path: string): string {
  if (/product\.json$/.test(path)) return "Getting to know the product";
  if (/design-system/.test(path)) return "Looking at how the product looks";
  if (/architecture/.test(path)) return "Learning how the product is put together";
  if (/\.md$/.test(path)) return "Reading the team's notes";
  if (/\.(tsx?|css)$/.test(path)) return "Looking at how a screen is made";
  return "Looking at the product";
}

function lookingWords(glob: string): string {
  if (/product\.json/.test(glob)) return "Finding out what the product is";
  if (/\.md/.test(glob)) return "Finding the team's notes";
  if (/\.tsx?/.test(glob)) return "Finding the screens";
  return "Looking around the product";
}

// A raw step as a few everyday words; null when there is nothing to say.
export function plainWords(raw: string): string | null {
  const drawn = DRAWING.find(([pattern]) => pattern.test(raw));
  if (drawn && /^(Using|Drawing)/.test(raw)) return drawn[1];
  const reading = /^Reading (.+)$/.exec(raw);
  if (reading) return readingWords(reading[1] ?? "");
  const finding = /^Looking for files (.+)$/.exec(raw);
  if (finding) return lookingWords(finding[1] ?? "");
  if (/^Searching for/.test(raw)) return "Looking for where this happens";
  if (/^Looking through/.test(raw)) return "Looking around the product";
  if (/^Looking up/.test(raw)) return "Looking something up";
  if (/^Asking a helper/.test(raw)) return "Asking a helper";
  if (/^Getting started/.test(raw)) return "Getting ready";
  return null;
}

// The reading card's stages and subtitle in variant A: the same everyday
// words as the chat and the header.
export const A_STAGES = [
  { doing: "Reading your idea", done: "Read your idea" },
  { doing: "Learning how the product works", done: "Learned how the product works" },
  { doing: "Drawing on the board", done: "Drew on the board" },
] as const;
export const A_HINT = "It draws once it understands your idea";

// --- C: its own words ------------------------------------------------------

// A step the product reports (a tool), as against a line the kobold wrote.
const REPORTED =
  /^(Reading|Searching|Looking|Using|Editing|Writing|Running|Asking a helper|Getting started|Updating|In the browser|Checking|Installing|Working with git|Building|Finished|Stopped)/;

// --- what the page shows ---------------------------------------------------

export type Doing = {
  // The stage it is at, 0 to 2 (B).
  stage: number;
  // The line to show: plain words (A) or its own line (C); null for B, and
  // while there is nothing to say yet.
  line: string | null;
  // The one thing to show in a small space (the header).
  short: string | null;
};

export function useDoing(
  talk: Pick<Talk, "step" | "activity" | "writing">,
): Doing {
  // A keeps its last plain words while a line has none (the kobold's own).
  const last = useRef<string | null>(null);
  if (talk.writing === null) last.current = null;
  // C keeps the kobold's last line until it writes the next one.
  const own = useRef<string | null>(null);
  if (talk.activity && !REPORTED.test(talk.activity))
    own.current = talk.activity;
  const stage = talk.step;
  if (VARIANT === "B")
    return { stage, line: null, short: STAGES[stage] ?? STAGES[0] };
  if (VARIANT === "C") return { stage, line: own.current, short: own.current };
  const said = talk.activity ? plainWords(talk.activity) : null;
  if (said) last.current = said;
  const words = said ?? last.current;
  // Past the code, what it reports is no longer the thing it does.
  const line = stage === 2 && !words ? STAGES[2] : words;
  return { stage, line, short: line };
}

// The stages as a short list in the chat: done ticked, this one lit, the rest
// faint.
export function StageTrail({ stage }: Readonly<{ stage: number }>) {
  return (
    <ol className="grid gap-1.5 self-start text-[12.5px]" role="status">
      {STAGES.map((name, at) => (
        <li key={name} className="flex items-center gap-2">
          {at < stage ? (
            <Check aria-hidden className="size-3.5 text-muted-foreground" />
          ) : (
            <span
              className={cn(
                "mx-[3px] size-2 rounded-full",
                at === stage
                  ? "bg-blue motion-safe:animate-breathe"
                  : "bg-border",
              )}
            />
          )}
          <span
            className={cn(
              at < stage && "text-muted-foreground",
              at === stage && "font-medium text-foreground",
              at > stage && "text-faint",
            )}
          >
            {name}
            {at === stage && "…"}
          </span>
        </li>
      ))}
    </ol>
  );
}
