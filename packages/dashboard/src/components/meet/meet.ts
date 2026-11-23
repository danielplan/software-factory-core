// PROTOTYPE, "Meet the kobolds": what the variants share. The base is "always
// present at work" (E): name tags where a kobold works, a "Your kobolds" group
// in the sidebar and a panel any face or tag opens. Which variant shows is
// chosen outside the app, by the page address (?variant=E, or ?variant=A for
// the white background; E without it), read once when the app loads and kept
// for the visit. The made-up states (?state=quiet, busy, long) are chosen the
// same way. Words are written straight in, in English.

import { useSyncExternalStore } from "react";

import type { PersonaHat } from "@/api/client";
import type { Doing } from "@/components/layout/page-kobold";
import { KOBOLDS, MAKER } from "@/lib/kobolds";
import type { Page } from "@/lib/routes";

// E: the base · A: the same with a plain white panel.
export type Variant = "E" | "A";

function fromAddress(key: string): string | null {
  return new URLSearchParams(window.location.search).get(key);
}

// The address says it; the visit keeps it, so moving between pages does too.
function kept(key: string, asked: string | null): string | null {
  try {
    if (asked) sessionStorage.setItem(`meet-${key}`, asked);
    return sessionStorage.getItem(`meet-${key}`);
  } catch {
    return asked;
  }
}

export const VARIANT: Variant =
  kept("variant", fromAddress("variant"))?.toUpperCase() === "A" ? "A" : "E";

// quiet: nobody at work · busy: everybody at work · long: everybody, with long
// names.
export type MadeUp = "quiet" | "busy" | "long" | null;
const STATES = ["quiet", "busy", "long"];
export const STATE: MadeUp = (() => {
  const state = kept("state", fromAddress("state"));
  return STATES.includes(state ?? "") ? (state as MadeUp) : null;
})();

export type Member = {
  id: string;
  name: string;
  hat: PersonaHat | "flop";
  color: string;
  // What it is in a few words (variant E's name tags).
  role: string;
  // Its step in how work travels, and what it did last (the workshop).
  step: string;
  last: string;
  // What it does for the person, where it works, what to do meanwhile.
  job: string;
  where: string;
  page: Page | null;
  meanwhile: string;
};

const WORDS: Record<
  string,
  Pick<Member, "role" | "step" | "last" | "job" | "where" | "meanwhile">
> = {
  support: {
    role: "your support kobold",
    step: "here to answer, on every page",
    last: "Answered a question about the board.",
    job: "Answers your questions and takes your feedback",
    where: "Every page, in the bar at the bottom",
    meanwhile: "Keep going, its answer comes to the bar.",
  },
  explorer: {
    role: "your explorer",
    step: "thinks it through with you",
    last: "Wrote the story behind “The basket is empty when people come back to pay”.",
    job: "Thinks your ideas through and tells the story behind each one",
    where: "Explorations, on the board and in the talk beside it",
    meanwhile: "Talk to it, or move things around on the board.",
  },
  maker: {
    role: "Doodle's helper",
    step: "makes the screens to try",
    last: "Made version B, “Bring it back by email”, for you to try.",
    job: "Doodle's helper: builds the versions you try",
    where: "Explorations, on each version's card",
    meanwhile: "Nothing to do. The first version opens as soon as it runs.",
  },
  builder: {
    role: "the builder",
    step: "builds what you agreed",
    last: "Built card #127 and opened its pull request.",
    job: "Builds the cards you agreed on, one by one",
    where: "Factory, on the card it works on",
    meanwhile: "Nothing to do. It asks here if it gets stuck.",
  },
  tester: {
    role: "plays your personas",
    step: "tries it as your personas",
    last: "Played Mia on “Bring it back by email”: 3 of 3 steps as expected.",
    job: "Uses your app as one of your personas and tells what went wrong",
    where: "Personas, on a mission",
    meanwhile: "Nothing to do. What it finds arrives as signals.",
  },
  sorter: {
    role: "sorts what comes in",
    step: "sorts what comes in",
    last: "Sorted 3 new signals: 2 bugs and 1 request.",
    job: "Sorts what comes in: bugs, requests and feedback",
    where: "Signals, as they arrive",
    meanwhile: "Nothing to do. New signals wait on the Signals page.",
  },
};

const TEAM_ORDER = [
  "support",
  "explorer",
  "maker",
  "builder",
  "tester",
  "sorter",
];

