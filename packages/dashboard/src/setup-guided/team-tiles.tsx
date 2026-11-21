// "How Kobble works": the team's own choices as tiles, as in the design:
// how many cards each computer builds at once, and the usage log. Saved
// for the whole team as soon as they change.

import { Layers, LineChart } from "lucide-react";
import { useState } from "react";

import { messageOf, post } from "@/api";
import { Switch } from "@/components/ui/switch";
import { type Read, useRead } from "@/lib/use-read";
import { cn } from "@/lib/utils";

import type { TeamChoices } from "../../../server/src/coach/setup-team.ts";
import { useT } from "@/i18n/use-t";

export function TeamTiles() {
  const t = useT();
  const { data } = useRead("/api/setup/team") as Read<TeamChoices>;
  const [shown, show] = useState<TeamChoices | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const now = shown ?? data;
  if (!now) return null;
  const save = (change: Partial<TeamChoices>) => {
    show({ ...now, ...change });
    setProblem(null);
    post<TeamChoices>("/api/setup/team", change).then(
      show,
      (error: unknown) => {
        setProblem(messageOf(error));
      },
    );
  };
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
        <Tile
          icon={<Layers className="size-[17px]" aria-hidden />}
          title={t.setup.team.cards}
          text={t.setup.team.cardsText}
        >
          <div className="flex w-fit gap-0.5 rounded-[14px] bg-[#eceef2] p-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${String(n)} at once`}
                className={cn(
                  "h-[34px] w-9 rounded-[10px] text-[13px] font-medium text-muted-foreground",
                  now.cards === n && "bg-card text-foreground shadow-sm",
                )}
                onClick={() => {
                  save({ cards: n });
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </Tile>
        <Tile
          icon={<LineChart className="size-[17px]" aria-hidden />}
          title={t.setup.team.usage}
          text={t.setup.team.usageText}
          end={
            <Switch
              checked={now.usage}
              aria-label={t.setup.team.usage}
              onCheckedChange={(on) => {
                save({ usage: on });
              }}
            />
          }
        />
      </div>
      {problem && <p className="text-[13px] text-destructive">{problem}</p>}
    </div>
  );
}

function Tile({
  icon,
  title,
  text,
  end,
  children,
}: Readonly<{
  icon: React.ReactNode;
  title: string;
  text: string;
  end?: React.ReactNode;
  children?: React.ReactNode;
}>) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl bg-card px-4 py-3.5 shadow-card">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 flex-none place-items-center rounded-[10px] bg-wash text-wash-foreground">
          {icon}
        </span>
        <span className="flex-1 font-semibold">{title}</span>
        {end}
      </div>
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        {text}
      </p>
      {children}
    </div>
  );
}
