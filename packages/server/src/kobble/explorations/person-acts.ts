// What a person does on an exploration's board: move a thing, mark it agreed
// or a sketch, choose an option, change a picture's title, remove what they
// put there, and add a picture (pasted or dragged in). The kobold hears of
// it with their next words, except a picked option, which is said in the
// conversation at once. The things they attach to what they say.

import { randomUUID } from "node:crypto";

import type { KobbleStore, Thing } from "@software-factory/core";
import { z } from "zod";

import { Refused } from "../../refused.ts";
import { type Act, personWords } from "./board-acts.ts";
import { newId, thingOf, withThing } from "./board-things.ts";
import type { ExplorationTalks } from "./talks.ts";

const actSchema = z.discriminatedUnion("act", [
  z.object({
    act: z.literal("move"),
    id: z.string(),
    x: z.number(),
    y: z.number(),
  }),
  z.object({ act: z.literal("agree"), id: z.string(), agreed: z.boolean() }),
  z.object({
    act: z.literal("choose"),
    id: z.string(),
    option: z.string().nullable(),
  }),
  z.object({ act: z.literal("remove"), id: z.string() }),
  z.object({
    act: z.literal("change"),
    id: z.string(),
    title: z.string().min(1),
  }),
]);

export function personActs(
  store: KobbleStore,
  talks: ExplorationTalks,
  id: string,
  body: unknown,
): void {
  const parsed = actSchema.safeParse((body as { do?: unknown } | null)?.do);
  if (!parsed.success)
    throw new Refused("That is not something the board does.");
  const act: Act = parsed.data;
  const board = store.board(id);
  if (act.act === "remove" && thingOf(board, act.id).by !== "person")
    throw new Refused(
      "Only what a person put on the board can be removed here.",
    );
  talks.act(id, act, "person");
  if (act.act === "move") return;
  const words = personWords(act, board);
  const picked = pickedWords(act, board);
  // Picking an option is said in the conversation, so the kobold goes on
  // at once; while it is still answering, it hears it with the next words.
  if (picked)
    void talks.say(id, picked).catch(() => {
      talks.personDid(id, words);
    });
  else talks.personDid(id, words);
}

// "I pick B: Send everyone at once." for an option picked on a choice.
function pickedWords(act: Act, board: ReturnType<KobbleStore["board"]>) {
  if (act.act !== "choose" || !act.option) return null;
  const choice = board.things.find((one) => one.id === act.id);
  if (choice?.kind !== "choice") return null;
  const option = choice.options.find((one) => one.key === act.option);
  return option ? `I pick ${option.key}: ${option.name}.` : null;
}

export function attachedIn(body: unknown): string[] {
  const attached = (body as { attached?: unknown } | null)?.attached;
  return Array.isArray(attached)
    ? attached.filter((one): one is string => typeof one === "string")
    : [];
}

const PICTURE = /^data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/=]+)$/;
// Up to 3.75 MB, as Claude takes pictures.
const MOST_BYTES = (5 * 1024 * 1024 * 3) / 4;

export function addPicture(
  store: KobbleStore,
  talks: ExplorationTalks,
  id: string,
  body: unknown,
): Thing {
  const { title, data } = z
    .object({
      title: z.string().trim().min(1).default("Picture"),
      data: z.string(),
    })
    .catch({ title: "Picture", data: "" })
    .parse(body);
  const found = PICTURE.exec(data);
  if (!found?.[1] || !found[2])
    throw new Refused("Only pictures can go on the board.");
  const bytes = Buffer.from(found[2], "base64");
  if (bytes.length > MOST_BYTES)
    throw new Refused("The picture is larger than 3.7 MB: take a smaller one.");
  const kind = found[1] === "jpeg" ? "jpg" : found[1];
  const image = store.savePicture(
    id,
    `${randomUUID().slice(0, 8)}.${kind}`,
    bytes,
  );
  const board = store.board(id);
  const thing: Thing = {
    id: newId(board, "picture"),
    kind: "picture",
    agreed: false,
    place: null,
    by: "person",
    title: title.slice(0, 80),
    image,
  };
  store.saveBoard(id, withThing(board, thing));
  talks.personDid(id, `added a picture, ${thing.id} (“${thing.title}”)`);
  return thing;
}
