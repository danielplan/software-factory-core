// Setting up Kobble, one step at a time: the kobold reads the project, draws
// what it understands into the map's areas (setup-coach.md), and the owner
// goes through them in order, confirming, taking off, asking, adding
// personas, and at the end has Kobble set itself up. The same coach and map
// as before; only the canvas became steps.

import { ArrowLeft, Check } from "lucide-react";
import { useState } from "react";

import type { State } from "@/api/client";
import { KoboldHead } from "@/components/kobold-face";
import { useKoboldName } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCoachCall } from "./coach/coach-call";
import { StartChoice } from "./start-choice";

import { KoboldSays } from "./kobold-says";
import { Welcome } from "./welcome";
import { BarAction } from "./bar-action";
import { SetupStep } from "./setup-step";
import { StepCards } from "./step-cards";
import { cardsIn, setUpDone, type Step, stepsOf } from "./steps";
import { useT } from "@/i18n/use-t";
import type { Messages } from "@/i18n/messages";

type SetupState = Extract<State, { mode: "setup" }>;

// The step in the address (#step-3), so a reload stays there.
function fromHash(): number {
  const found = /^#step-(\d+)$/.exec(location.hash);
  return found ? Number(found[1]) : 0;
}

export function GuidedSetup({ state }: Readonly<{ state: SetupState }>) {
  const { coach } = state;
  const steps = stepsOf(coach.draft);
  const [at, setAt] = useState(fromHash);
  // Only the first prompt of a project without code is said (or typed).
  const call = useCoachCall(coach, [], () => undefined);
  const last = steps.length - 1;
  const setupAt = steps.findIndex((s) => s.id === "setup");
  // While Kobble is set up, its step; after that, the first exploration may
  // be picked; before, not.
  const done = setUpDone(coach);
  const building = coach.phase === "build" && !done;
  const reach = done ? last : setupAt;
  const shown = building ? setupAt : Math.min(at, reach);
  const step = steps[shown] ?? steps[0];
  if (!step) return null;
  const go = (n: number) => {
    const to = Math.max(0, Math.min(reach, n));
    setAt(to);
    history.replaceState(null, "", `#step-${String(to)}`);
  };
  return (
    <div className="flex h-dvh min-h-0 bg-ground max-md:flex-col">
      <Rail
        project={state.project}
        working={coach.working}
        steps={steps}
        at={shown}
        reach={coach.started ? reach : -1}
        onGo={go}
      />
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-auto">
          <div className="mx-auto grid max-w-[880px] gap-6 px-7 py-9">
            <Content
              state={state}
              step={step}
              n={shown}
              of={last}
              call={call}
            />
          </div>
        </div>
        {coach.started && (
          <Bar state={state} step={step} at={shown} onGo={go} />
        )}
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
}: Readonly<{
  state: SetupState;
  step: Step;
  n: number;
  of: number;
  call: ReturnType<typeof useCoachCall>;
}>) {
  const t = useT();
  const { coach } = state;
  if (!coach.started) return <StartChoice />;
  if (step.id === "hello") return <Welcome coach={coach} />;
  const shownStep = stepIn(t, step);
  const says = <KoboldSays coach={coach} step={step} />;
  const eyebrow = (
    <span className="text-[12.5px] text-muted-foreground">
      {t.setup.stepOf(n, of)}
    </span>
  );
  if (step.id === "setup")
    return <SetupStep state={state} says={says} eyebrow={eyebrow} />;
  return (
    <>
      <header className="grid gap-1.5">
        {eyebrow}
        <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.015em]">
          {step.id === "start" ? t.setup.whereStart : shownStep.name}
        </h1>
        <p className="text-muted-foreground">
          {(t.setup.leads as Record<string, string | undefined>)[step.id] ?? ""}
        </p>
      </header>
      {says}
      {step.area && (
        <StepCards
          cards={cardsIn(coach.draft, step.area)}
          stepId={step.id}
          area={step.area}
        />
      )}
    </>
  );
}

