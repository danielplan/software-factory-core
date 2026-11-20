// What kind of part a part is, told on its box on the System map by a
// small coloured tag next to its name, which tells what it means when pointed at.
// Prototype: parts do not record their kind yet, so `kindOf` guesses it
// from the part's name and its Open link. This is the one place to change
// when a part says its own kind: return that, and keep the guess only for
// parts that do not say.

import {
  Cloud,
  Database,
  type LucideIcon,
  Monitor,
  Server,
} from "lucide-react";

import type { PartView } from "@/api";

export type PartKind = "screen" | "backend" | "data" | "outside";

export const KINDS: Record<
  PartKind,
  { label: string; means: string; icon: LucideIcon; look: string }
> = {
  screen: {
    label: "Screen",
    means: "what people open, a web page or app",
    icon: Monitor,
    look: "bg-sky-50 text-sky-700 ring-sky-200",
  },
  backend: {
    label: "Backend",
    means: "works behind the screens",
    icon: Server,
    look: "bg-violet-50 text-violet-700 ring-violet-200",
  },
  data: {
    label: "Data",
    means: "where data is stored",
    icon: Database,
    look: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  outside: {
    label: "Outside service",
    means: "run by someone else, like payments",
    icon: Cloud,
    look: "bg-rose-50 text-rose-700 ring-rose-200",
  },
};

const WORDS: [PartKind, RegExp][] = [
  [
    "data",
    /\b(data|database|db|postgres\w*|mysql|sqlite|mongo\w*|redis|storage|store|files?|bucket|cache)\b/i,
  ],
  [
    "outside",
    /\b(stripe|paypal|payments?|mail\w*|email|sms|twilio|auth0|clerk|sentry|outside|external|third[- ]party)\b/i,
  ],
  ["backend", /\b(api|server|backend|back[- ]end|worker|jobs?|queue|service)\b/i],
  [
    "screen",
    /\b(web|website|site|app|frontend|front[- ]end|page|pages|dashboard|mobile|ui|admin|shop)\b/i,
  ],
];

// A guess, for now: by the words in its name and id first ("Shop API"
// works behind the screens), then a part
// people can open is a screen, and anything else works behind the screens.
export function kindOf(part: PartView): PartKind {
  const words = `${part.name} ${part.id.replaceAll(/[-_.]/g, " ")}`;
  for (const [kind, pattern] of WORDS) if (pattern.test(words)) return kind;
  return part.link ? "screen" : "backend";
}
