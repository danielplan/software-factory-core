// What the team puts on the board with the toolbar, kept with the board on
// the server (a note, a link, a stroke on a card). What the page has sent
// and the server has not yet answered is shown at once as pending things
// (one list with the board's own things, so everything draws the same way),
// and goes when the new board is read (held.ts, sending.ts). The card being
// dragged follows the pointer here, and is sent where it is dropped. Only the
// person removes their things; Doodle may move them, never rewrite or delete
// them.

import { createContext, type ReactNode, use, useState } from "react";

import type { Thing } from "../nodes";
import { pictureOfCard } from "./draw";
import {
  linkOf,
  markOf,
  noteOf,
  PENDING,
  pendingId,
  sketchOf,
  type Stroke,
  useHeld,
} from "./held";
import type { Own, Point, Target } from "./own";
import { PATH, useSending } from "./sending";

type At = { x: number; y: number };

type Mine = {
  own: Own;
  // The address of a picture the server keeps for the exploration (a link's
  // preview).
  picture: (file: string) => string;
  selected: string | null;
  select: (id: string | null) => void;
  // A new sketch card, where a stroke started on empty space; its id.
  open: (at: Point) => string;
  // A new card whose first stroke drew nothing: it is not kept.
  discard: (id: string) => void;
  stroke: (stroke: Stroke) => void;
  erase: (id: string) => void;
  note: (text: string, at: At) => void;
  link: (url: string, at: At) => void;
  // A card the person drags: it follows the pointer, and is sent when
  // dropped.
  drag: (id: string, x: number, y: number) => void;
  drop: (id: string) => void;
  remove: (id: string) => void;
  // Where the cards are, for the pictures Doodle is given.
  see: (targets: Target[]) => void;
};

const Context = createContext<Mine | null>(null);

export function useMine(): Mine {
  const mine = use(Context);
  if (!mine) throw new Error("useMine is used inside MineProvider");
  return mine;
}

export function MineProvider({
  exploration,
  things,
  children,
}: Readonly<{
  exploration: string;
  // The board's things, as served.
  things: Thing[];
  children: ReactNode;
}>) {
  const held = useHeld(things);
  const { send, draw } = useSending(exploration, held);
  const [selected, select] = useState<string | null>(null);

  const stroke = (now: Stroke) => {
    const mark = markOf(pendingId(), now);
    held.setPending((all) => [...all, mark]);
    const { own, targets } = held.now();
    const marks = [...own.marks.filter((one) => one.on === now.on), mark];
    draw(now, mark.id, pictureOfCard(own, targets, now.on, marks));
  };
  const erase = (id: string) => {
    select(null);
    const { own, targets } = held.now();
    const card = own.marks.find((one) => one.id === id)?.on ?? "";
    const rest = own.marks.filter((one) => one.on === card && one.id !== id);
    const picture = pictureOfCard(own, targets, card, rest);
    void send("mine", { do: { act: "erase", id, picture } });
  };
  const add = (thing: Thing, act: Record<string, unknown>) => {
    held.setPending((all) => [...all, thing]);
    void send("mine", { do: act }, [thing.id]);
  };
  const drop = (id: string) => {
    const now = held.now().dragging;
    if (now?.id !== id || id.startsWith(PENDING)) return;
    const act = { act: "move", id, x: now.x, y: now.y };
    void send("board", { do: act }).then(() => {
      held.setDragging(null);
    });
  };

  const mine: Mine = {
    own: held.own,
    picture: (file) =>
      `${PATH}/picture?id=${encodeURIComponent(exploration)}&name=${encodeURIComponent(file)}`,
    selected,
    select,
    see: held.see,
    open: (at) => {
      const id = pendingId();
      held.setPending((all) => [...all, sketchOf(id, at)]);
      return id;
    },
    discard: (id) => {
      held.setPending((all) => all.filter((one) => one.id !== id));
    },
    stroke,
    erase,
    note: (text, at) => {
      add(noteOf(pendingId(), text, at), { act: "note", text, ...at });
    },
    link: (url, at) => {
      add(linkOf(pendingId(), url, at), { act: "link", url, ...at });
    },
    drag: (id, x, y) => {
      held.setDragging({ id, x, y });
    },
    drop,
    remove: (id) => {
      select(null);
      void send("board", { do: { act: "remove", id } });
    },
  };
  return <Context value={mine}>{children}</Context>;
}
