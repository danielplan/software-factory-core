// Small pieces the Understand pages share: a story's pill, the kobold's
// mark, a persona's initial, and a small label.

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { type Tone } from "./view";

const TONES: Record<Tone, string> = {
  open: "bg-open text-open-foreground",
  solving: "bg-solving text-solving-foreground",
  solved: "bg-solved text-solved-foreground",
  wrong: "bg-wrong text-wrong-foreground",
  none: "bg-wrong text-wrong-foreground",
};

export function Pill({
  tone,
  children,
}: Readonly<{ tone: Tone; children: ReactNode }>) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold whitespace-nowrap",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

// The kobold itself, Kobble's mascot, where it speaks or works.
export function KoboldMark({ className }: Readonly<{ className?: string }>) {
  return (
    <img
      src="/kobold.png"
      alt=""
      aria-hidden
      className={cn("size-7 flex-none object-contain", className)}
    />
  );
}

export function Initial({
  name,
  tint,
  big = false,
}: Readonly<{ name: string; tint: string; big?: boolean }>) {
  return (
    <span
      className={cn(
        "grid flex-none place-items-center rounded-full font-semibold",
        big ? "size-16 text-2xl" : "size-9 text-sm",
        tint,
      )}
      aria-hidden
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

// A small label above a part of a card.
export function Label({ children }: Readonly<{ children: ReactNode }>) {
  return <span className="text-xs text-label">{children}</span>;
}
