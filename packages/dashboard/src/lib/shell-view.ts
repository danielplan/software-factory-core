// What the frame around every page says, worked out from what the server
// sends: the small counts beside the pages in the sidebar, the kobold's
// card at its bottom (what it is working on, or that it rests), the whole
// factory's light, and the Ask field's words. Kept apart from the
// components so it is checked on its own.

import type {
  IdeaRow,
  IdeaView,
  KoboldJob,
  Light,
  PartView,
  WorkView,
} from "../api.ts";
import type { Page } from "./routes.ts";

// Only real numbers, and only when there is something to count: the new
// signals, the ideas being explored, and the board's tickets not yet in the
// app.
export function countsOf(
  ideas: IdeaRow[] | null,
  work: WorkView | null,
  fresh = 0,
): Partial<Record<Page, number>> {
  const exploring = (ideas ?? []).filter(
    (one) => one.state === "exploring",
  ).length;
  const open = (work?.cards ?? []).filter(
    (card) => card.stage !== "done",
  ).length;
  return {
    ...(fresh > 0 ? { signals: fresh } : {}),
    ...(exploring > 0 ? { explore: exploring } : {}),
    ...(open > 0 ? { build: open } : {}),
  };
}

// The whole factory's light, and what it means in words.
export function overallOf(parts: PartView[]): {
  lit: Light;
  words: string;
} {
  const shown = parts.filter((part) => part.light !== "none");
  const running = shown.filter((part) => part.light === "running").length;
  if (shown.some((part) => part.light === "problem"))
    return { lit: "problem", words: "Something needs you" };
  if (shown.some((part) => part.light === "starting"))
    return { lit: "starting", words: "Starting" };
  if (shown.length > 0 && running === shown.length)
    return { lit: "running", words: "All running" };
  return {
    lit: "stopped",
    words: `${String(running)} of ${String(shown.length)} running`,
  };
}

export type KoboldStatus = { busy: boolean; title: string; detail: string };

const DOING: Record<KoboldJob["kind"], string> = {
  sort: "sorting what came in",
  suggest: "reading the problems",
  ask: "drafting a question",
  seen: "drafting what was seen",
  idea: "writing an idea",
  answer: "answering your question",
};

// What the kobold is working on, from what the factory knows: the card it
// builds, a job on the records, an idea it thinks about, a card it plans;
// resting otherwise, with the factory's light in words.
export function koboldStatus(
  jobs: KoboldJob[],
  work: WorkView | null,
  ideas: IdeaView[],
  quiet: string,
): KoboldStatus {
  const building = work?.builder.working;
  if (building)
    return { busy: true, title: "Kobold is building", detail: building.title };
  const job = jobs.find((one) => one.working);
  if (job)
    return {
      busy: true,
      title: `Kobold is ${DOING[job.kind]}`,
      detail: job.activity ?? "Working…",
    };
  const thinking = ideas.find((one) => one.working);
  if (thinking)
    return {
      busy: true,
      title: "Kobold is thinking",
      detail: thinking.title,
    };
  const planning = work?.coach.working;
  if (planning !== undefined && planning !== null)
    return {
      busy: true,
      title: "Kobold is planning",
      detail: `Card #${String(planning)}`,
    };
  return {
    busy: false,
    title: "Kobold is resting",
    detail: `All quiet · ${quiet}`,
  };
}

// The Ask field's words, about the product chosen.
export function askPlaceholder(product: string | undefined): string {
  return product
    ? `Ask about the people who use ${product}…`
    : "Ask about the people who use this product…";
}

// ⌘K, or Ctrl+K on a computer without ⌘, goes to the Ask field.
export function isAskShortcut(
  key: Readonly<{ key: string; metaKey: boolean; ctrlKey: boolean }>,
): boolean {
  return (key.metaKey || key.ctrlKey) && key.key.toLowerCase() === "k";
}
