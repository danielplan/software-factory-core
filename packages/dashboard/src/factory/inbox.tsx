// Prototype (variant B): one inbox for everything new. Requests typed by
// the team, errors from the live app and GitHub issues arrive here as
// signals, each marked with where it came from. The small ones can go
// straight to To do; the bigger ones are explored first.

import { Bug, CircleDot, Inbox as InboxIcon, SquarePlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CARD } from "@/signals/bits";

import { cameWords } from "./board-card";
import type { Arrival, Came } from "./made-up";

const SOURCE: Record<Came, { Icon: typeof Bug; tone: string }> = {
  request: { Icon: SquarePlus, tone: "bg-source-app/10 text-source-app" },
  error: { Icon: Bug, tone: "bg-type-bug/10 text-type-bug" },
  issue: { Icon: CircleDot, tone: "bg-source-usage/10 text-source-usage" },
};

export function Inbox({
  arrivals,
  onAdd,
  onToDo,
  onExplore,
  onDismiss,
}: Readonly<{
  arrivals: Arrival[];
  onAdd: (title: string) => void;
  onToDo: (arrival: Arrival) => void;
  onExplore: (arrival: Arrival) => void;
  onDismiss: (arrival: Arrival) => void;
}>) {
  const [typed, type] = useState("");
  return (
    <section aria-label="Inbox" className={cn(CARD, "mb-3")}>
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border-soft px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold">
          <InboxIcon aria-hidden strokeWidth={2} className="size-4 text-blue" />
          Inbox
          <span className="grid h-5 min-w-5 place-items-center rounded-md bg-blue/10 px-1.5 text-[11px] font-semibold text-blue">
            {arrivals.length}
          </span>
        </h2>
        <p className="text-xs text-muted-foreground">
          Requests, errors from the live app and GitHub issues all land here
        </p>
        <form
          className="ml-auto flex w-full max-w-[380px] gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!typed.trim()) return;
            onAdd(typed.trim());
            type("");
          }}
        >
          <Input
            aria-label="A request"
            placeholder="Drop a request…"
            value={typed}
            onChange={(event) => {
              type(event.target.value);
            }}
          />
          <Button type="submit" size="pill" disabled={!typed.trim()}>
            Add
          </Button>
        </form>
      </header>
      {arrivals.length === 0 && (
        <p className="px-5 py-6 text-center text-[13px] text-muted-foreground">
          Nothing new. Whatever arrives next lands here.
        </p>
      )}
      <ul className="grid">
        {arrivals.map((arrival) => (
          <Row
            key={arrival.id}
            arrival={arrival}
            onToDo={onToDo}
            onExplore={onExplore}
            onDismiss={onDismiss}
          />
        ))}
      </ul>
    </section>
  );
}

function Row({
  arrival,
  onToDo,
  onExplore,
  onDismiss,
}: Readonly<{
  arrival: Arrival;
  onToDo: (arrival: Arrival) => void;
  onExplore: (arrival: Arrival) => void;
  onDismiss: (arrival: Arrival) => void;
}>) {
  const { Icon, tone } = SOURCE[arrival.came];
  return (
    <li className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-t border-border-soft px-5 py-3 first:border-t-0 motion-safe:animate-rise">
      <span
        className={cn("grid size-[30px] flex-none place-items-center rounded-full", tone)}
      >
        <Icon aria-hidden strokeWidth={2} className="size-[15px]" />
      </span>
      <span className="grid min-w-0 flex-1">
        <span className="truncate text-[13px] font-medium">{arrival.title}</span>
        <span className="text-xs text-muted-foreground">
          {cameWords(arrival)} · {arrival.from}
        </span>
      </span>
      <span
        title="How big the kobold thinks it is"
        className={cn(
          "inline-flex h-[22px] items-center rounded-full px-2.5 text-[11.5px] font-medium",
          arrival.small
            ? "bg-[#e6f6f3] text-[#0d7a6d]"
            : "bg-warning/15 text-foreground-2",
        )}
      >
        {arrival.small ? "Small" : "Needs exploring"}
      </span>
      <span className="flex gap-2">
        {arrival.small ? (
          <Button size="pill-sm" onClick={() => { onToDo(arrival); }}>
            Straight to To do
          </Button>
        ) : null}
        <Button
          size="pill-sm"
          variant={arrival.small ? "ring" : "default"}
          onClick={() => { onExplore(arrival); }}
        >
          Explore
        </Button>
        <Button size="pill-sm" variant="ghost" onClick={() => { onDismiss(arrival); }}>
          Dismiss
        </Button>
      </span>
    </li>
  );
}
