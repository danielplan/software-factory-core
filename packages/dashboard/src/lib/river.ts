// The Overview's river: how far things get, from what was heard to what
// worked. Each stage counts what reached it at least (an idea in the app
// was also sent to Build), so the river narrows from left to right; its
// width at each stage is how much is there. Worked out from what the
// server already sends; the shape is drawn by components/river.tsx. Kept
// apart from the components so it is checked on its own.

import type { IdeaRow, PersonaCard } from "../api.ts";
import { t } from "../i18n/i18n.ts";
import { exploreHash } from "./routes.ts";

export type RiverStage = {
  label: string;
  count: number;
  // What the count means, in a few words ("3 sent to Build").
  words: string;
  href: string;
  // Its colour, a CSS variable.
  colour: string;
};

const SENT = new Set<IdeaRow["stage"]>([
  "building",
  "inApp",
  "worked",
  "didntWork",
]);
const IN_APP = new Set<IdeaRow["stage"]>(["inApp", "worked", "didntWork"]);

export function riverOf(
  personas: PersonaCard[],
  ideas: IdeaRow[],
): { stages: RiverStage[]; headline: string } {
  const heard = personas.reduce(
    (all, card) => all + card.stories.filter((s) => s.wrong === null).length,
    0,
  );
  const count = (stages: Set<IdeaRow["stage"]>) =>
    ideas.filter((idea) => stages.has(idea.stage)).length;
  const sent = count(SENT);
  const worked = ideas.filter((idea) => idea.stage === "worked").length;
  const building = ideas.filter((idea) => idea.stage === "building").length;
  const inApp = count(IN_APP);
  const stages: RiverStage[] = [
    {
      label: t("overview:river.heard"),
      count: heard,
      words: t("overview:river.heardWords", { count: heard }),
      href: "#understand",
      colour: "--river-heard",
    },
    {
      label: t("overview:river.ideas"),
      count: ideas.length,
      words: t("overview:river.ideasWords", { count: ideas.length }),
      href: exploreHash(),
      colour: "--river-ideas",
    },
    {
      label: t("overview:river.sent"),
      count: sent,
      words: t("overview:river.sentWords", { count: sent }),
      href: "#build",
      colour: "--river-build",
    },
    {
      label: t("overview:river.inApp"),
      count: inApp,
      words: t("overview:river.inAppWords", { count: inApp }),
      href: "#build",
      colour: "--river-build",
    },
    {
      label: t("overview:river.worked"),
      count: worked,
      words: t("overview:river.workedWords", { count: worked }),
      href: exploreHash(),
      colour: "--river-done",
    },
  ];
  return { stages, headline: headlineOf(ideas.length, worked, building) };
}

// How it goes, in a line: how many ideas worked, and how many are being
// built (two phrases, each whole in every language).
function headlineOf(ideas: number, worked: number, building: number): string {
  if (ideas === 0) return t("overview:river.nothing");
  const soFar = t("overview:river.soFar", { count: ideas, worked });
  return building > 0
    ? `${soFar} · ${t("overview:river.building", { count: building })}`
    : soFar;
}

// The river's outline in a box of this size: at each stage (spaced evenly,
// in the middle of its column) it is as wide as its count, between a thin
// thread for nothing and most of the height for the largest; smooth curves
// join the stages, flat to both ends.
export function riverPath(
  counts: number[],
  width: number,
  height: number,
): string {
  if (counts.length === 0) return "";
  const most = Math.max(1, ...counts);
  const thinnest = 4;
  const widest = height * 0.82;
  const middle = height / 2;
  const step = width / counts.length;
  const half = counts.map(
    (n) => (thinnest + (widest - thinnest) * (n / most)) / 2,
  );
  const xs = counts.map((_, at) => step * (at + 0.5));
  const edge = (sign: 1 | -1, order: number[]) =>
    order
      .map((at, index) => {
        const y = middle + sign * (half[at] ?? 0);
        if (index === 0) return `${fmt(xs[at])} ${fmt(y)}`;
        const from = order[index - 1] ?? at;
        const bend = ((xs[at] ?? 0) + (xs[from] ?? 0)) / 2;
        const before = middle + sign * (half[from] ?? 0);
        return `C ${fmt(bend)} ${fmt(before)} ${fmt(bend)} ${fmt(y)} ${fmt(xs[at])} ${fmt(y)}`;
      })
      .join(" ");
  const forward = counts.map((_, at) => at);
  const back = [...forward].reverse();
  const first = half[0] ?? 0;
  const last = half[counts.length - 1] ?? 0;
  return [
    `M 0 ${fmt(middle - first)}`,
    `L ${edge(-1, forward)}`,
    `L ${fmt(width)} ${fmt(middle - last)}`,
    `L ${fmt(width)} ${fmt(middle + last)}`,
    `L ${edge(1, back)}`,
    `L 0 ${fmt(middle + first)} Z`,
  ].join(" ");
}

const fmt = (n: number | undefined) => String(Math.round((n ?? 0) * 10) / 10);
