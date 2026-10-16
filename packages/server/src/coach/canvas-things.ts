// The canvas's own things beside the company and its products: the cards
// the coach writes the context on, the arrows between them, and what it
// proposes to install. Plain rules
// over the draft, each returning the new draft; a change that does not fit
// is refused with why.

import type { Draft, IconName, Thing } from "../api.ts";
import type { Installable } from "../installables.ts";
import { Refused } from "../refused.ts";

export const COMPANY = "company";

// Every id on the canvas: the company, the products and the things.
export function idsOn(draft: Draft): Set<string> {
  return new Set([
    COMPANY,
    ...draft.products.map((p) => p.id),
    ...draft.things.map((t) => t.id),
  ]);
}

// The next free id for a kind of thing ("card-3").
function nextId(draft: Draft, kind: string): string {
  const taken = new Set([...idsOn(draft), ...draft.links.map((l) => l.id)]);
  let n = 1;
  while (taken.has(`${kind}-${String(n)}`)) n += 1;
  return `${kind}-${String(n)}`;
}

export type CardIdea = {
  // A card to write again; none: a new card.
  id?: string;
  area: string;
  title: string;
  text?: string;
  icon?: IconName;
  // A checked path inside the project (pictures.ts).
  picture?: string;
  tone?: "rule" | "question";
  from: "code" | "owner";
};

// A card written, or written again. What the owner said is confirmed
// already; a guess from the code is not until they agree.
export function writeCard(
  draft: Draft,
  idea: CardIdea,
): { draft: Draft; id: string } {
  const { area, title, text } = checked(draft, idea);
  const id = idea.id ?? nextId(draft, "card");
  const made: Thing = {
    id,
    kind: "card",
    area,
    title,
    ...(text ? { text } : {}),
    ...(idea.icon ? { icon: idea.icon } : {}),
    ...(idea.picture ? { picture: idea.picture } : {}),
    ...(idea.tone ? { tone: idea.tone } : {}),
    confirmed: idea.from === "owner",
  };
  const things = idea.id
    ? draft.things.map((t) => (t.id === id ? made : t))
    : [...draft.things, made];
  return { draft: { ...draft, things }, id };
}

// A card's words, trimmed, and refused when they do not fit.
function checked(
  draft: Draft,
  idea: CardIdea,
): { area: string; title: string; text: string | undefined } {
  const area = idea.area.trim();
  const title = idea.title.trim();
  if (!area || !title) throw new Refused("Give the card an area and a title.");
  const text = idea.text?.trim();
  if (text && text.length > 120)
    throw new Refused("Keep a card's text to one short line; make more cards.");
  if (idea.id !== undefined && thingOf(draft, idea.id).kind !== "card")
    throw new Refused(`${idea.id} is not a card.`);
  return { area, title, text };
}

// What the coach points the owner to: things on the canvas and areas.
export function focus(
  draft: Draft,
  on: { ids?: string[]; areas?: string[] },
): Draft {
  const ids = on.ids ?? [];
  const areas = on.areas ?? [];
  const known = idsOn(draft);
  const unknown = ids.filter((id) => !known.has(id));
  if (unknown.length > 0)
    throw new Refused(`There is nothing called ${unknown.join(", ")}.`);
  const named = new Set(
    draft.things.flatMap((t) => (t.kind === "card" ? [t.area] : [])),
  );
  const missing = areas.filter((area) => !named.has(area));
  if (missing.length > 0)
    throw new Refused(`There is no area ${missing.join(", ")}.`);
  if (ids.length + areas.length === 0)
    throw new Refused("Say which cards or areas to point to.");
  return { ...draft, focus: { ids, areas, n: draft.focus.n + 1 } };
}

// An arrow from one card to another, with a short label if it helps.
export function connect(
  draft: Draft,
  arrow: { from: string; to: string; label?: string },
): { draft: Draft; id: string } {
  for (const end of [arrow.from, arrow.to])
    if (!draft.things.some((t) => t.id === end && t.kind === "card"))
      throw new Refused(`There is no card ${end}.`);
  if (arrow.from === arrow.to)
    throw new Refused("An arrow joins two different cards.");
  if (draft.links.some((l) => l.from === arrow.from && l.to === arrow.to))
    throw new Refused(`${arrow.from} already points to ${arrow.to}.`);
  const id = nextId(draft, "arrow");
  const made = {
    id,
    from: arrow.from,
    to: arrow.to,
    label: arrow.label?.trim() ?? "",
  };
  return { draft: { ...draft, links: [...draft.links, made] }, id };
}

