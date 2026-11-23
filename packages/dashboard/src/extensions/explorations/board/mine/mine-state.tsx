// What the person adds to the board with the toolbar: drawings (a pen
// mark that starts on a thing sticks to it), their own notes and links.
// Made-up for the prototype: kept in this browser, not sent to Doodle's
// files. A thing is the person's; Doodle may move it, never rewrite or
// delete it, so only the person removes it. Doodle "takes in" what is
// placed: shown faded with a small label.

import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ThingNode } from "../nodes";
import { boardState } from "./variant";

export type Point = readonly [number, number];

type Taken = { taken: boolean };
// A drawing, always on a card: its points are relative to the card's corner.
export type Mark = Taken & {
  id: string;
  kind: "mark";
  points: Point[];
  on: string;
};
export type NoteItem = Taken & {
  id: string;
  kind: "note";
  x: number;
  y: number;
  text: string;
};
export type LinkItem = Taken & {
  id: string;
  kind: "link";
  x: number;
  y: number;
  url: string;
};
export type Item = Mark | NoteItem | LinkItem;
export type NewItem =
  | Omit<Mark, "id" | "taken">
  | Omit<NoteItem, "id" | "taken">
  | Omit<LinkItem, "id" | "taken">;
// A line in the chat: what Doodle received (the note's words, the link's
// site; nothing for a drawing).
// `after` is how many of the kobold's and the person's messages came before it.
export type Line = {
  id: string;
  kind: Item["kind"];
  about: string;
  after: number;
};

type Kept = { items: Item[]; seeded: boolean };

type Mine = {
  items: Item[];
  seeded: boolean;
  selected: string | null;
  lines: Line[];
  add: (item: NewItem, about: string) => string;
  move: (id: string, x: number, y: number) => void;
  remove: (id: string) => void;
  select: (id: string | null) => void;
  seed: (nodes: ThingNode[]) => void;
};

const Context = createContext<Mine | null>(null);

export function useMine(): Mine {
  const mine = use(Context);
  if (!mine) throw new Error("useMine is used inside MineProvider");
  return mine;
}

function load(key: string): Kept {
  try {
    const kept = JSON.parse(localStorage.getItem(key) ?? "null") as Kept | null;
    if (kept && Array.isArray(kept.items)) return kept;
  } catch {
    // Nothing kept, or unreadable: start again.
  }
  return { items: [], seeded: boardState() === "empty" };
}

let count = 0;
const idOf = (kind: string) =>
  `${kind}-${Date.now().toString(36)}${String(count++)}`;

// A wobbly loop drawn by hand, inside a box (a card's edges).
function loopIn(width: number, height: number): Point[] {
  const out: Point[] = [];
  const steps = 48;
  for (let i = 0; i <= steps + 6; i++) {
    const a = (i / steps) * Math.PI * 2 - Math.PI / 2;
    const wobble = 1 + Math.sin(i * 1.7) * 0.012 + i * 0.0015;
    out.push([
      width / 2 + (width / 2 - 10) * Math.cos(a) * wobble,
      height / 2 + (height / 2 - 8) * Math.sin(a) * wobble,
    ]);
  }
  return out;
}

export function MineProvider({
  exploration,
  said,
  children,
}: Readonly<{
  exploration: string;
  // How many messages the conversation has now.
  said: number;
  children: ReactNode;
}>) {
  const key = `mine:${exploration}:${boardState()}`;
  const [kept, setKept] = useState(() => load(key));
  const [selected, select] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const spoken = useRef(said);
  useEffect(() => {
    spoken.current = said;
  }, [said]);
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(kept));
  }, [key, kept]);

  const change = useCallback((edit: (items: Item[]) => Item[]) => {
    setKept((now) => ({ ...now, items: edit(now.items) }));
  }, []);

  const add = useCallback(
    (item: NewItem, about: string) => {
      const id = idOf(item.kind);
      change((items) => [...items, { ...item, id, taken: false } as Item]);
      const after = spoken.current;
      setLines((lines) => [...lines, { id, kind: item.kind, about, after }]);
      return id;
    },
    [change],
  );

  const move = useCallback(
    (id: string, x: number, y: number) => {
      change((items) =>
        items.map((one) =>
          one.id === id && one.kind !== "mark" ? { ...one, x, y } : one,
        ),
      );
    },
    [change],
  );

  const remove = useCallback(
    (id: string) => {
      change((items) => items.filter((one) => one.id !== id));
      select((now) => (now === id ? null : now));
    },
    [change],
  );

  // The first time the board is laid out: one made-up drawing and one made-up
  // note, already taken in by Doodle.
  const seed = useCallback((nodes: ThingNode[]) => {
    setKept((now) => {
      if (now.seeded) return now;
      const around =
        nodes.find((n) => n.type === "choice") ??
        nodes.find((n) => n.type === "problem") ??
        nodes[0];
      const first = nodes.find((n) => n.type === "problem") ?? around;
      if (!around || !first) return now;
      const items: Item[] = [
        {
          id: "mark-seed",
          kind: "mark",
          on: around.id,
          taken: true,
          points: loopIn(
            around.measured?.width ?? around.width ?? 260,
            around.measured?.height ?? 120,
          ),
        },
        {
          id: "note-seed",
          kind: "note",
          taken: true,
          x: first.position.x,
          y: first.position.y - 84,
          text: "Mia pays on the laptop at night",
        },
      ];
      return { items, seeded: true };
    });
  }, []);

  const value = useMemo<Mine>(
    () => ({
      items: kept.items,
      seeded: kept.seeded,
      selected,
      lines,
      add,
      move,
      remove,
      select,
      seed,
    }),
    [kept, selected, lines, add, move, remove, seed],
  );
  return <Context value={value}>{children}</Context>;
}
