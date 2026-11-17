// A stage as a small pipeline (lib/stages.ts), the same in Understand,
// Explore and Build. Steps done are filled in a calm teal, the current one
// larger in its colour, the steps to come empty. Compact on a card (the
// current stage only: its dot and its name); whole on a page (every step
// named, the current one marked).

import type { StepTone, Steps } from "@/lib/stages";
import { t } from "@/i18n/i18n";
import { cn } from "@/lib/utils";

const NOW: Record<StepTone, string> = {
  neutral: "bg-foreground-2",
  amber: "bg-explore",
  blue: "bg-build",
  green: "bg-success",
  pink: "bg-fresh",
};

type State = "done" | "now" | "later";

function stateAt(at: number, now: number): State {
  if (at < now) return "done";
  return at === now ? "now" : "later";
}

// The line between two steps: done up to the current one.
function line(done: boolean, shown = true): string {
  if (!shown) return "bg-transparent";
  return done ? "bg-success/45" : "bg-faint/60";
}

function Dot({ state, tone }: Readonly<{ state: State; tone: StepTone }>) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-2 flex-none rounded-full",
        state === "done" && "bg-success/45",
        state === "now" && cn("size-2.5", NOW[tone]),
        state === "later" && "ring-1 ring-faint ring-inset",
      )}
    />
  );
}

export function StageSteps({
  steps,
  whole = false,
}: Readonly<{ steps: Steps; whole?: boolean }>) {
  const { names, at, name, tone } = steps;
  const label = t("common:stage.label", {
    name,
    at: at + 1,
    total: names.length,
  });
  // On a card: only where it is now, a dot in its colour and its name; the
  // whole pipeline is on the page.
  if (!whole)
    return (
      <span className="flex items-center gap-1.5" role="img" aria-label={label}>
        <Dot state="now" tone={tone} />
        <span
          className={cn(
            "text-tag font-medium text-foreground-2",
            tone === "pink" && "text-open-foreground",
          )}
        >
          {name}
        </span>
      </span>
    );
  return (
    <ol
      aria-label={label}
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${String(names.length)}, 1fr)` }}
    >
      {names.map((one, index) => (
        <li
          key={one}
          aria-current={index === at ? "step" : undefined}
          className="grid content-start justify-items-center gap-1.5 text-center"
        >
          <span className="flex w-full items-center">
            <span className={cn("h-px flex-1", line(index <= at, index > 0))} />
            <Dot state={stateAt(index, at)} tone={tone} />
            <span
              className={cn(
                "h-px flex-1",
                line(index < at, index < names.length - 1),
              )}
            />
          </span>
          <span
            className={cn(
              "text-tag text-label",
              index === at && "font-semibold text-foreground",
              index === at && tone === "pink" && "text-open-foreground",
            )}
          >
            {one}
          </span>
        </li>
      ))}
    </ol>
  );
}