export function disconnect(draft: Draft, id: string): Draft {
  if (!draft.links.some((l) => l.id === id))
    throw new Refused(`There is no arrow ${id}.`);
  return { ...draft, links: draft.links.filter((l) => l.id !== id) };
}

// Agreed with the owner: solid instead of a sketch (or back).
export function settle(draft: Draft, ids: string[], settled: boolean): Draft {
  const known = idsOn(draft);
  const unknown = ids.filter((id) => !known.has(id));
  if (unknown.length > 0)
    throw new Refused(`There is nothing called ${unknown.join(", ")}.`);
  const chosen = new Set(ids);
  return {
    ...draft,
    company: chosen.has(COMPANY)
      ? { ...draft.company, settled }
      : draft.company,
    products: draft.products.map((p) =>
      chosen.has(p.id) ? { ...p, settled } : p,
    ),
    things: draft.things.map((t) =>
      chosen.has(t.id) && t.kind === "card" ? { ...t, confirmed: settled } : t,
    ),
  };
}

// A thing taken off the canvas, with its arrows and its place.
export function removeThing(draft: Draft, id: string): Draft {
  thingOf(draft, id);
  return withoutPlace(
    { ...draft, things: draft.things.filter((t) => t.id !== id) },
    id,
  );
}

// The arrows and the place of something taken off the canvas.
export function withoutPlace(draft: Draft, id: string): Draft {
  return {
    ...draft,
    links: draft.links.filter((l) => l.from !== id && l.to !== id),
    places: Object.fromEntries(
      Object.entries(draft.places).filter(([key]) => key !== id),
    ),
  };
}

// Where the owner put a thing by hand.
export function move(
  draft: Draft,
  place: { id: string; x: number; y: number },
): Draft {
  if (!idsOn(draft).has(place.id))
    throw new Refused(`There is nothing called ${place.id}.`);
  return {
    ...draft,
    places: { ...draft.places, [place.id]: { x: place.x, y: place.y } },
  };
}

// The coach proposes to install something from the closed list, with why;
// the owner answers on the canvas.
export function propose(
  draft: Draft,
  installables: Installable[],
  proposal: { what: string; why: string },
): { draft: Draft; id: string } {
  const what = installables.find((i) => i.id === proposal.what);
  if (!what)
    throw new Refused(
      `"${proposal.what}" is not something the factory can install.`,
    );
  if (draft.things.some((t) => t.kind === "install" && t.what === what.id))
    throw new Refused(`${what.name} is proposed already.`);
  if (what.present())
    throw new Refused(`${what.name} is on this computer already.`);
  const id = nextId(draft, "install");
  const made: Thing = {
    id,
    kind: "install",
    what: what.id,
    name: what.name,
    about: what.about,
    why: proposal.why.trim(),
    answer: "asked",
  };
  return { draft: { ...draft, things: [...draft.things, made] }, id };
}

export function answerInstall(
  draft: Draft,
  answer: { id: string; answer: "approved" | "declined" },
): Draft {
  const thing = thingOf(draft, answer.id);
  if (thing.kind !== "install")
    throw new Refused(`${answer.id} is not something to install.`);
  return replaceThing(draft, { ...thing, answer: answer.answer });
}

// What the owner approved to install, by its id in the installables.
export function approved(draft: Draft): string[] {
  return draft.things.flatMap((t) =>
    t.kind === "install" && t.answer === "approved" ? [t.what] : [],
  );
}

function thingOf(draft: Draft, id: string): Thing {
  const thing = draft.things.find((t) => t.id === id);
  if (!thing) throw new Refused(`There is no card or install ${id}.`);
  return thing;
}

function replaceThing(draft: Draft, thing: Thing): Draft {
  return {
    ...draft,
    things: draft.things.map((t) => (t.id === thing.id ? thing : t)),
  };
}
