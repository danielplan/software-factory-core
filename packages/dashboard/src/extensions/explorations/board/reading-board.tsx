// Prototype: what fills the empty board while the explorer reads, before it
// draws anything. Variant A tells the usual time and counts the seconds;
// variant B lists what the explorer is doing right now.

import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { KoboldHead } from "@/components/kobold-face";
import { KOBOLDS } from "@/lib/kobolds";
import { stateAsked, variantAsked } from "@/lib/prototype-switch";
import { cn } from "@/lib/utils";

// How long reading usually takes, in seconds.
const USUAL = 60;

// The steps of variant B, and the second each one starts at (made up: the
// server does not say yet which step the explorer is at).
const STEPS = [
  { at: 0, doing: "Reading the page", done: "Read the page" },
  { at: 14, doing: "Looking at the code", done: "Looked at the code" },
  { at: 42, doing: "Drawing the board", done: "Drew the board" },
] as const;

function useSeconds(): number {
  // The slow state starts the clock past the usual time.
  const [start] = useState(() => (stateAsked() === "slow" ? 75 : 0));
  const [seconds, setSeconds] = useState(start);
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((now) => now + 1);
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);
  return seconds;
}

export function ReadingBoard({ activity }: Readonly<{ activity: string | null }>) {
  const seconds = useSeconds();
  const explorer = KOBOLDS.find((kobold) => kobold.id === "explorer");
  const color = explorer?.color ?? "#e9a23b";
  const variant = variantAsked();
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] grid place-items-center p-6">
      <div
        role="status"
        className="w-full max-w-[340px] rounded-[14px] bg-card p-5 shadow-card"
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
              className="motion-safe:animate-bob"
            />
          </span>
          <span className="grid min-w-0">
            <span className="text-[15px] font-semibold tracking-[-0.01em]">
              {explorer?.name} is reading
            </span>
            <span className="text-xs text-muted-foreground">
              Nothing is drawn until it has read.
            </span>
          </span>
        </div>
        {variant === "B" ? (
          <Steps seconds={seconds} activity={activity} color={color} />
        ) : (
          <Clock seconds={seconds} color={color} />
        )}
      </div>
    </div>
  );
}

function Clock({
  seconds,
  color,
}: Readonly<{ seconds: number; color: string }>) {
  const slow = seconds > USUAL;
  return (
    <div className="grid gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-muted-foreground">
          Usually about a minute
        </span>
        <span className="text-[22px] leading-none font-semibold tracking-[-0.015em] tabular-nums">
          {seconds} s
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-wash">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-1000 ease-linear",
            slow && "motion-safe:animate-breathe",
          )}
          style={{
            width: `${Math.min(100, (seconds / USUAL) * 100)}%`,
            background: color,
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {slow
          ? "Taking a little longer than usual. It is still reading, nothing is stuck."
          : "You can leave this open: the board fills as soon as it has read."}
      </p>
    </div>
  );
}

function Steps({
  seconds,
  activity,
  color,
}: Readonly<{ seconds: number; activity: string | null; color: string }>) {
  const now = STEPS.findLastIndex((step) => seconds >= step.at);
  return (
    <ol className="grid gap-2.5">
      {STEPS.map((step, at) => {
        const done = at < now;
        const active = at === now;
        return (
          <li key={step.doing} className="flex items-start gap-2.5 text-[13px]">
            <span
              className={cn(
                "mt-px grid size-[18px] flex-none place-items-center rounded-full",
                !done && !active && "border border-border",
              )}
              style={done ? { background: color } : undefined}
            >
              {done && (
                <Check aria-hidden className="size-3 text-white" strokeWidth={3} />
              )}
              {active && (
                <LoaderCircle
                  aria-hidden
                  className="size-4 motion-safe:animate-spin"
                  style={{ color }}
                />
              )}
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  active ? "font-medium" : "text-muted-foreground",
                  !done && !active && "text-faint",
                )}
              >
                {done ? step.done : step.doing}
                {active && "…"}
              </span>
              {active && activity && (
                <span className="block text-xs [overflow-wrap:anywhere] text-muted-foreground">
                  {activity}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
