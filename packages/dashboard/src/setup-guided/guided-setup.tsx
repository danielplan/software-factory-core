// Setting up Kobble, one step at a time: the kobold reads the project, draws
// what it understands into the map's areas (setup-coach.md), and the owner
// goes through them in order, confirming, taking off, asking, adding
// personas, and at the end has Kobble set itself up. The same coach and map
// as before; only the canvas became steps.

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useState } from "react";

import type { State } from "@/api";
import { KoboldHead } from "@/components/kobold-face";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCoachCall } from "@/setup-coach/coach-call";
import { CoachStart } from "@/setup-coach/coach-chat";

import { KoboldSays } from "./kobold-says";
import { SetupStep } from "./setup-step";
import { StepCards } from "./step-cards";
import { cardsIn, type Step, stepsOf } from "./steps";

type SetupState = Extract<State, { mode: "setup" }>;

export function GuidedSetup({ state }: Readonly<{ state: SetupState }>) {
  const { coach } = state;
  const steps = stepsOf(coach.draft);
  const [at, setAt] = useState(0);
  const [asked, setAsked] = useState<string[]>([]);
  const call = useCoachCall(coach, asked, () => {
    setAsked([]);
  });
  const last = steps.length - 1;
  // Building: the last step, where it shows how far it is.
  const shown = coach.phase === "build" ? last : Math.min(at, last);
  const step = steps[shown] ?? steps[0];
  if (!step) return null;
  const go = (n: number) => {
    setAsked([]);
    setAt(Math.max(0, Math.min(last, n)));
  };
  return (
    <div className="flex h-dvh min-h-0 bg-ground max-md:flex-col">
      <Rail steps={steps} at={shown} started={coach.started} onGo={go} />
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-auto">
          <div className="mx-auto grid max-w-[880px] gap-6 px-7 py-9">
            <Content
              state={state}
              step={step}
              n={shown}
              of={last}
              call={call}
              asked={asked}
              onAsk={(id) => {
                setAsked((now) =>
                  now.includes(id) ? now.filter((a) => a !== id) : [...now, id],
                );
              }}
              onSent={() => {
                setAsked([]);
              }}
            />
          </div>
        </div>
        {coach.started && step.id !== "setup" && <Bar at={shown} onGo={go} />}
      </main>
    </div>
  );
}

function Content({
  state,
  step,
  n,
  of,
  call,
  asked,
  onAsk,
  onSent,
}: Readonly<{
  state: SetupState;
  step: Step;
  n: number;
  of: number;
  call: ReturnType<typeof useCoachCall>;
  asked: string[];
  onAsk: (id: string) => void;
  onSent: () => void;
}>) {
  const { coach } = state;
  if (!coach.started)
    return (
      <div className="grid justify-items-center gap-4 pt-16 text-center">
        <KoboldHead size={88} />
        <h1 className="text-3xl font-bold tracking-tight">
          Hi, I’m your kobold.
        </h1>
        <p className="max-w-[56ch] text-muted-foreground">
          Tell me what you want to build, and I’ll set up Kobble with you.
        </p>
        <CoachStart coach={coach} call={call} />
      </div>
    );
  const says = (
    <KoboldSays
      coach={coach}
      call={call}
      step={step}
      asked={asked}
      onSent={onSent}
    />
  );
  if (step.id === "setup")
    return <SetupStep state={state} says={says} call={call} />;
  return (
    <>
      <header className="grid gap-1.5">
        {n > 0 && (
          <span className="text-[12.5px] text-muted-foreground">
            Step {n} of {of}
          </span>
        )}
        <h1 className="text-[30px] leading-tight font-bold tracking-tight">
          {n === 0 ? "Hi, I’m your kobold." : step.name}
        </h1>
        <p className="text-muted-foreground">{LEADS[step.id] ?? ""}</p>
      </header>
      {says}
      {step.area && (
        <StepCards
          cards={cardsIn(coach.draft, step.area)}
          area={step.area}
          asked={asked}
          onAsk={onAsk}
        />
      )}
    </>
  );
}

const LEADS: Record<string, string> = {
  hello:
    "I read your project so you only have to confirm what I found. Go through the steps; you can always come back.",
  product: "What your product is, its parts, and how far it has come.",
  people:
    "The people you build for. Kobble tests ideas against them, so they should be real. Add your own.",
  team: "Who works on it, and where the work is tracked. Everyone can do everything.",
  how: "The parts of Kobble that fit how you work. You can change them later in Workshop.",
  bring: "What you have already, and what happens to it.",
  start:
    "Where to start exploring once Kobble is set up. Take off what doesn’t matter.",
};

function Rail({
  steps,
  at,
  started,
  onGo,
}: Readonly<{
  steps: Step[];
  at: number;
  started: boolean;
  onGo: (n: number) => void;
}>) {
  return (
    <nav
      aria-label="Setup steps"
      className="flex w-[280px] flex-none flex-col gap-1 border-r border-border bg-card px-4 py-5 max-md:w-auto max-md:flex-row max-md:overflow-x-auto max-md:border-r-0 max-md:border-b"
    >
      <div className="flex items-center gap-2.5 px-1.5 pb-5 font-['Bricolage_Grotesque',sans-serif] text-[22px] font-bold tracking-tight max-md:pb-0">
        <KoboldHead size={32} />
        kobble
      </div>
      <ol className="grid gap-0.5 max-md:flex">
        {steps.map((step, n) => (
          <li key={step.id}>
            <button
              type="button"
              disabled={!started}
              aria-current={n === at ? "step" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left font-medium text-muted-foreground hover:bg-muted disabled:cursor-default",
                n === at && "bg-wash text-wash-foreground",
                n < at && "text-foreground-2",
              )}
              onClick={() => {
                onGo(n);
              }}
            >
              <span
                className={cn(
                  "grid size-[22px] flex-none place-items-center rounded-full text-[11px] font-semibold shadow-[inset_0_0_0_1.5px_var(--border)]",
                  n === at &&
                    "text-primary shadow-[inset_0_0_0_1.5px_var(--primary)]",
                  n < at && "bg-[#12a594] text-white shadow-none",
                )}
              >
                {n < at ? <Check className="size-3" aria-hidden /> : n}
              </span>
              <span className="grid">
                {step.name}
                <small className="text-xs font-normal text-muted-foreground max-md:hidden">
                  {step.hint}
                </small>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-auto px-1.5 pt-4 text-xs text-muted-foreground max-md:hidden">
        You can change all of it later in Settings, Workshop and Personas.
      </p>
    </nav>
  );
}

function Bar({
  at,
  onGo,
}: Readonly<{ at: number; onGo: (n: number) => void }>) {
  return (
    <div className="border-t border-border bg-card px-7 py-3.5">
      <div className="mx-auto flex max-w-[880px] items-center gap-3">
        {at > 0 && (
          <Button
            variant="ring"
            size="pill"
            onClick={() => {
              onGo(at - 1);
            }}
          >
            <ArrowLeft className="size-4" aria-hidden /> Back
          </Button>
        )}
        <span className="flex-1" />
        <Button
          size="pill"
          onClick={() => {
            onGo(at + 1);
          }}
        >
          {at === 0 ? "Let’s go" : "Continue"}
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
