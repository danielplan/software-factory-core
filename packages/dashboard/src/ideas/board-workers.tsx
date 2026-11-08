import { Hammer, Loader2, MessagesSquare } from "lucide-react";
import type { ReactNode } from "react";

import type { WorkView } from "@/api";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// Who works the board on this computer: the coach and the builder, each a
// switch with what it does and what it is doing now.
export function BoardWorkers({
  work,
  onSwitch,
}: Readonly<{
  work: WorkView;
  onSwitch: (who: "coach" | "builder", on: boolean) => void;
}>) {
  const { coach, builder } = work;
  const ready = work.cards.filter((card) => card.stage === "todo").length;
  const planning = work.cards.filter(
    (card) => card.stage === "planning",
  ).length;
  return (
    <Card className="grid gap-0 divide-y p-0 shadow-soft sm:grid-cols-2 sm:divide-x sm:divide-y-0">
      <Worker
        id="coach"
        icon={<MessagesSquare className="size-4" aria-hidden />}
        name="Coach"
        does="Plans the cards in Planning with you, in their comments."
        on={coach.on}
        now={
          coach.working === null
            ? idle(coach.on, planning, "in Planning")
            : `Answering on #${String(coach.working)}`
        }
        busy={coach.working !== null}
        onChange={(on) => {
          onSwitch("coach", on);
        }}
      />
      <Worker
        id="builder"
        icon={<Hammer className="size-4" aria-hidden />}
        name="Builder"
        does="Builds the cards in To do, one at a time, and opens a pull request for each. It never merges."
        on={builder.on}
        now={builderNow(work, ready)}
        busy={builder.working !== null}
        onChange={(on) => {
          onSwitch("builder", on);
        }}
      />
    </Card>
  );
}

function Worker({
  id,
  icon,
  name,
  does,
  on,
  now,
  busy,
  onChange,
}: Readonly<{
  id: string;
  icon: ReactNode;
  name: string;
  does: string;
  on: boolean;
  now: string;
  busy: boolean;
  onChange: (on: boolean) => void;
}>) {
  const label = `switch-${id}`;
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
          on
            ? "bg-[var(--tint)]/12 text-[var(--tint)]"
            : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <div className="grid min-w-0 flex-1 gap-0.5">
        <label
          htmlFor={label}
          className="flex cursor-pointer items-center gap-2 text-sm font-semibold"
        >
          {name}
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
              on
                ? "bg-[var(--tint)]/12 text-[var(--tint)]"
                : "bg-muted text-muted-foreground",
            )}
          >
            {on ? "On" : "Off"}
          </span>
        </label>
        <p className="text-[13px] text-muted-foreground">{does}</p>
        <p
          className="flex min-w-0 items-center gap-1.5 text-[13px]"
          title={now}
        >
          {busy && (
            <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden />
          )}
          <span className="truncate">{now}</span>
        </p>
      </div>
      <Switch
        id={label}
        className="mt-1"
        checked={on}
        onCheckedChange={onChange}
        aria-label={`${name} ${on ? "on" : "off"}`}
      />
    </div>
  );
}

// What the builder is doing: its card and its last step, or idle.
function builderNow(work: WorkView, ready: number): string {
  const { working, activity, on } = work.builder;
  if (!working) return idle(on, ready, "in To do");
  const card = `${capital(working.what)} #${String(working.number)}`;
  return activity ? `${card} · ${activity}` : card;
}

// What an idle worker says: the cards waiting for it (its badge says
// whether it is on).
function idle(on: boolean, count: number, where: string): string {
  if (count === 0) return `No cards ${where}`;
  const cards = `${String(count)} ${count === 1 ? "card" : "cards"} ${where}`;
  return on ? `Starting on the next of ${cards}` : `${cards}, waiting`;
}

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
