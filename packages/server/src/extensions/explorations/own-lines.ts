// What the team's own things on a board come to for the kobold, in a line:
// a picture, a link (with its preview), a sketch card and the pen marks on a
// card. Each says where to read its picture.

import type { Exploration, Thing } from "@software-factory/core";

type Own = Extract<Thing, { kind: "picture" | "link" | "sketch" | "mark" }>;
type Mark = Extract<Thing, { kind: "mark" }>;

// "(read … to see it)" for a picture's file, or nothing without one.
function reading(
  exploration: Exploration,
  file: string | undefined,
  what = "it",
): string {
  if (!file) return "";
  const where = `factory/kobble/explorations/${exploration.id}/pictures/${file}`;
  return ` (read ${where} to see ${what})`;
}

function marksLine(marks: Mark[], exploration: Exploration): string {
  const image = marks.findLast((one) => one.image)?.image;
  const many = marks.length === 1 ? "" : "s";
  const count = `${String(marks.length)} pen mark${many} on ${marks[0]?.on ?? ""}`;
  const seen = reading(
    exploration,
    image,
    "them: the marks alone, at the card's size and place",
  );
  return `${count}${seen}`;
}

export function ownLine(
  head: string,
  thing: Own,
  exploration: Exploration,
  all: Thing[],
): string {
  switch (thing.kind) {
    case "picture":
      return `${head}: ${thing.title}${reading(exploration, thing.image)}`;
    case "link": {
      const seen = reading(exploration, thing.preview, "its preview");
      return `${head}: ${thing.title}, on ${thing.site}, ${thing.url}${seen}`;
    }
    case "sketch":
      return `${head}: a drawing${reading(exploration, thing.image)}`;
    case "mark": {
      const marks = all.filter(
        (one): one is Mark => one.kind === "mark" && one.on === thing.on,
      );
      return `${head}: ${marksLine(marks, exploration)}`;
    }
  }
}
