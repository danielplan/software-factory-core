// The bottom bar's button on each step: Let's go, Continue, Set up Kobble
// (then, once done, Pick where to start), and on the first exploration
// Open it (the picked one) or Look around first.

import { ArrowRight } from "lucide-react";
import { useState } from "react";

import { get, messageOf, post, type State } from "@/api";
import { Button } from "@/components/ui/button";

import { pickedStart } from "./first-exploration";
import { setUpDone, type Step } from "./steps";
import { useT } from "@/i18n/use-t";

type SetupState = Extract<State, { mode: "setup" }>;

export function BarAction({
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
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
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
  const next = () => {
    onGo(at + 1);
  };
  let label = t.setup.bar.continue;
  let act = next;
  if (step.id === "hello") label = t.setup.bar.go;
  if (step.id === "setup") {
    const done = setUpDone(coach);
    if (coach.phase === "build" && !done) return null;
    label = done ? t.setup.bar.pickStart : t.setup.bar.setUp;
    if (!done)
      act = () => {
        run(() => post("/api/setup/build"));
      };
  }
  if (step.id === "start") {
    const picked = pickedStart();
    label = picked ? t.setup.bar.open : t.setup.bar.look;
    act = () => {
      run(() => openKobble(picked));
    };
  }
  return (
    <>
      {problem && (
        <span className="text-[13px] text-destructive">{problem}</span>
      )}
      <Button size="pill" disabled={busy || coach.working} onClick={act}>
        {label}
        <ArrowRight className="size-4" aria-hidden />
      </Button>
    </>
  );
}

// Opens Kobble; with a starting point picked, its exploration is started
// and opened, with the kobold's first look at it under way.
async function openKobble(picked: string | null): Promise<void> {
  await post("/api/setup/open");
  if (!picked) return;
  type Row = { id: string; title: string };
  const list = await get<Record<"exploring" | "waiting" | "done", Row[]>>(
    "/api/kobble/explorations",
  );
  const found = [...list.waiting, ...list.exploring].find(
    (row) => row.title.toLowerCase() === picked.toLowerCase(),
  );
  if (!found) return;
  await post("/api/kobble/explorations/start", { id: found.id });
  location.hash = `#explore/${encodeURIComponent(found.id)}`;
}
