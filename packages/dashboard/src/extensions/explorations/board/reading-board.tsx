// Prototype: what fills the empty board while the explorer reads, before it
// draws anything: the steps it is at, one after the other. When it really
// stops, the card shows the step it stopped at, why, and a way to try again.
// The variants change only that way out (B, the base: a ring button under
// the reason; A: a link in the reason; C: a main button; D: a button on the
// stopped step). The card says nothing about time.

import { Check, LoaderCircle, RotateCw, X } from "lucide-react";
import { useEffect, useState } from "react";

import { KoboldHead } from "@/components/kobold-face";
import { Button } from "@/components/ui/button";
import { KOBOLDS } from "@/lib/kobolds";
import { canStop, stop, tryAgain } from "@/lib/prototype-run";
import { variantAsked } from "@/lib/prototype-switch";
import { cn } from "@/lib/utils";

// Where the made-up explorer stops, in the state "stopped": in its second
// step.
const STOP_AT = 20;

// The steps, and the second each one starts at (made up: the server does not
// say yet which step the explorer is at).
const STEPS = [
  { at: 0, doing: "Reading the page", done: "Read the page" },
  { at: 14, doing: "Looking at the code", done: "Looked at the code" },
  { at: 42, doing: "Drawing the board", done: "Drew the board" },
] as const;

// The seconds since the explorer started this try (they only place it in
// its steps; the card never shows them). They stand still while it is
// stopped, and it opens at the step it stops in.
function useSeconds(stopped: boolean): [number, () => void] {
  const [seconds, setSeconds] = useState(stopped ? STOP_AT : 0);
  useEffect(() => {
    if (stopped) return;
    const timer = setInterval(() => {
      setSeconds((now) => now + 1);
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [stopped]);
  return [
    seconds,
    () => {
      setSeconds(0);
    },
  ];
}

// `problem` is why the explorer stopped, when it did.
export function ReadingBoard({
  activity,
  problem,
}: Readonly<{ activity: string | null; problem: string | null }>) {
  const stopped = problem !== null;
  const [seconds, startOver] = useSeconds(stopped);
  // The made-up explorer stops in its second step (only in the state
  // "stopped").
  useEffect(() => {
    if (canStop() && !stopped && seconds >= STOP_AT) stop();
  }, [stopped, seconds]);
  const explorer = KOBOLDS.find((kobold) => kobold.id === "explorer");
  const color = explorer?.color ?? "#e9a23b";
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] grid place-items-center p-6">
      <div
        role="status"
        className="pointer-events-auto w-full max-w-[340px] rounded-[14px] bg-card p-5 shadow-card"
      >
        <div className="mb-4 flex items-center gap-3">
          <span
            className="grid size-11 flex-none place-items-center rounded-[13px]"
            style={{ background: `${color}24` }}
          >
            <KoboldHead
              size={34}
              hat={explorer?.hat}
              color={color}
              className={stopped ? undefined : "motion-safe:animate-bob"}
            />
          </span>
          <span className="grid min-w-0">
            <span className="text-[15px] font-semibold tracking-[-0.01em]">
              {explorer?.name} {stopped ? "stopped" : "is reading"}
            </span>
            <span className="text-xs text-muted-foreground">
              {stopped
                ? "Nothing was drawn."
                : "Nothing is drawn until it has read."}
            </span>
          </span>
        </div>
        <Steps
          seconds={seconds}
          activity={activity}
          color={color}
          problem={problem}
          name={explorer?.name ?? "the explorer"}
          onTryAgain={() => {
            startOver();
            tryAgain();
          }}
        />
      </div>
    </div>
  );
}

function Steps({
  seconds,
  activity,
  color,
  problem,
  name,
  onTryAgain,
}: Readonly<{
  seconds: number;
  activity: string | null;
  color: string;
  problem: string | null;
  name: string;
  onTryAgain: () => void;
}>) {
  const variant = variantAsked();
  const now = STEPS.findLastIndex((step) => seconds >= step.at);
  const retry = (
    <>
      <RotateCw aria-hidden />
      Try again
    </>
  );
  return (
    <div className="grid gap-3.5">
      <ol className="grid gap-2.5">
        {STEPS.map((step, at) => {
          const done = at < now;
          const active = at === now;
          const stoppedHere = active && problem !== null;
          return (
            <li
              key={step.doing}
              className="flex items-start gap-2.5 text-[13px]"
            >
              <span
                className={cn(
                  "mt-px grid size-[18px] flex-none place-items-center rounded-full",
                  !done && !active && "border border-border",
                  stoppedHere && "bg-destructive",
                )}
                style={done ? { background: color } : undefined}
              >
                {done && (
                  <Check
                    aria-hidden
                    className="size-3 text-white"
                    strokeWidth={3}
                  />
                )}
                {stoppedHere && (
                  <X
                    aria-hidden
                    className="size-3 text-white"
                    strokeWidth={3}
                  />
                )}
                {active && !stoppedHere && (
                  <LoaderCircle
                    aria-hidden
                    className="size-4 motion-safe:animate-spin"
                    style={{ color }}
                  />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    active ? "font-medium" : "text-muted-foreground",
                    !done && !active && "text-faint",
                    stoppedHere && "text-destructive",
                  )}
                >
                  {done
                    ? step.done
                    : stoppedHere
                      ? `${step.doing}: stopped`
                      : step.doing}
                  {active && !stoppedHere && "…"}
                </span>
                {active && !stoppedHere && activity && (
                  <span className="block text-xs [overflow-wrap:anywhere] text-muted-foreground">
                    {activity}
                  </span>
                )}
                {/* D: the reason in grey, under the stopped step. */}
                {stoppedHere && variant === "D" && (
                  <span
                    role="alert"
                    className="mt-0.5 block text-xs [overflow-wrap:anywhere] text-muted-foreground"
                  >
                    {problem}
                  </span>
                )}
              </span>
              {/* D: a small outlined button at the right end of the step. */}
              {stoppedHere && variant === "D" && (
                <Button
                  variant="ring"
                  size="pill-sm"
                  className="-mt-1 flex-none"
                  onClick={onTryAgain}
                >
                  {retry}
                </Button>
              )}
            </li>
          );
        })}
      </ol>
      {problem !== null && variant !== "D" && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-xs [overflow-wrap:anywhere] text-destructive"
        >
          {problem}
          {/* A: the way out is a link at the end of the reason. */}
          {variant === "A" && (
            <>
              .{" "}
              <button
                type="button"
                className="font-medium underline underline-offset-2 hover:no-underline"
                onClick={onTryAgain}
              >
                Try again
              </button>
            </>
          )}
        </p>
      )}
      {/* C: the main button, with what it does, the card's width. */}
      {problem !== null && variant === "C" && (
        <Button size="pill" className="w-full" onClick={onTryAgain}>
          <RotateCw aria-hidden />
          Ask {name} again
        </Button>
      )}
      {/* B, the base: a ring button under the reason. */}
      {problem !== null && variant === "B" && (
        <Button variant="ring" size="pill-sm" onClick={onTryAgain}>
          {retry}
        </Button>
      )}
    </div>
  );
}
