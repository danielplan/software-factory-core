// One kind of row for every list of things in the dashboard (the Overview,
// Understand): what it is, for whom, where it stands as a coloured dot and a
// word, and where it leads. Kept apart from the components so it is
// checked on its own.

import type { CardView, IdeaRow, PersonaCard } from "../api.ts";
import { t } from "../i18n/i18n.ts";
import { exploreHash, understandHash } from "./routes.ts";
import { ideaSteps, problemSteps, type StepTone } from "./stages.ts";

export type Row = {
  id: string;
  title: string;
  // For whom, or the situation it happens in.
  who: string | null;
  status: string;
  tone: StepTone;
  href: string;
  // New since a person last looked.
  fresh: boolean;
  // Solved, or it turned out wrong: nothing more to do.
  done: boolean;
};

// The order problems are listed in: new first, then the ones that most
// need a person (heard, nothing tried yet), the ones under way, and last
// those with nothing more to do.
const ORDER = [
  "heard",
  "assumed",
  "trying",
  "building",
  "inApp",
  "didntWork",
  "solved",
];

// Every problem the stories break at, one row each: the problem, the
// person, its stage; a story that didn't hold is listed last.
export function problemRows(personas: PersonaCard[]): Row[] {
  const ranked = personas.flatMap(({ persona, stories }) =>
    stories.map((story) => {
      const steps = story.stage ? problemSteps(story.stage) : null;
      const wrong = story.wrong !== null;
      const row: Row = {
        id: story.id,
        title: story.problemTitle ?? story.title,
        who: persona.name,
        status: wrong
          ? t("overview:rows.didntHold")
          : (steps?.name ?? t("overview:rows.notClear")),
        tone: steps && !wrong ? steps.tone : "neutral",
        href: understandHash(persona.id, story.id),
        fresh: story.isNew,
        done: wrong || story.stage === "solved",
      };
      const rank = wrong ? ORDER.length : ORDER.indexOf(story.stage ?? "heard");
      return { row, rank };
    }),
  );
  return ranked
    .toSorted(
      (a, b) => Number(b.row.fresh) - Number(a.row.fresh) || a.rank - b.rank,
    )
    .map(({ row }) => row);
}

// The board's cards not yet done, one row each, with their column: those
// waiting for "did it work?" first.
export function cardRows(cards: CardView[]): Row[] {
  return cards
    .filter((card) => card.asks || (card.stage !== "done" && !card.closed))
    .sort((a, b) => Number(b.asks) - Number(a.asks))
    .map((card) => ({
      id: String(card.number),
      title: card.title,
      who: `#${String(card.number)}`,
      status: card.asks ? t("overview:rows.didItWork") : card.column,
      tone: toneOfCard(card),
      href: "#build",
      fresh: false,
      done: false,
    }));
}

function toneOfCard(card: CardView): StepTone {
  if (card.asks) return "blue";
  return card.stage === "backlog" ? "neutral" : "amber";
}

// Without a board read, the ideas the records say are being built or are
// in the app.
export function ideaRows(ideas: IdeaRow[]): Row[] {
  return ideas
    .filter((idea) => idea.stage === "building" || idea.stage === "inApp")
    .map((idea) => {
      const steps = ideaSteps(idea.stage);
      return {
        id: idea.id,
        title: idea.title,
        who: idea.persona?.name ?? null,
        status: steps.name,
        tone: steps.tone,
        href: exploreHash(idea.id),
        fresh: false,
        done: false,
      };
    });
}
