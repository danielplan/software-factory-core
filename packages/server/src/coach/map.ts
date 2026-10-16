// The map the setup coach draws with the owner (api.ts: Draft): plain rules
// over it, each returning the new map; a change that does not fit is
// refused with why.

import type { Card, Draft, IconName } from "../api.ts";
import { Refused } from "../refused.ts";

export const EMPTY: Draft = {
  cards: [],
  links: [],
  places: {},
  focus: { ids: [], areas: [], n: 0 },
};

// A card as the coach draws it: new, or (with its id) written again.
export type CardIdea = {
  id?: string;
  area?: string;
  title: string;
  text?: string;
  icon?: IconName;
  // A checked path inside the project (pictures.ts).
  picture?: string;
  tone?: "rule" | "question";
  confirmed?: boolean;
};

export function writeCard(
  draft: Draft,
  idea: CardIdea,
): { draft: Draft; id: string } {
  const title = idea.title.trim();
  if (!title) throw new Refused("Give the card a title.");
  const text = idea.text?.trim();
  if (text && text.length > 160)
    throw new Refused("Keep a card's text to a line or two; make more cards.");
  if (idea.id !== undefined) cardOf(draft, idea.id);
  const id = idea.id ?? nextId(draft, "card");
  const made = cardFrom(id, { ...idea, title, text });
  const cards = idea.id
    ? draft.cards.map((c) => (c.id === id ? made : c))
    : [...draft.cards, made];
  return { draft: { ...draft, cards }, id };
}

// The card as kept: what was given, without empty fields.
function cardFrom(id: string, idea: CardIdea): Card {
  const area = idea.area?.trim();
  const given = {
    area: area || undefined,
    text: idea.text || undefined,
    icon: idea.icon,
    picture: idea.picture,
    tone: idea.tone,
  };
  const kept = Object.fromEntries(
    Object.entries(given).filter(([, value]) => value !== undefined),
  );
  return { id, ...kept, title: idea.title, confirmed: idea.confirmed ?? false };
}

// A card taken off, with its arrows and its place.
export function removeCard(draft: Draft, id: string): Draft {
  cardOf(draft, id);
  return {
    ...draft,
    cards: draft.cards.filter((c) => c.id !== id),
    links: draft.links.filter((l) => l.from !== id && l.to !== id),
    places: Object.fromEntries(
      Object.entries(draft.places).filter(([key]) => key !== id),
    ),
  };
}

// An arrow from one card to another (once), with a short label if it helps.
export function connect(
  draft: Draft,
  arrow: { from: string; to: string; label?: string },
): Draft {
  cardOf(draft, arrow.from);
  cardOf(draft, arrow.to);
  if (arrow.from === arrow.to)
    throw new Refused("An arrow joins two different cards.");
  const label = arrow.label?.trim() ?? "";
  const others = draft.links.filter(
    (l) => !(l.from === arrow.from && l.to === arrow.to),
  );
  const same = draft.links.find(
    (l) => l.from === arrow.from && l.to === arrow.to,
  );
  const id = same?.id ?? nextId(draft, "arrow");
  return { ...draft, links: [...others, { id, ...arrow, label }] };
}

export function disconnect(draft: Draft, from: string, to: string): Draft {
  if (!draft.links.some((l) => l.from === from && l.to === to))
    throw new Refused(`There is no arrow from ${from} to ${to}.`);
  return {
    ...draft,
    links: draft.links.filter((l) => !(l.from === from && l.to === to)),
  };
}

// Where the owner put a card by hand.
export function move(
  draft: Draft,
  place: { id: string; x: number; y: number },
): Draft {
  const areas = new Set(
    draft.cards.flatMap((c) => (c.area ? [`area:${c.area}`] : [])),
  );
  if (!areas.has(place.id)) cardOf(draft, place.id);
  return {
    ...draft,
    places: { ...draft.places, [place.id]: { x: place.x, y: place.y } },
  };
}

// What the coach points the owner to: cards and areas.
export function focus(
  draft: Draft,
  on: { ids: string[]; areas: string[] },
): Draft {
  for (const id of on.ids) cardOf(draft, id);
  const named = new Set(draft.cards.flatMap((c) => (c.area ? [c.area] : [])));
  const missing = on.areas.filter((area) => !named.has(area));
  if (missing.length > 0)
    throw new Refused(`There is no area ${missing.join(", ")}.`);
  return { ...draft, focus: { ...on, n: draft.focus.n + 1 } };
}

