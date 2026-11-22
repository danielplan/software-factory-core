// The Marketplace's second tab: only what can be connected today. Your
// code (GitHub, in use) and Your tasks (a GitHub board or Jira Cloud: pick
// one). The one not in use says how to get there: Connect while nothing is
// connected, otherwise Switch to it, with its question first.

import type { ReactNode } from "react";

import type { AddOnView } from "@/api/client";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/use-t";
import {
  boardAction,
  boardThing,
  codeThing,
  type Thing,
} from "@/lib/market-view";

import { Card } from "./card";

export function ConnectionsTab({
  addOns,
  boards,
  tracker,
  codeBy,
  onOpen,
  onSwitch,
}: Readonly<{
  addOns: AddOnView[];
  // The boards work can be tracked on.
  boards: AddOnView[];
  // The one in use ("none" while none is connected).
  tracker: string;
  // The extension that fills Your code, from the factory's slots.
  codeBy: string | null | undefined;
  onOpen: (key: string) => void;
  onSwitch: (from: AddOnView, to: AddOnView) => void;
}>) {
  const t = useT().market;
  const code = codeThing(t, addOns, codeBy ?? undefined);
  return (
    <div className="grid gap-8">
      <Group title={t.connections.code.title} about={t.connections.code.about}>
        <Card
          thing={code}
          action={null}
          onOpen={() => {
            onOpen(code.key);
          }}
        />
      </Group>
      <Group
        title={t.connections.tasks.title}
        about={t.connections.tasks.about}
      >
        {boards.map((board) => {
          const thing: Thing = boardThing(t, addOns, board, tracker);
          const action = boardAction(boards, board, tracker);
          return (
            <Card
              key={thing.key}
              thing={thing}
              onOpen={() => {
                onOpen(thing.key);
              }}
              action={
                <BoardButton
                  action={action}
                  board={board}
                  onSwitch={onSwitch}
                />
              }
            />
          );
        })}
      </Group>
    </div>
  );
}

// What to press on a board; nothing on the one in use.
export function BoardButton({
  action,
  board,
  onSwitch,
}: Readonly<{
  action: ReturnType<typeof boardAction>;
  board: AddOnView;
  onSwitch: (from: AddOnView, to: AddOnView) => void;
}>) {
  const t = useT().market;
  if (action.kind === "none") return null;
  if (action.kind === "connect")
    return (
      <Button asChild size="pill">
        <a href="#settings/connections">{t.connections.connect}</a>
      </Button>
    );
  const short = (
    t.connections.switchShort as Record<string, string | undefined>
  )[board.id];
  return (
    <Button
      variant="ring"
      size="pill"
      onClick={() => {
        onSwitch(action.from, action.to);
      }}
    >
      {t.connections.switchTo(short ?? board.name)}
    </Button>
  );
}

// A group of services that do one job, with its title and line.
function Group({
  title,
  about,
  children,
}: Readonly<{ title: string; about: string; children: ReactNode }>) {
  return (
    <section aria-label={title} className="grid gap-3">
      <div className="grid gap-0.5 px-1">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <p className="text-[13px] text-muted-foreground">{about}</p>
      </div>
      <div className="m-stagger grid items-stretch gap-4 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}
