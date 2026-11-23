// Each step's buttons, at the right of its head as on every page: Back,
// and its main button: Let's go, Continue, Set up Kobble (then, once done,
// Pick where to start), and on the first exploration Open it (the picked
// one) or Look around first.

import type { TFunction } from "i18next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { messageOf, post, type State } from "@/api/client";
import { getChecked } from "@/api/query";
import { explorationsViewSchema } from "@/api/schemas/explorations";
import { Button } from "@/components/ui/button";

import { usePicked } from "./first-exploration";
import { setUpDone, type Step } from "./steps";

type SetupState = Extract<State, { mode: "setup" }>;

export function StepActions({
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
  const t = useTranslation().t;
  const navigate = useNavigate();
  const { coach } = state;
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const picked = usePicked();
  const run = (work: () => Promise<unknown>) => {
    setBusy(true);
    setProblem(null);
    work().then(
      () => {
        setBusy(false);
      },
      (error: unknown) => {
        setBusy(false);
        setProblem(messageOf(error));
      },
    );
  };
  const main = mainOf(step, coach, picked, {
    t,
    next: () => {
      onGo(at + 1);
    },
    run,
    go: (to) => {
      void navigate(to);
    },
  });
  if (!main) return null;
  return (
    <>
      {problem && (
        <span className="text-[13px] text-destructive">{problem}</span>
      )}
      {at > 0 && step.id !== "start" && !setUpDone(coach) && (
        <Button
          variant="ring"
          size="pill"
          onClick={() => {
            onGo(at - 1);
          }}
        >
          <ArrowLeft className="size-4" aria-hidden /> {t("setup.actions.back")}
        </Button>
      )}
      <Button size="pill" disabled={busy || coach.working} onClick={main.act}>
        {main.label}
        <ArrowRight className="size-4" aria-hidden />
      </Button>
    </>
  );
}

// A step's main button: what it says and does; none while Kobble is set up.
function mainOf(
  step: Step,
  coach: SetupState["coach"],
  picked: string | null,
  acts: {
    t: TFunction;
    next: () => void;
    run: (work: () => Promise<unknown>) => void;
    go: (to: string) => void;
  },
): { label: string; act: () => void } | null {
  const { t, next, run, go } = acts;
  if (step.id === "hello") return { label: t("setup.actions.go"), act: next };
  if (step.id === "start")
    return {
      label: picked ? t("setup.actions.open") : t("setup.actions.look"),
      act: () => {
        run(async () => {
          const to = await openKobble(picked);
          if (to) go(to);
        });
      },
    };
  if (step.id !== "setup")
    return { label: t("setup.actions.continue"), act: next };
  if (setUpDone(coach))
    return { label: t("setup.actions.pickStart"), act: next };
  if (coach.phase === "build") return null;
  return {
    label: t("setup.actions.setUp"),
    act: () => {
      run(() => post("/api/setup/build"));
    },
  };
}

// Opens Kobble; with a starting point picked, its exploration is started,
// with Sprocket's first look at it under way, and where it is returned to
// open.
async function openKobble(picked: string | null): Promise<string | null> {
  await post("/api/setup/open");
  if (!picked) return null;
  const list = await getChecked(
    "/api/kobble/explorations",
    explorationsViewSchema,
  );
  const found = [...list.waiting, ...list.exploring].find(
    (row) => row.title.toLowerCase() === picked.toLowerCase(),
  );
  if (!found) return null;
  await post("/api/kobble/explorations/start", { id: found.id });
  return `/explore/${encodeURIComponent(found.id)}`;
}
