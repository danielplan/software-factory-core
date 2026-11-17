// Small pieces the Understand pages share: a story's pill, the kobold's
// mark, a persona's face (their little monster), and a small label.

import { type ReactNode, useId } from "react";

import {
  BLUE_HAT,
  KoboldBody,
  KoboldFace,
  KoboldHat,
  KoboldPaints,
} from "@/components/kobold-parts";
import { PersonaMonster } from "@/components/persona-monster";
import { tintIndexOf } from "@/lib/monster";
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
        "inline-flex h-6 items-center rounded-full px-2.5 text-tag whitespace-nowrap",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

// The kobold itself, Kobble's mascot, where it speaks or works: drawn
// sharp at any size from its own parts (no ears; its family has them),
// with its blue wizard hat. Decoration beside the words it goes with.
export function KoboldMark({ className }: Readonly<{ className?: string }>) {
  const id = useId().replaceAll(":", "");
  return (
    <svg
      viewBox="20 14 160 168"
      aria-hidden
      className={cn("size-7 flex-none", className)}
    >
      <KoboldPaints id={id} hat={BLUE_HAT} />
      <KoboldBody id={id} />
      <KoboldFace />
      <KoboldHat id={id} />
    </svg>
  );
}

const SIZES = { small: 24, normal: 36, big: 64 };

function sizeOf(big: boolean, small: boolean): keyof typeof SIZES {
  if (big) return "big";
  return small ? "small" : "normal";
}

// A persona's face: their little monster (components/persona-monster.tsx),
// chosen from their name, in the colour family of their tint. Beside their
// name, so only decoration.
export function Initial({
  name,
  tint,
  big = false,
  small = false,
}: Readonly<{ name: string; tint: string; big?: boolean; small?: boolean }>) {
  return (
    <PersonaMonster
      seed={name}
      tint={tintIndexOf(tint)}
      size={SIZES[sizeOf(big, small)]}
    />
  );
}

// A small label above a part of a card.
export function Label({ children }: Readonly<{ children: ReactNode }>) {
  return <span className="text-tag text-muted-foreground">{children}</span>;
}
