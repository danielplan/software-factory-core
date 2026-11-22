// The Factory page: the connected GitHub board's cards in four columns (To
// do, Building, Review, Done), each with where it came from: an
// exploration's handed-off prototype, or a fix of a signal. Read from what
// the builder last read of the board.

import type { KobbleStore } from "@software-factory/core";

import type {
  Asking,
  CardView,
  Stage,
  StuckView,
  WorkView,
} from "../../api.ts";

export const FACTORY_COLUMNS = [
  { id: "todo", title: "To do" },
  { id: "building", title: "Building" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
] as const;
type Column = (typeof FACTORY_COLUMNS)[number]["id"];

export type FactoryCard = {
  number: number;
  title: string;
  url: string;
  // The exploration it was handed off from, with the agreed prototype.
  // Its title is what people see; the id (X-1) and key (B) are for links.
  from: { exploration: string; title: string; key: string | null } | null;
  // A fix of a signal.
  fix: boolean;
  type: CardView["type"];
  // The pull request the builder opened for it, once it has.
  pullRequest: string | null;
  // That pull request's state, for the colour of its button.
  pullRequestState: CardView["pullRequestState"];
  // That pull request clashes with main while the card is in Review:
  // Resolve asks the builder to settle it.
  conflict: boolean;
  // It clashes, and the card is back in To do or Building: the builder is
  // settling it, nothing to press.
  resolving: boolean;
  // Handed back from Stuck with the owner's hint: first in To do.
  hint: boolean;
};

export type FactoryView = {
  connected: boolean;
  problem: string | null;
  read: string | null;
  columns: { id: Column; title: string; cards: FactoryCard[] }[];
  // The cards where the factory waits for the owner, oldest first.
  waiting: Asking[];
  // The cards the builder got stuck on, waiting in Backlog for a hint,
  // longest stuck first.
  stuck: StuckView[];
  // The cards it builds now, by number, and the same in words; on each,
  // what it is doing right now (its latest step), by card number.
  builder: {
    on: boolean;
    working: string | null;
    cards: number[];
    now: Record<number, string>;
    trace: Record<number, string[]>;
  };
};

// The Factory page shows agreed work only: an idea in the board's Backlog
// (or in no column) waits in Explorations instead (boardIdeas).
const OF_STAGE: Record<Stage, Column | null> = {
  backlog: null,
  todo: "todo",
  doing: "building",
  review: "review",
  done: "done",
};

function columnOfCard(card: CardView): Column | null {
  if (card.closed) return "done";
  return card.stage ? OF_STAGE[card.stage] : null;
}

// The board's ideas: open cards in its Backlog or in no column, not agreed
// work yet. They wait in Explorations until someone explores one. A card the
// builder got stuck on waits in Backlog too, but is not an idea: it shows in
// the Factory page's Stuck list only.
export function boardIdeas(
  work: WorkView | null,
): { number: number; title: string; url: string }[] {
  return (work?.cards ?? [])
    .filter(
      (card) => !card.closed && !card.stuck && columnOfCard(card) === null,
    )
    .map(({ number, title, url }) => ({ number, title, url }));
}

// The column of an issue ("#41") on the board, in words; none when the
// board does not show it.
export function columnOf(issue: string, work: WorkView | null): string | null {
  const card = work?.cards.find((one) => `#${String(one.number)}` === issue);
  if (!card) return null;
  const id = columnOfCard(card);
  return FACTORY_COLUMNS.find((column) => column.id === id)?.title ?? null;
}

export function factoryView(
  store: KobbleStore,
  work: WorkView | null,
): FactoryView {
  const explorations = store.all("explorations");
  const fixes = new Set(
    store
      .all("signals")
      .filter((signal) => signal.status === "fixed" && signal.to)
      .map((signal) => signal.to),
  );
  const cards = (work?.cards ?? []).map((card) => {
    const column = columnOfCard(card);
    const clashes = card.conflict ?? false;
    const from = explorations.find((one) => one.work === card.number);
    const agreed = from
      ? store
          .board(from.id)
          .things.find((one) => one.kind === "prototype" && one.agreed)
      : undefined;
    return {
      column,
      card: {
        number: card.number,
        title: card.title,
        url: card.url,
        from: from
          ? {
              exploration: from.id,
              title: from.title,
              key: agreed?.kind === "prototype" ? agreed.key : null,
            }
          : null,
        fix: fixes.has(`#${String(card.number)}`),
        type: card.type ?? null,
        pullRequest: card.pullRequest,
        pullRequestState: card.pullRequestState ?? null,
        conflict: clashes && column === "review",
        resolving: clashes && (column === "todo" || column === "building"),
        hint: card.hint ?? false,
      },
    };
  });
  return {
    connected: work !== null,
    problem: work?.problem ?? null,
    read: work?.read ?? null,
    waiting: [...(work?.asking ?? [])].sort((a, b) => a.number - b.number),
    stuck: work?.stuck ?? [],
    columns: FACTORY_COLUMNS.map((column) => ({
      ...column,
      // The cards handed back with a hint first, else the board's order.
      cards: cards
        .filter((one) => one.column === column.id)
        .map((one) => one.card)
        .sort((a, b) => Number(b.hint) - Number(a.hint)),
    })),
    builder: builderOf(work),
  };
}

// The builder's switch and what it builds now, every card it is on.
function builderOf(work: WorkView | null): FactoryView["builder"] {
  const builder = work?.builder;
  const cards = builder?.working ? [builder.working, ...builder.also] : [];
  return {
    on: builder?.on ?? false,
    cards: cards.map((one) => one.number),
    // What it did on each card so far, step by step: its trace.
    trace: Object.fromEntries(cards.map((one) => [one.number, one.steps])),
    now: Object.fromEntries(
      cards.map((one) => [
        one.number,
        one.activity ?? `Started ${one.what} it`,
      ]),
    ),
    working:
      cards.length > 0
        ? cards.map((one) => `#${String(one.number)} · ${one.title}`).join(", ")
        : null,
  };
}