export const TEAM: Member[] = TEAM_ORDER.map((id) => {
  const own = KOBOLDS.find((kobold) => kobold.id === id);
  const base = own ?? { ...MAKER, page: "explore" as Page };
  return {
    id,
    name: base.name,
    hat: base.hat,
    color: base.color,
    page: own ? own.page : "explore",
    ...WORDS[id],
  } as Member;
});

export function memberOf(id: string): Member {
  return TEAM.find((one) => one.id === id) ?? TEAM[0];
}

// --- A made-up card for Bolt, when the board has none being built.

import type { FactoryView } from "@/api/schemas/factory";

const MADE_UP_CARD = {
  number: 128,
  title: "Show the late orders first (made-up card)",
  url: "",
  from: null,
  fix: false,
  type: "improvement" as const,
  pullRequest: null,
  pullRequestState: null,
  conflict: false,
  resolving: false,
  hint: false,
};

export function withBoltAtWork(view: FactoryView): FactoryView {
  if (view.builder.working) return view;
  if (view.columns.some((c) => c.id === "building" && c.cards.length > 0))
    return view;
  const titles = {
    todo: "To do",
    building: "Building",
    review: "Review",
    done: "Done",
  };
  const ids = ["todo", "building", "review", "done"] as const;
  return {
    ...view,
    connected: true,
    problem: null,
    read: view.read ?? "now",
    columns: ids.map((id) => {
      const own = view.columns.find((c) => c.id === id);
      return {
        id,
        title: own?.title ?? titles[id],
        cards:
          id === "building"
            ? [MADE_UP_CARD, ...(own?.cards ?? [])]
            : (own?.cards ?? []),
      };
    }),
    builder: {
      ...view.builder,
      now: {
        ...view.builder.now,
        128: "Writing the test for the late-first order",
      },
    },
  };
}

// A made-up run of Tinker at work on prototype A, when the exploration has
// none being made, so Tinker is on its card to be met.
import type { VersionRun } from "@/api/client";

export function withTinkerAtWork(
  run: VersionRun | undefined,
  key: string,
  runs: VersionRun[],
): VersionRun | undefined {
  if (key !== "A" || runs.some((one) => one.making)) return run;
  return {
    idea: run?.idea ?? "",
    version: key,
    state: "starting",
    url: null,
    steps: [],
    problem: null,
    startProblem: null,
    start: null,
    ...run,
    making: true,
    activity: "Putting the basket back on the phone page (made up)",
    since: new Date(Date.now() - 95_000).toISOString(),
  };
}

// --- What Tinker does now: its cards say it (they are on the exploration's
// page, which has no sidebar), the panel reads it.

let tinker: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function reportTinker(now: string | null) {
  if (tinker === now) return;
  tinker = now;
  emit();
}

// --- The panel (variant A): open or not, and whose face opened it.

let panel: { open: boolean; focus: string | null } = {
  open: false,
  focus: null,
};
export function openTeam(focus: string | null = null) {
  panel = { open: true, focus };
  emit();
}
export function closeTeam() {
  panel = { open: false, focus: null };
  emit();
}
export function usePanel() {
  return useSyncExternalStore(subscribe, () => panel);
}

// What each kobold is doing now: the real one, or a made-up state's.
export function useTeamDoing(real: Doing): Record<string, string> {
  const maker = useSyncExternalStore(subscribe, () => tinker);
  if (STATE === "quiet") return {};
  if (STATE === "busy" || STATE === "long")
    return madeUpDoing(STATE === "long");
  // Tinker is always at work on its made-up version, so it is there under
  // Doodle on every page; Bolt too (the made-up card on the Factory board is
  // being built), and Sieve watches.
  return {
    ...real,
    maker: maker ?? "Version A: making the basket page (made up)",
    builder: real.builder ?? "Card #128: Show the late orders first (made up)",
    sorter: real.sorter ?? "Watching for what comes in",
  };
}

function madeUpDoing(long: boolean): Record<string, string> {
  const title = long
    ? " — Let the people who ordered from the north warehouse see the delivery windows for supermarket-chain-with-a-very-long-name"
    : "";
  return {
    support: "Answering a question about the board",
    explorer: `Writing the story: Let a coach see who is late${title}`,
    maker: "Version B: putting the late list on the planner page",
    builder: `Card #128: Show the late orders first${title}`,
    tester: "Mission: reorder a basket as Maria",
    sorter: "Sorting 3 new signals",
  };
}
