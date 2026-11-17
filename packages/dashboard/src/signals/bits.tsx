// Small pieces the Signals and Personas pages share: a signal's source as a
// round icon, its type as a chip, and a persona's face.

import { Activity, Bug, FlaskConical, MessageSquarePlus } from "lucide-react";

import type { SignalRow } from "@/api";
import { cn } from "@/lib/utils";
import { Initial } from "@/understand/bits";
import { tintOf } from "@/understand/view";

import { SOURCE_WORDS, tintIndexOf, TYPE_WORDS } from "./view";

const SOURCES: Record<SignalRow["source"], { icon: typeof Bug; tone: string }> =
  {
    app: { icon: MessageSquarePlus, tone: "bg-success/10 text-success" },
    usage: { icon: Activity, tone: "bg-blue/10 text-blue" },
    errors: { icon: Bug, tone: "bg-destructive/10 text-destructive" },
    test: { icon: FlaskConical, tone: "bg-explore/15 text-solving-foreground" },
  };

export function SourceIcon({
  source,
}: Readonly<{ source: SignalRow["source"] }>) {
  const { icon: Icon, tone } = SOURCES[source];
  return (
    <span
      title={SOURCE_WORDS[source]}
      className={cn(
        "grid size-[34px] flex-none place-items-center rounded-full",
        tone,
      )}
    >
      <Icon aria-hidden className="size-4" />
    </span>
  );
}

const TYPES: Record<SignalRow["type"], string> = {
  bug: "bg-destructive/10 text-destructive",
  request: "bg-blue/10 text-blue",
  feedback: "bg-solving text-solving-foreground",
};

export function TypeChip({ type }: Readonly<{ type: SignalRow["type"] }>) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] flex-none items-center rounded-full px-2.5 text-[11.5px] font-medium whitespace-nowrap",
        TYPES[type],
      )}
    >
      {TYPE_WORDS[type]}
    </span>
  );
}

// A persona's face, or an empty one for someone unknown.
export function PersonaFace({
  id,
  name,
  big = false,
}: Readonly<{ id: string | null; name: string | null; big?: boolean }>) {
  if (!id || !name)
    return (
      <span
        aria-hidden
        className={cn(
          "flex-none rounded-full bg-surface-2",
          big ? "size-16" : "size-9",
        )}
      />
    );
  return <Initial name={name} tint={tintOf(tintIndexOf(id))} big={big} />;
}
