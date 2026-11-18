// The Factory page: the connected GitHub board's cards in four columns (To
// do, Building, Review, Done), each with where it came from: an
// exploration's handed-off prototype, or a fix of a signal. Read from what
// the builder last read of the board.

import type { KobbleStore } from "@software-factory/core";

import type { Asking, CardView, Stage, WorkView } from "../api.ts";

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
  from: { exploration: string; key: string | null } | null;
  // A fix of a signal.
  fix: boolean;
  type: CardView["type"];
};

export type FactoryView = {
  connected: boolean;
  problem: string | null;
  read: string | null;
  columns: { id: Column; title: string; cards: FactoryCard[] }[];
  // The cards where the factory waits for the owner, oldest first.
  waiting: Asking[];
  builder: { on: boolean; working: string | null };
};

const OF_STAGE: Record<Stage, Column> = {
  backlog: "todo",
  planning: "todo",
  todo: "todo",
  doing: "building",
  review: "review",
  done: "done",
};

function columnOfCard(card: CardView): Column {
  if (card.closed) return "done";
  return card.stage ? OF_STAGE[card.stage] : "todo";
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
    const from = explorations.find((one) => one.work === card.number);
    const agreed = from
      ? store
          .board(from.id)
          .things.find((one) => one.kind === "prototype" && one.agreed)
      : undefined;
    return {
      column: columnOfCard(card),
      card: {
        number: card.number,
        title: card.title,
        url: card.url,
        from: from
          ? {
              exploration: from.id,
              key: agreed?.kind === "prototype" ? agreed.key : null,
            }
          : null,
        fix: fixes.has(`#${String(card.number)}`),
        type: card.type ?? null,
      },
    };
  });
  return {
    connected: work !== null,
    problem: work?.problem ?? null,
    read: work?.read ?? null,
    waiting: [...(work?.asking ?? [])].sort((a, b) => a.number - b.number),
    columns: FACTORY_COLUMNS.map((column) => ({
      ...column,
      cards: cards
        .filter((one) => one.column === column.id)
        .map((one) => one.card),
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
    working:
      cards.length > 0
        ? cards.map((one) => `#${String(one.number)} · ${one.title}`).join(", ")
        : null,
  };
}