function Rail({
  project,
  working,
  steps,
  at,
  reach,
  onGo,
}: Readonly<{
  project: string;
  working: boolean;
  steps: Step[];
  at: number;
  // The last step that can be opened (none before the kobold read).
  reach: number;
  onGo: (n: number) => void;
}>) {
  const t = useT();
  return (
    <nav
      aria-label={t.setup.rail.label}
      className="flex w-[280px] flex-none flex-col gap-1 border-r border-border bg-card px-4 py-5 max-md:w-auto max-md:flex-row max-md:overflow-x-auto max-md:border-r-0 max-md:border-b"
    >
      <div className="flex items-center gap-2.5 px-1.5 pb-5 font-wordmark text-[15px] font-semibold tracking-[-0.01em] max-md:pb-0">
        <KoboldHead size={32} />
        kobble
      </div>
      <p className="px-1.5 pb-4 text-[12.5px] text-muted-foreground max-md:hidden">
        {t.setup.rail.settingUp}{" "}
        <b className="font-semibold text-foreground">
          {project.split(/[\\/]/).filter(Boolean).at(-1)}
        </b>
      </p>
      <ol className="grid gap-0.5 max-md:flex">
        {steps.map((step, n) => (
          <li key={step.id}>
            <button
              type="button"
              disabled={n > reach}
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
                {stepIn(t, step).name}
                <small className="text-xs font-normal text-muted-foreground max-md:hidden">
                  {stepIn(t, step).hint}
                </small>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <RailEnd working={working} />
    </nav>
  );
}

function Bar({
  state,
  step,
  at,
  onGo,
}: Readonly<{
  state: SetupState;
  step: Step;
  at: number;
  onGo: (n: number) => void;
}>) {
  const t = useT();
  const { coach } = state;
  const building = coach.phase === "build" && !setUpDone(coach);
  return (
    <div className="border-t border-border bg-card px-7 py-3.5">
      <div className="mx-auto flex max-w-[880px] items-center gap-3">
        {at > 0 && step.id !== "start" && !building && !setUpDone(coach) && (
          <Button
            variant="ring"
            size="pill"
            onClick={() => {
              onGo(at - 1);
            }}
          >
            <ArrowLeft className="size-4" aria-hidden /> {t.setup.rail.back}
          </Button>
        )}
        <span className="flex-1 text-[12.5px] text-faint">
          {hintOf(step, coach, t.setup.rail)}
        </span>
        <BarAction state={state} step={step} at={at} onGo={onGo} />
      </div>
    </div>
  );
}

function hintOf(
  step: Step,
  coach: SetupState["coach"],
  m: Messages["setup"]["rail"],
): string {
  if (step.id === "hello") return "";
  if (step.id === "setup") return coach.phase === "build" ? "" : m.nextWrites;
  if (step.id === "start") return "";
  return m.canChange;
}

// The rail's foot: how long it takes, and the kobold, at work or not.
function RailEnd({ working }: Readonly<{ working: boolean }>) {
  const t = useT();
  const koboldName = useKoboldName();
  return (
    <div className="mt-auto grid gap-2.5 pt-4 max-md:hidden">
      <p className="px-1.5 text-xs text-muted-foreground">
        {t.setup.rail.minutes}
      </p>
      <div className="rounded-xl bg-[radial-gradient(#dfe5f5_1px,transparent_1px)] bg-[length:10px_10px] p-3 shadow-[0_0_0_1px_var(--border)]">
        <div className="flex items-center gap-2.5 rounded-xl bg-card p-2.5 shadow-[0_0_0_1px_var(--border-soft)]">
          <KoboldHead size={36} />
          <span className="grid">
            <b className="text-[13.5px]">{koboldName}</b>
            <small className="text-xs text-muted-foreground">
              {working ? t.setup.rail.working : t.setup.rail.help}
            </small>
          </span>
        </div>
      </div>
    </div>
  );
}

// A step's name and hint in the language shown.
function stepIn(t: Messages, step: Step): { name: string; hint: string } {
  const words = t.setup.steps as Record<
    string,
    { name: string; hint: string } | undefined
  >;
  return words[step.id] ?? step;
}
