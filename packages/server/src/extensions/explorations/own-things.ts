// What a person puts on an exploration's board themselves, besides pictures
// (person-acts.ts): a one-line note, a link (with the preview its page
// shares), a pen stroke on a card, and taking a stroke off again. All are
// theirs: the kobold may move them, never change or remove them. A note is
// heard at once; a link, a drawing and a picture come with their next
// words, and each is marked taken in once the kobold has answered with it.

import type { Board, KobbleStore, Thing } from "@software-factory/core";
import { z } from "zod";

import { Refused } from "../../refused.ts";
import { savePictureData, saveBytes } from "./board-pictures.ts";
import { newId, thingOf, withThing } from "./board-things.ts";
import type { Look } from "./link-preview.ts";
import type { ExplorationTalks } from "./talks.ts";

const place = { x: z.number(), y: z.number() };
const point = z.tuple([z.number(), z.number()]);

const actSchema = z.discriminatedUnion("act", [
  z.object({
    act: z.literal("note"),
    text: z.string().trim().min(1).max(200),
    ...place,
  }),
  z.object({
    act: z.literal("link"),
    url: z.url({ protocol: /^https?$/ }).max(2000),
    ...place,
  }),
  z.object({
    act: z.literal("draw"),
    // The card drawn on; none: a new sketch card opens at `at`, and the
    // points are from there.
    on: z.string().nullable(),
    at: z.object(place).optional(),
    points: z.array(point).min(1).max(1500),
    // The card as drawn, with this stroke on it: what the kobold sees.
    picture: z.string().nullish(),
  }),
  z.object({
    act: z.literal("erase"),
    id: z.string(),
    // Its card as drawn now, without the stroke.
    picture: z.string().nullish(),
  }),
]);

type Own = z.infer<typeof actSchema>;

export type Dealings = {
  store: KobbleStore;
  talks: ExplorationTalks;
  look: Look;
  onChange: () => void;
};

const tidy = (value: number) => Math.round(value * 10) / 10;

export function ownThings(
  on: Dealings,
  id: string,
  body: unknown,
): { thing: Thing } | Record<string, never> {
  const parsed = actSchema.safeParse((body as { do?: unknown } | null)?.do);
  if (!parsed.success)
    throw new Refused("That is not something a person adds to the board.");
  const act = parsed.data;
  switch (act.act) {
    case "note":
      return { thing: addNote(on, id, act) };
    case "link":
      return { thing: addLink(on, id, act) };
    case "draw":
      return { thing: draw(on, id, act) };
    case "erase":
      erase(on, id, act);
      return {};
  }
}

const theirs = { agreed: false, by: "person" as const };

function addNote(
  { store, talks }: Dealings,
  id: string,
  act: Extract<Own, { act: "note" }>,
): Thing {
  const board = store.board(id);
  const thing: Thing = {
    id: newId(board, "note"),
    kind: "note",
    ...theirs,
    place: { x: tidy(act.x), y: tidy(act.y) },
    text: act.text,
  };
  store.saveBoard(id, withThing(board, thing));
  talks.sayNow(id, `I added a note: “${act.text}”`, [thing.id]);
  return thing;
}

const siteOf = (address: string) =>
  new URL(address).hostname.replace(/^www\./, "");

function addLink(
  on: Dealings,
  id: string,
  act: Extract<Own, { act: "link" }>,
): Thing {
  const { store, talks } = on;
  const url = new URL(act.url).href;
  const board = store.board(id);
  // The simple card first; the page's preview follows when it is read.
  const thing: Thing = {
    id: newId(board, "link"),
    kind: "link",
    ...theirs,
    place: { x: tidy(act.x), y: tidy(act.y) },
    url,
    title: siteOf(url),
    site: siteOf(url),
  };
  store.saveBoard(id, withThing(board, thing));
  void previewed(on, id, thing.id, url).finally(() => {
    talks.personDid(id, `added a link, ${thing.id} (${siteOf(url)})`, [
      thing.id,
    ]);
  });
  return thing;
}

