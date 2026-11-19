// What the frame around every page says, worked out from what the server
// sends: the small counts beside the pages in the sidebar, the kobold's
// card at its bottom (what it is working on, or that it rests), the whole
// factory's light. Kept apart from the
// components so it is checked on its own.

import type { IdeaView, Light, PartView, WorkView } from "../api.ts";
import { ENGLISH, type Messages } from "../i18n/messages.ts";
import type { KoboldId } from "./kobolds.ts";
import type { Page } from "./routes.ts";

// Only real numbers, and only when there is something to count: the new
// signals, the explorations being explored, and the board's tickets not
// yet in the app.
export function countsOf(
  exploring: number,
  work: WorkView | null,
  fresh = 0,
): Partial<Record<Page, number>> {
  // Agreed work not done yet (To do, In progress, Review); ideas in the
  // Backlog count as waiting explorations, not as the factory's work.
  const open = (work?.cards ?? []).filter(
    (card) =>
      !card.closed &&
      (card.stage === "todo" ||
        card.stage === "doing" ||
        card.stage === "review"),
  ).length;
  return {
    ...(fresh > 0 ? { signals: fresh } : {}),
    ...(exploring > 0 ? { explore: exploring } : {}),
    ...(open > 0 ? { build: open } : {}),
  };
}

// The whole factory's light, and what it means in words.
type Words = Messages["shell"];

export function overallOf(
  parts: PartView[],
  m: Words = ENGLISH.shell,
): {
  lit: Light;
  words: string;
} {
  const shown = parts.filter((part) => part.light !== "none");
  const running = shown.filter((part) => part.light === "running").length;
  if (shown.some((part) => part.light === "problem"))
    return { lit: "problem", words: m.overall.problem };
  if (shown.some((part) => part.light === "starting"))
    return { lit: "starting", words: m.overall.starting };
  if (shown.length > 0 && running === shown.length)
    return { lit: "running", words: m.overall.running };
  return {
    lit: "stopped",
    words: m.overall.some(running, shown.length),
  };
}

export type KoboldStatus = { busy: boolean; title: string; detail: string };

// What the kobold is working on, from what the factory knows: the card it
// builds, an exploration it thinks about or makes a prototype for, an idea
// it thinks about;
// resting otherwise, with the factory's light in words.
export function koboldStatus(
  work: WorkView | null,
  ideas: IdeaView[],
  quiet: string,
  explorations: { title: string; busy: string | null }[] = [],
  m: Words = ENGLISH.shell,
): KoboldStatus {
  const building = work?.builder.working;
  if (building)
    return { busy: true, title: m.kobold.building, detail: building.title };
  const exploring = explorations.find((one) => one.busy);
  if (exploring?.busy)
    return {
      busy: true,
      title: m.kobold.busy(
        `${exploring.busy.charAt(0).toLowerCase()}${exploring.busy.slice(1)}`,
      ),
      detail: exploring.title,
    };
  const thinking = ideas.find((one) => one.working);
  if (thinking)
    return {
      busy: true,
      title: m.kobold.thinking,
      detail: thinking.title,
    };
  return {
    busy: false,
    title: m.kobold.resting,
    detail: m.kobold.quiet(quiet),
  };
}

// The short line under the kobold's name: what it is doing, or Idle.
export function koboldLine(
  kobold: KoboldStatus,
  m: Words = ENGLISH.shell,
): string {
  if (!kobold.busy) return m.kobold.idle;
  const doing = kobold.title.replace(/^Kobold is /, "");
  return doing.charAt(0).toUpperCase() + doing.slice(1);
}

// What each kobold (lib/kobolds.ts) is doing now, in a few words; the idle
// ones are left out.
export function koboldsDoing(
  work: WorkView | null,
  explorations: { title: string; busy: string | null }[],
  answering: boolean,
  m: Words = ENGLISH.shell,
): Partial<Record<KoboldId, string>> {
  const doing: Partial<Record<KoboldId, string>> = {};
  if (answering) doing.support = m.kobold.answering;
  const exploring = explorations.find((one) => one.busy);
  if (exploring?.busy) doing.explorer = `${exploring.busy}: ${exploring.title}`;
  const building = work?.builder.working;
  if (building)
    doing.builder = m.kobold.buildingCard(building.number, building.title);
  return doing;
}
