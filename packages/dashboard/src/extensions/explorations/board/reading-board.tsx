// What fills the empty board while the explorer reads, before it draws
// anything: the steps it goes through, ticked off as it reports them (never
// by the clock, and the card says nothing about time). When it really
// stops, the card shows the step it stopped at, why, and a way to try again.

import { Check, LoaderCircle, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { ExplorationPage } from "@/api/client";
import { KoboldHead } from "@/components/kobold-face";
import { stopWords } from "@/i18n/server-texts";
import { KOBOLDS } from "@/lib/kobolds";
import { cn } from "@/lib/utils";

import { A_HINT, A_STAGES, useDoing, VARIANT } from "../doing";
import { STEPS, type StepState, stepStates } from "./reading";

type Talk = ExplorationPage["talk"];

export function ReadingBoard({
  talk,
  onTryAgain,
}: Readonly<{ talk: Talk; onTryAgain: () => void }>) {
  const t = useTranslation().t;
  const stopped = talk.problem !== null;
  const explorer = KOBOLDS.find((kobold) => kobold.id === "explorer");
  const color = explorer?.color ?? "#e9a23b";
  const name = explorer?.name ?? "";
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
              {t(
                stopped ? "explore.reading.stopped" : "explore.reading.title",
                {
                  name,
                },
              )}
            </span>
            <span className="text-xs text-muted-foreground">
              {stopped
                ? t("explore.reading.noneDrawn")
                : VARIANT === "A"
                  ? A_HINT
                  : t("explore.reading.hint")}
            </span>
          </span>
        </div>
        <Steps talk={talk} color={color} onTryAgain={onTryAgain} />
      </div>
    </div>
  );
}

function Steps({
  talk,
  color,
  onTryAgain,
}: Readonly<{ talk: Talk; color: string; onTryAgain: () => void }>) {
  const doing = useDoing(talk);
  return (
    <div className="grid gap-3.5">
      <ol className="grid gap-2.5">
        {stepStates(talk).map((state, at) => (
          <StepRow
            key={STEPS[at]}
            step={STEPS[at] ?? "page"}
            state={state}
            activity={doing.line}
            color={color}
          />
        ))}
      </ol>
      {talk.problem !== null && (
        <Reason problem={talk.problem} onTryAgain={onTryAgain} />
      )}
    </div>
  );
}

function StepRow({
  step,
  state,
  activity,
  color,
}: Readonly<{
  step: (typeof STEPS)[number];
  state: StepState;
  activity: string | null;
  color: string;
}>) {
  const t = useTranslation().t;
  const done = state === "done";
  const working = state === "active";
  const stoppedHere = state === "stopped";
  const mine = VARIANT === "A" ? A_STAGES[STEPS.indexOf(step)] : undefined;
  const words =
    mine?.[done ? "done" : "doing"] ??
    t(`explore.reading.steps.${step}.${done ? "done" : "doing"}`);
  return (
    <li className="flex items-start gap-2.5 text-[13px]">
      <StepMark state={state} color={color} />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            working || stoppedHere ? "font-medium" : "text-muted-foreground",
            state === "waiting" && "text-faint",
            stoppedHere && "text-destructive",
          )}
        >
          {stoppedHere
            ? t("explore.reading.stoppedAt", { step: words })
            : words}
          {working && "…"}
        </span>
        {working && activity && (
          <span className="block text-xs [overflow-wrap:anywhere] text-muted-foreground">
            {activity}
          </span>
        )}
      </span>
    </li>
  );
}

// The round mark in front of a step: ticked, working, stopped or waiting.
function StepMark({
  state,
  color,
}: Readonly<{ state: StepState; color: string }>) {
  return (
    <span
      className={cn(
        "mt-px grid size-[18px] flex-none place-items-center rounded-full",
        state === "waiting" && "border border-border",
        state === "stopped" && "bg-destructive",
      )}
      style={state === "done" ? { background: color } : undefined}
    >
      {state === "done" && (
        <Check aria-hidden className="size-3 text-white" strokeWidth={3} />
      )}
      {state === "stopped" && (
        <X aria-hidden className="size-3 text-white" strokeWidth={3} />
      )}
      {state === "active" && (
        <LoaderCircle
          aria-hidden
          className="size-4 motion-safe:animate-spin"
          style={{ color }}
        />
      )}
    </span>
  );
}

// Why it stopped, with the way out at the end of the same sentence.
function Reason({
  problem,
  onTryAgain,
}: Readonly<{ problem: string; onTryAgain: () => void }>) {
  const t = useTranslation().t;
  return (
    <p
      role="alert"
      className="rounded-lg bg-destructive/10 px-3 py-2 text-xs [overflow-wrap:anywhere] text-destructive"
    >
      {stopWords(problem, t).reason}.{" "}
      <button
        type="button"
        className="font-medium underline underline-offset-2 hover:no-underline"
        onClick={onTryAgain}
      >
        {t("explore.reading.tryAgain")}
      </button>
    </p>
  );
}
