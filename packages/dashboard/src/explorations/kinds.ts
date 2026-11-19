// What each kind of thing on an exploration's board looks like: its name,
// its icon and its colour, so the canvas and the list read at a glance.
// And how far an exploration is, from what its board holds.

import {
  CircleAlert,
  GitFork,
  Image,
  type LucideIcon,
  MessagesSquare,
  MonitorSmartphone,
  StickyNote,
  Workflow,
} from "lucide-react";

import type { Thing } from "./board/nodes";

export const KINDS: Record<
  Thing["kind"],
  { name: string; Icon: LucideIcon; tint: string }
> = {
  problem: {
    name: "The problem",
    Icon: CircleAlert,
    tint: "bg-[#fdf1d8] text-[#8a5a12]",
  },
  heard: {
    name: "What we heard",
    Icon: MessagesSquare,
    tint: "bg-[#e8f0fe] text-[#2948bc]",
  },
  note: { name: "Note", Icon: StickyNote, tint: "bg-[#f1f2f5] text-[#4b5263]" },
  choice: {
    name: "Choice",
    Icon: GitFork,
    tint: "bg-[#efe9fd] text-[#5b3fb0]",
  },
  prototype: {
    name: "Prototype",
    Icon: MonitorSmartphone,
    tint: "bg-[#e6f6f3] text-[#0d7a6d]",
  },
  diagram: {
    name: "Diagram",
    Icon: Workflow,
    tint: "bg-[#e3f4f8] text-[#106a80]",
  },
  picture: {
    name: "Picture",
    Icon: Image,
    tint: "bg-[#fdeef3] text-[#a02a55]",
  },
};

// Where an exploration is, in words, from what its board holds: its icon
// and colour are those of the thing it is at.
export function whereItIs(row: {
  status: string;
  things: { kind: Thing["kind"]; agreed: boolean }[];
}): { text: string; kind: Thing["kind"] } {
  const count = (kind: Thing["kind"]) =>
    row.things.filter((thing) => thing.kind === kind).length;
  const plural = (n: number, one: string, many: string) =>
    `${String(n)} ${n === 1 ? one : many}`;
  if (row.status === "handed-off")
    return { text: "Handed off to the Factory", kind: "prototype" };
  if (row.things.some((t) => t.kind === "prototype" && t.agreed))
    return { text: "Agreed: ready to hand off", kind: "prototype" };
  const prototypes = count("prototype");
  if (prototypes > 0)
    return {
      text: `${plural(prototypes, "prototype", "prototypes")} to try`,
      kind: "prototype",
    };
  const choices = count("choice");
  if (choices > 0) return { text: "Choosing a way", kind: "choice" };
  return { text: "Understanding the problem", kind: "problem" };
}
