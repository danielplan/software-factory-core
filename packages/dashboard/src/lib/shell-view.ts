// What the frame around every page says, worked out from what the server
// sends: the small counts beside the pages in the sidebar, the kobold's
// card at its bottom (what it is working on, or that it rests), the whole
// factory's light. Kept apart from the
// components so it is checked on its own.

import type { TFunction } from "i18next";
import type { IdeaView, Light, PartView, WorkView } from "../api/client.ts";
import { ENGLISH } from "../i18n/messages.ts";
import type { KoboldId } from "./kobolds.ts";
import { builtLast, exploredLast, type Now } from "./meet-view.ts";

// The Factory board's count in the sidebar: agreed work not done yet (To
// do, In progress, Review); ideas in the Backlog count as waiting
// explorations, not as the factory's work.
export function openCardsOf(work: WorkView | null): number {
  return (work?.cards ?? []).filter(
    (card) =>
      !card.closed &&
      (card.stage === "todo" ||
        card.stage === "doing" ||
        card.stage === "review"),
  ).length;
}

// The whole factory's light, and what it means in words.
type Words = TFunction;

export function overallOf(
  parts: PartView[],
  m: Words = ENGLISH,
): {
  lit: Light;
  words: string;
} {
  const shown = parts.filter((part) => part.light !== "none");
  const running = shown.filter((part) => part.light === "running").length;
  if (shown.some((part) => part.light === "problem"))
    return { lit: "problem", words: m("shell.overall.problem") };
  if (shown.some((part) => part.light === "starting"))
    return { lit: "starting", words: m("shell.overall.starting") };
  if (shown.length > 0 && running === shown.length)
    return { lit: "running", words: m("shell.overall.running") };
  return {
    lit: "stopped",
    words: m("shell.overall.some", { running, shown: shown.length }),
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
  m: Words = ENGLISH,
): KoboldStatus {
  const building = work?.builder.working;
  if (building)
    return {
      busy: true,
      title: m("shell.kobold.building"),
      detail: building.title,
    };
  const exploring = explorations.find((one) => one.busy);
  if (exploring?.busy)
    return {
      busy: true,
      title: m("shell.kobold.busy", {
        what: `${exploring.busy.charAt(0).toLowerCase()}${exploring.busy.slice(1)}`,
      }),
      detail: exploring.title,
    };
  const thinking = ideas.find((one) => one.working);
  if (thinking)
    return {
      busy: true,
      title: m("shell.kobold.thinking"),
      detail: thinking.title,
    };
  return {
    busy: false,
    title: m("shell.kobold.resting"),
    detail: m("shell.kobold.quiet", { light: quiet }),
  };
}

// The short line under the kobold's name: what it is doing, or Idle.
export function koboldLine(kobold: KoboldStatus, m: Words = ENGLISH): string {
  if (!kobold.busy) return m("shell.kobold.idle");
  const doing = kobold.title.replace(/^Kobold is /, "");
  return doing.charAt(0).toUpperCase() + doing.slice(1);
}

// What each kobold (lib/kobolds.ts) is doing now, in a few words; the idle
// ones are left out.
export function koboldsDoing(
  work: WorkView | null,
  explorations: { title: string; busy: string | null }[],
  answering: boolean,
  m: Words = ENGLISH,
): Partial<Record<KoboldId, string>> {
  const doing: Partial<Record<KoboldId, string>> = {};
  if (answering) doing.support = m("shell.kobold.answering");
  const exploring = explorations.find((one) => one.busy);
  if (exploring?.busy) doing.explorer = `${exploring.busy}: ${exploring.title}`;
  const building = work?.builder.working;
  if (building)
    doing.builder = m("shell.kobold.buildingCard", {
      number: building.number,
      title: building.title,
    });
  return doing;
}

// What the kobolds the frame knows about did last (the others' extensions
// say it): the card Bolt built, the exploration Doodle thought through.
export function koboldsLast(
  work: WorkView | null,
  explorations: { title: string }[],
  m: Words = ENGLISH,
): Now {
  const last: Now = {};
  const built = builtLast(work, m);
  if (built) last.builder = built;
  const explored = exploredLast(explorations, m);
  if (explored) last.explorer = explored;
  return last;
}
