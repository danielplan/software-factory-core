// What each kind of thing on an exploration's board looks like: its name,
// its icon and its colour, so the canvas and the list read at a glance.
// And how far an exploration is, from what its board holds.

import type { TFunction } from "i18next";
import {
  CircleAlert,
  GitFork,
  Image,
  Link2,
  type LucideIcon,
  MessagesSquare,
  MonitorSmartphone,
  Pencil,
  StickyNote,
  Workflow,
} from "lucide-react";

import type { Thing } from "./board/nodes";
import { ENGLISH } from "../../i18n/messages.ts";

export const KINDS: Record<Thing["kind"], { Icon: LucideIcon; tint: string }> =
  {
    problem: {
      Icon: CircleAlert,
      tint: "bg-[#fdf1d8] text-[#8a5a12]",
    },
    heard: {
      Icon: MessagesSquare,
      tint: "bg-[#e8f0fe] text-[#2948bc]",
    },
    note: { Icon: StickyNote, tint: "bg-[#f1f2f5] text-[#4b5263]" },
    choice: {
      Icon: GitFork,
      tint: "bg-[#efe9fd] text-[#5b3fb0]",
    },
    prototype: {
      Icon: MonitorSmartphone,
      tint: "bg-[#e6f6f3] text-[#0d7a6d]",
    },
    diagram: {
      Icon: Workflow,
      tint: "bg-[#e3f4f8] text-[#106a80]",
    },
    picture: {
      Icon: Image,
      tint: "bg-[#fdeef3] text-[#a02a55]",
    },
    // What the team put on the board themselves (blue, as their things are).
    link: { Icon: Link2, tint: "bg-[#e8f0fe] text-[#2948bc]" },
    sketch: { Icon: Pencil, tint: "bg-[#e8f0fe] text-[#2948bc]" },
    mark: { Icon: Pencil, tint: "bg-[#e8f0fe] text-[#2948bc]" },
  };

// Where an exploration is, in words, from what its board holds: its icon
// and colour are those of the thing it is at.
export function whereItIs(
  row: {
    status: string;
    things: { kind: Thing["kind"]; agreed: boolean }[];
  },
  m: TFunction = ENGLISH,
): { text: string; kind: Thing["kind"] } {
  const count = (kind: Thing["kind"]) =>
    row.things.filter((thing) => thing.kind === kind).length;
  if (row.status === "handed-off")
    return { text: m("explore.where.handedOff"), kind: "prototype" };
  if (row.things.some((t) => t.kind === "prototype" && t.agreed))
    return { text: m("explore.where.agreed"), kind: "prototype" };
  const prototypes = count("prototype");
  if (prototypes > 0)
    return {
      text: m("explore.where.toTry", { count: prototypes }),
      kind: "prototype",
    };
  const choices = count("choice");
  if (choices > 0) return { text: m("explore.where.choosing"), kind: "choice" };
  return { text: m("explore.where.understanding"), kind: "problem" };
}
