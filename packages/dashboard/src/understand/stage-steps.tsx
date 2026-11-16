// The stage a problem is at, as a small pipeline: Heard (or Assumed) →
// Trying ideas → Building → In the app → Solved (or Didn't work). Steps
// done are filled calmly, the current one strong in its colour, the ones
// to come empty. Compact on a card (the dots and the current stage's
// name), whole beside a story (every step named, the current one marked).

import { cn } from "@/lib/utils";

import { type Stage, stepsOf } from "./view";

const NOW: Record<Stage, string> = {
  assumed: "bg-open-foreground",
  heard: "bg-open-foreground",
  trying: "bg-explore",
  building: "bg-build",
  inApp: "bg-build",
  solved: "bg-success",
  didntWork: "bg-destructive",
};

function Dot({
  state,
  stage,
}: Readonly<{ state: "done" | "now" | "later"; stage: Stage }>) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-2 flex-none rounded-full",
        state === "done" && "bg-success/45",
        state === "now" && cn("size-2.5", NOW[stage]),
        state === "later" && "ring-1 ring-faint ring-inset",
      )}
    />
  );
}

function stateAt(at: number, now: number): "done" | "now" | "later" {
  if (at < now) return "done";
  return at === now ? "now" : "later";
}

// The line between two steps: done up to the current one.
function line(done: boolean, shown = true): string {
  if (!shown) return "bg-transparent";
  return done ? "bg-success/45" : "bg-faint/60";
}

export function StageSteps({
  stage,
  whole = false,
}: Readonly<{ stage: Stage; whole?: boolean }>) {
  const { names, at, name } = stepsOf(stage);
  const label = `Stage: ${name} (${String(at + 1)} of ${String(names.length)})`;
  if (!whole)
    return (
      <span className="flex items-center gap-2" role="img" aria-label={label}>
        <span className="flex items-center gap-[3px]">
          {names.map((one, index) => (
            <span key={one} className="flex items-center gap-[3px]">
              {index > 0 && (
                <span
                  aria-hidden
                  className={cn("h-px w-1.5", line(index <= at))}
                />
              )}
              <Dot state={stateAt(index, at)} stage={stage} />
            </span>
          ))}
        </span>
        <span
          className={cn(
            "text-xs font-medium text-foreground-2",
            stage === "didntWork" && "text-open-foreground",
          )}
        >
          {name}
        </span>
      </span>
    );
  return (
    <ol aria-label={label} className="grid grid-cols-5 gap-1">
      {names.map((one, index) => (
        <li
          key={one}
          aria-current={index === at ? "step" : undefined}
          className="grid content-start justify-items-center gap-1.5 text-center"
        >
          <span className="flex w-full items-center">
            <span className={cn("h-px flex-1", line(index <= at, index > 0))} />
            <Dot state={stateAt(index, at)} stage={stage} />
            <span
              className={cn(
                "h-px flex-1",
                line(index < at, index < names.length - 1),
              )}
            />
          </span>
          <span
            className={cn(
              "text-[11px] leading-tight text-label",
              index === at && "font-semibold text-foreground",
              index === at && stage === "didntWork" && "text-open-foreground",
            )}
          >
            {one}
          </span>
        </li>
      ))}
    </ol>
  );
}
