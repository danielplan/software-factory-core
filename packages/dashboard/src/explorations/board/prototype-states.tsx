// The states a prototype's variant can be shown in (empty, loading, a
// problem …), as the maker said: small chips under its variants; the one
// picked goes into the address (?state=<name>), so the app shows it. The
// first chip is the state it opens in.

import { Layers } from "lucide-react";

import { useT } from "@/i18n/use-t";
import { cn } from "@/lib/utils";

export function States({
  states,
  shown,
  onPick,
}: Readonly<{
  states: string[];
  shown: string;
  onPick: (state: string) => void;
}>) {
  const t = useT().explore.board;
  if (states.length === 0) return null;
  const chip = (name: string, label: string) => (
    <button
      key={name || "usual"}
      type="button"
      aria-pressed={shown === name}
      onClick={() => {
        onPick(name);
      }}
      className={cn(
        "inline-flex h-6 items-center rounded-full border px-2 text-[11px]",
        shown === name
          ? "border-foreground/20 bg-card font-medium text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
  return (
    <div
      role="group"
      aria-label={t.states}
      className="nodrag flex flex-wrap items-center gap-1 text-muted-foreground"
    >
      <Layers aria-hidden className="mr-0.5 size-3.5" />
      {chip("", t.usualState)}
      {states.map((name) => chip(name, name))}
    </div>
  );
}
