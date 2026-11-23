// The Marketplace's second tab: only what can be connected today. Your
// code (GitHub, in use) and Your tasks (a GitHub board or Jira Cloud: pick
// one). The one not in use says how to get there: Connect while nothing is
// connected, otherwise Switch to it, with its question first.

import { Link } from "react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { AddOnView } from "@/api/client";
import { Button } from "@/components/ui/button";

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
  const t = useTranslation().t;
  const code = codeThing(t, addOns, codeBy ?? undefined);
  return (
    <div className="grid gap-8">
      <Group
        title={t("market.connections.code.title")}
        about={t("market.connections.code.about")}
      >
        <Card
          thing={code}
          action={null}
          onOpen={() => {
            onOpen(code.key);
          }}
        />
      </Group>
      <Group
        title={t("market.connections.tasks.title")}
        about={t("market.connections.tasks.about")}
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
  const t = useTranslation().t;
  if (action.kind === "none") return null;
  if (action.kind === "connect")
    return (
      <Button asChild size="pill">
        <Link to="/settings/connections">
          {t("market.connections.connect")}
        </Link>
      </Button>
    );
  const short = (
    t("market.connections.switchShort", { returnObjects: true }) as Record<
      string,
      string | undefined
    >
  )[board.id];
  return (
    <Button
      variant="ring"
      size="pill"
      onClick={() => {
        onSwitch(action.from, action.to);
      }}
    >
      {t("market.connections.switchTo", { name: short ?? board.name })}
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
