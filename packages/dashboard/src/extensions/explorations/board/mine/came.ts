// What a paste or a drop brings to the board: a picture (a picture file, a
// picture copied from a page) for a picture card, or a web address (copied,
// or a link dragged from a browser) for a link card; anything else brings
// nothing. A picture wins when both come, as copying one from a page brings
// the page's address too.

import { addressOf } from "./address.ts";

export type Came = { picture: File } | { link: string };

// The parts of a clipboard or a drag the board reads.
export type Brought = {
  files: ArrayLike<File>;
  getData: (type: string) => string;
};

export function cameAs(brought: Brought | null): Came | null {
  if (!brought) return null;
  const picture = [...Array.from(brought.files)].find((one) =>
    one.type.startsWith("image/"),
  );
  if (picture) return { picture };
  const first = brought
    .getData("text/uri-list")
    .split(/\r?\n/)
    .find((line) => line && !line.startsWith("#"));
  const link = addressOf(first ?? brought.getData("text/plain"));
  return link ? { link } : null;
}
