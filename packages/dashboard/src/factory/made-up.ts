// Prototype: a made-up board and made-up things arriving at the factory
// (requests, errors from the live app, GitHub issues), so the ways in can
// be tried without a GitHub board. Nothing here is real.

import type { FactoryView } from "@/api";

import type { ShownCard } from "./board-card";

// Where something new came from.
export type Came = "request" | "error" | "board" | "issue";

const card = (
  number: number,
  title: string,
  more: Partial<ShownCard> = {},
): ShownCard => ({
  number,
  title,
  url: "",
  from: null,
  fix: false,
  type: null,
  ...more,
});

const EXPLORED = (title: string) => ({
  exploration: "X-2",
  title,
  key: "A",
});

export function madeUpBoard(): FactoryView {
  return {
    connected: true,
    problem: null,
    read: "made-up",
    waiting: [],
    builder: {
      on: true,
      working: "#41",
      cards: [41],
      now: { 41: "Adding the delivery date to the order summary" },
    },
    columns: [
      {
        id: "todo",
        title: "To do",
        cards: [
          card(44, "Show the opening hours on the shop's page", {
            type: "feature",
          }),
          card(43, "Remember the last delivery address", {
            from: EXPLORED("Ordering again in one go"),
            type: "improvement",
          }),
        ],
      },
      {
        id: "building",
        title: "Building",
        cards: [
          card(41, "Delivery date on the order summary", {
            from: EXPLORED("Knowing when it arrives"),
            type: "feature",
          }),
        ],
      },
      {
        id: "review",
        title: "Review",
        cards: [
          card(40, "Search finds products by their old names", {
            fix: true,
            type: "bug",
          }),
        ],
      },
      {
        id: "done",
        title: "Done",
        cards: [
          card(39, "Prices with VAT on every page", { type: "improvement" }),
          card(37, "Sign in with a link by email", { type: "feature" }),
          card(36, "Basket keeps items after signing in", {
            fix: true,
            type: "bug",
          }),
        ],
      },
    ],
  };
}

// Variant B: the signals sent straight to To do, kept while the app is
// open, so the Factory board shows them on top of To do.
const sent: { title: string; more: Partial<ShownCard> }[] = [];

export function sendToDo(title: string, more: Partial<ShownCard>): void {
  sent.push({ title, more });
}

export function withSent(view: FactoryView): FactoryView {
  return sent.reduce(
    (board, one) => withToDo(board, card(nextNumber(board), one.title, one.more)),
    view,
  );
}

// Variant C: the errors on the board when the page opens.
export const FIRST_ERRORS: ShownCard[] = [
  card(46, "Checkout fails when the basket is empty: “total is undefined”", {
    came: "error",
    times: 14,
    type: "bug",
    fix: true,
  }),
  card(45, "Product page: image “undefined.jpg” not found", {
    came: "error",
    times: 3,
    type: "bug",
    fix: true,
  }),
];

// Errors the live app reports while the page is open, one by one: a new
// one, then the same one again.
export const LATER_ERRORS: { title: string; came: Came }[] = [
  { title: "Orders page times out after 30 seconds", came: "error" },
  { title: "Checkout fails when the basket is empty: “total is undefined”", came: "error" },
  { title: "Orders page times out after 30 seconds", came: "error" },
];

// The board with a card on top of To do.
export function withToDo(view: FactoryView, added: ShownCard): FactoryView {
  return {
    ...view,
    columns: view.columns.map((column) =>
      column.id === "todo"
        ? { ...column, cards: [added, ...column.cards] }
        : column,
    ),
  };
}

// The next free card number.
export function nextNumber(view: FactoryView): number {
  const all = view.columns.flatMap((column) => column.cards.map((one) => one.number));
  return Math.max(0, ...all) + 1;
}

export function madeCard(
  number: number,
  title: string,
  more: Partial<ShownCard> = {},
): ShownCard {
  return card(number, title, more);
}
