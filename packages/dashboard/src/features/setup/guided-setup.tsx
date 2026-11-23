// Setting up Kobble, one step at a time, in Kobble's own frame (the same
// sidebar, page head and Sprocket's bar as every page): Sprocket, the setup
// coach, reads the project, draws what it understands into the map's areas
// (setup-coach.md), and the owner goes through them in order, confirming,
// taking off, asking, adding personas, and at the end has Kobble set itself
// up. The steps are the sidebar's rows; each step's buttons sit in its
// head, where every page has its own.

import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";

import type { State } from "@/api/client";
import { PageHead } from "@/components/layout/page-head";
import { Shell } from "@/components/layout/shell";
import { Sidebar } from "@/components/layout/sidebar";

import { useCoachCall } from "./coach/coach-call";
import { CoachStart } from "./coach/coach-chat";
import { CoachSprocket } from "./coach/coach-sprocket";
import { KoboldSays } from "./kobold-says";
import { SetupStep, setupWords } from "./setup-step";
import { nameOf, SetupSteps } from "./setup-steps";
import { StepActions } from "./step-action";
import { StepCards } from "./step-cards";
import { cardsIn, setUpDone, type Step, stepsOf } from "./steps";
import { Welcome } from "./welcome";

type SetupState = Extract<State, { mode: "setup" }>;

// The step in the address (#step-3), so a reload stays there.
function stepIn(pathname: string): number {
  const found = /^\/step-(\d+)$/.exec(pathname);
  return found ? Number(found[1]) : 0;
}

export function GuidedSetup({ state }: Readonly<{ state: SetupState }>) {
  const t = useTranslation().t;
  const { coach } = state;
  const steps = stepsOf(coach.draft);
  const at = stepIn(useLocation().pathname);
  const navigate = useNavigate();
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
    void navigate(`/step-${String(to)}`, { replace: true });
  };
  const head = headOf(t, state, step);
  return (
    <Shell
      shown={coach.started ? step.id : "start"}
      sidebar={
        <Sidebar name={projectName(state.project)}>
          {(onGo) => (
            <SetupSteps
              steps={steps}
              at={shown}
              reach={coach.started ? reach : -1}
              onGo={onGo}
            />
          )}
        </Sidebar>
      }
      sprocket={<CoachSprocket coach={coach} call={call} />}
    >
      <PageHead
        title={head.title}
        about={head.about}
        actions={
          coach.started && (
            <StepActions state={state} step={step} at={shown} onGo={go} />
          )
        }
      />
      {coach.started ? (
        <StepBody state={state} step={step} />
      ) : (
        <CoachStart coach={coach} call={call} />
      )}
    </Shell>
  );
}

// What a step shows under its head.
function StepBody({
  state,
  step,
}: Readonly<{ state: SetupState; step: Step }>) {
  const { coach } = state;
  if (step.id === "hello") return <Welcome coach={coach} />;
  const says = <KoboldSays coach={coach} step={step} />;
  if (step.id === "setup")
    return (
      <>
        {says}
        <SetupStep coach={coach} />
      </>
    );
  return (
    <>
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

// A step's title and the line under it: before the first answer, what
// Sprocket asks for; while it reads, that it reads; on Set up, how far
// setting up is.
function headOf(
  t: TFunction,
  state: SetupState,
  step: Step,
): { title: string; about: string } {
  const { coach } = state;
  const leads = t("setup.leads", { returnObjects: true }) as Record<
    string,
    string | undefined
  >;
  if (!coach.started)
    return { title: nameOf(t, step), about: t("setup.tellMe") };
  if (step.id === "setup") {
    const words = setupWords(coach, t);
    return { title: words.title, about: words.lead };
  }
  if (step.id === "hello" && coach.working)
    return { title: nameOf(t, step), about: t("setup.reading") };
  return { title: nameOf(t, step), about: leads[step.id] ?? "" };
}

// The project's folder name, at the top of the sidebar until the company
// has a name of its own.
function projectName(project: string): string | null {
  return project.split(/[\\/]/).findLast(Boolean) ?? null;
}