// The map in short, for the coach: each card's id, area, title and line,
// and the arrows.
export function mapText(draft: Draft): string {
  if (draft.cards.length === 0) return "The map is empty.";
  const arrows = draft.links.map(
    (l) => "- " + l.from + " → " + l.to + (l.label ? " (" + l.label + ")" : ""),
  );
  return [
    "Cards:",
    ...draft.cards.map(cardLine),
    ...(arrows.length > 0 ? ["Arrows:", ...arrows] : []),
  ].join("\n");
}

// "- card-3 [Area] (rule) (guess): Title — its line"
function cardLine(card: Card): string {
  const marks = [
    card.area ? "[" + card.area + "]" : "",
    card.tone ? "(" + card.tone + ")" : "",
    card.confirmed ? "" : "(guess)",
  ].filter(Boolean);
  const line = card.text ? " — " + card.text : "";
  return ["-", card.id, ...marks].join(" ") + ": " + card.title + line;
}

function cardOf(draft: Draft, id: string): Card {
  const card = draft.cards.find((c) => c.id === id);
  if (!card) throw new Refused(`There is no card ${id}.`);
  return card;
}

// The next free id for a kind ("card-3").
function nextId(draft: Draft, kind: string): string {
  const taken = new Set([
    ...draft.cards.map((c) => c.id),
    ...draft.links.map((l) => l.id),
  ]);
  let n = 1;
  while (taken.has(`${kind}-${String(n)}`)) n += 1;
  return `${kind}-${String(n)}`;
}

// One drawing: cards to draw (new, or again by id), each with the cards it
// points to; cards and arrows to take off; what to show the owner. A new
// card can be named by a key, for arrows to it in the same drawing. What
// does not fit is said, and the rest is drawn.
export type Drawing = {
  cards?: (CardIdea & {
    key?: string;
    to?: { card: string; label?: string }[];
  })[];
  remove?: string[];
  disconnect?: { from: string; to: string }[];
  show?: { cards?: string[]; areas?: string[] };
};

export function draw(
  start: Draft,
  drawing: Drawing,
  // A card's picture, checked (pictures.ts).
  picture: (path: string) => string,
): { draft: Draft; said: string[] } {
  let draft = start;
  const said: string[] = [];
  const attempt = (act: () => string) => {
    try {
      said.push(act());
    } catch (error) {
      if (!(error instanceof Refused)) throw error;
      said.push(`Not drawn: ${error.message}`);
    }
  };
  const keys = new Map<string, string>();
  const named = (ref: string) => keys.get(ref) ?? ref;
  const cards = drawing.cards ?? [];
  // Each drawn card's id, in order (none where it was not drawn).
  const drawn: (string | null)[] = [];
  for (const entry of cards) {
    drawn.push(null);
    attempt(() => {
      const made = writeCard(draft, ideaOf(entry, picture));
      draft = made.draft;
      drawn[drawn.length - 1] = made.id;
      if (entry.key) keys.set(entry.key, made.id);
      return entry.key ? entry.key + " = " + made.id : made.id;
    });
  }
  cards.forEach((entry, index) => {
    const from = drawn[index];
    if (!from) return;
    for (const arrow of entry.to ?? [])
      attempt(() => {
        const to = named(arrow.card);
        draft = connect(draft, { from, to, label: arrow.label });
        return from + " → " + to;
      });
  });
  for (const arrow of drawing.disconnect ?? [])
    attempt(() => {
      draft = disconnect(draft, named(arrow.from), named(arrow.to));
      return `Took off ${arrow.from} → ${arrow.to}`;
    });
  for (const id of drawing.remove ?? [])
    attempt(() => {
      draft = removeCard(draft, named(id));
      return `Took off ${id}`;
    });
  if (drawing.show)
    attempt(() => {
      draft = focus(draft, {
        ids: (drawing.show?.cards ?? []).map(named),
        areas: drawing.show?.areas ?? [],
      });
      return "Shown to the owner.";
    });
  return { draft, said };
}

// A drawn card as a card idea, its picture checked.
function ideaOf(
  entry: NonNullable<Drawing["cards"]>[number],
  picture: (path: string) => string,
): CardIdea {
  const idea: CardIdea & { key?: string; to?: unknown } = { ...entry };
  delete idea.key;
  delete idea.to;
  return entry.picture ? { ...idea, picture: picture(entry.picture) } : idea;
}
