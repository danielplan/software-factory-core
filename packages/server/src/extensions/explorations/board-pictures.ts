// A picture that comes as a data address (pasted, dropped or drawn by the
// page) kept in the exploration's pictures/ folder, the file's name.

import { randomUUID } from "node:crypto";

import type { KobbleStore } from "@software-factory/core";

import { Refused } from "../../refused.ts";

const PICTURE = /^data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/=]+)$/;
// Up to 3.75 MB, as Claude takes pictures.
const MOST_BYTES = (5 * 1024 * 1024 * 3) / 4;

export function savePictureData(
  store: KobbleStore,
  id: string,
  data: string,
): string {
  const found = PICTURE.exec(data);
  if (!found?.[1] || !found[2])
    throw new Refused("Only pictures can go on the board.");
  const bytes = Buffer.from(found[2], "base64");
  if (bytes.length > MOST_BYTES)
    throw new Refused("The picture is larger than 3.7 MB: take a smaller one.");
  return saveBytes(store, id, bytes, found[1] === "jpeg" ? "jpg" : found[1]);
}

export function saveBytes(
  store: KobbleStore,
  id: string,
  bytes: Uint8Array,
  kind: string,
): string {
  return store.savePicture(id, `${randomUUID().slice(0, 8)}.${kind}`, bytes);
}
