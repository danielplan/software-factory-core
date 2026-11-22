// The last step, after Kobble is set up: "Where shall we start?" The
// starting points the kobold found, one to pick; the bottom bar opens it
// with its canvas already started, or Kobble as it is.

import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";

import type { Card } from "@/api/client";
import { cn } from "@/lib/utils";

import { fromLine, textOf } from "./card-bits";
import { ICON } from "./icons";

// The picked starting point's title, shared with the bottom bar.
let picked: string | null = null;
const listeners = new Set<() => void>();
function pick(title: string | null): void {
  picked = title;
  for (const listener of listeners) listener();
}
export function pickedStart(): string | null {
  return picked;
}
function usePicked(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => picked,
  );
}

export function FirstExploration({ cards }: Readonly<{ cards: Card[] }>) {
  const t = useTranslation().t;
  const chosen = usePicked();
  return (
    <div className="grid gap-3">
      {cards.map((card) => {
        const Shown = card.icon ? ICON[card.icon] : null;
        const on = chosen === card.title;
        return (
          <button
            key={card.id}
            type="button"
            aria-pressed={on}
            className={cn(
              "flex items-start gap-3 rounded-xl bg-card p-4 text-left shadow-card hover:ring-[1.5px] hover:ring-primary",
              on && "bg-[#fbfcff] ring-2 ring-primary",
            )}
            onClick={() => {
              pick(on ? null : card.title);
            }}
          >
            <span className="grid size-8 flex-none place-items-center rounded-[10px] bg-wash text-wash-foreground">
              {Shown && <Shown className="size-[17px]" aria-hidden />}
            </span>
            <span className="grid min-w-0 flex-1 gap-1">
              <span className="text-xs text-faint">{fromLine(card, t)}</span>
              <span className="text-base font-semibold">{card.title}</span>
              <span className="text-[13px] text-muted-foreground">
                {textOf(card)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