// The link's card with what its page shares, when it shares something and
// the card is still there; a page that fails leaves the simple card.
async function previewed(
  { store, look, onChange }: Dealings,
  id: string,
  thing: string,
  url: string,
): Promise<void> {
  try {
    const shared = await look(url);
    const card = store.board(id).things.find((one) => one.id === thing);
    if (card?.kind !== "link") return;
    const image = shared.image
      ? saveBytes(store, id, shared.image.bytes, shared.image.kind)
      : undefined;
    const icon = shared.icon
      ? saveBytes(store, id, shared.icon.bytes, shared.icon.kind)
      : undefined;
    const board = store.board(id);
    store.saveBoard(
      id,
      withThing(board, {
        ...card,
        title: shared.title?.trim().slice(0, 200) || card.title,
        site: shared.site?.trim().slice(0, 100) || card.site,
        ...(image ? { preview: image } : {}),
        ...(icon ? { icon } : {}),
      }),
    );
    onChange();
  } catch {
    // The simple card stays.
  }
}

function draw(
  { store, talks }: Dealings,
  id: string,
  act: Extract<Own, { act: "draw" }>,
): Thing {
  const board = store.board(id);
  const picture = act.picture
    ? savePictureData(store, id, act.picture)
    : undefined;
  const opened = act.on === null;
  const card = opened ? newSketch(board, act.at) : thingOf(board, act.on ?? "");
  if (card.kind === "mark")
    throw new Refused("A mark goes on a card, not on another mark.");
  const base = opened ? withThing(board, card) : board;
  const mark: Thing = {
    id: newId(base, "mark"),
    kind: "mark",
    ...theirs,
    place: null,
    on: card.id,
    points: act.points.map(([x, y]) => [tidy(x), tidy(y)]),
    // A sketch keeps its picture on itself; another card on its last mark.
    ...(card.kind === "sketch" || !picture ? {} : { image: picture }),
  };
  const drawn = withThing(
    base,
    // A card drawn on again is not taken in: there is more to see.
    card.kind === "sketch"
      ? { ...card, image: picture ?? card.image, taken: false }
      : card,
  );
  store.saveBoard(id, withThing(drawn, mark));
  const things = card.kind === "sketch" ? [mark.id, card.id] : [mark.id];
  talks.personDid(
    id,
    `drew on ${card.kind} ${card.id} (the marks come with the card's picture in the board)`,
    things,
  );
  return mark;
}

function newSketch(board: Board, at: { x: number; y: number } | undefined) {
  if (!at) throw new Refused("A new drawing needs the place it starts at.");
  const card: Thing = {
    id: newId(board, "sketch"),
    kind: "sketch",
    ...theirs,
    place: { x: tidy(at.x), y: tidy(at.y) },
  };
  return card;
}

function erase(
  { store, talks }: Dealings,
  id: string,
  act: Extract<Own, { act: "erase" }>,
): void {
  const board = store.board(id);
  const mark = thingOf(board, act.id);
  if (mark.kind !== "mark" || mark.by !== "person")
    throw new Refused("Only a mark the team drew can be taken off here.");
  const picture = act.picture ? savePictureData(store, id, act.picture) : null;
  const rest = board.things.filter((one) => one.id !== mark.id);
  // A sketch keeps the card's picture itself; any other card on its last
  // mark.
  const last = rest.findLast(
    (one) => one.kind === "mark" && one.on === mark.on,
  );
  const kept = rest.map((one) => {
    if (one.kind === "sketch" && one.id === mark.on)
      return { ...one, image: picture ?? undefined };
    if (one === last && one.kind === "mark")
      return { ...one, image: picture ?? undefined };
    return one;
  });
  store.saveBoard(id, { ...board, things: kept });
  talks.personDid(id, `took a mark off ${mark.on}`);
}
