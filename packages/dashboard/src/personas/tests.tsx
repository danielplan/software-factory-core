// A persona's tests: "What should <name> try in the app?" with Start test,
// and the runs, the last one first. A run's page shows the task, who it
// ran as, what the kobold did step by step (what it expected, and whether
// that happened) and the signals it filed. Tests run on this computer,
// never on the live app.

import { ChevronLeft, Crosshair } from "lucide-react";
import { useState } from "react";

import {
  type KobblePersonaPage,
  messageOf,
  type PersonaTest,
  post,
  type TestPage,
} from "@/api";
import { PersonaFace } from "@/components/kobold-face";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { personaHash } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { CARD, Chevron, ROW } from "@/signals/bits";
import { agoOf, countWords } from "@/signals/view";
import { type Read, useRead } from "@/lib/use-read";

import { SignalLine } from "./signal-line";
import { StatusChip, StatusIcon } from "./test-bits";

export function TestsTab({ page }: Readonly<{ page: KobblePersonaPage }>) {
  const { persona, tests } = page;
  return (
    <>
      <StartTest persona={persona.id} name={persona.name} />
      <div className={CARD}>
        {tests.length === 0 && (
          <p className="p-[50px] text-center text-muted-foreground">
            No tests yet
          </p>
        )}
        {tests.map((test) => (
          <a
            key={test.id}
            href={personaHash(persona.id, { test: test.id })}
            className={cn(ROW, "hover:bg-surface")}
          >
            <StatusIcon status={test.status} />
            <span className="grid min-w-0 flex-1">
              <span className="font-semibold">{test.task}</span>
              <span className="text-[12.5px] text-muted-foreground">
                The current app · {whenOf(test)}
              </span>
            </span>
            <span className="text-[12.5px] text-muted-foreground">
              {resultWords(test)}
            </span>
            <Chevron />
          </a>
        ))}
      </div>
    </>
  );
}

function whenOf(test: PersonaTest): string {
  if (test.status === "queued") return "waiting to start";
  return test.started ? agoOf(test.started, new Date()) : "";
}

function resultWords(test: PersonaTest): string {
  if (test.status === "done")
    return countWords(test.signals.length, "signal", "signals");
  return { queued: "Waiting", running: "Running", failed: "Failed" }[
    test.status
  ];
}

function StartTest({
  persona,
  name,
}: Readonly<{ persona: string; name: string }>) {
  const [task, setTask] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const start = () => {
    setBusy(true);
    post("/api/kobble/tests", { persona, task }).then(
      () => {
        setBusy(false);
        setTask("");
        setProblem(null);
      },
      (error: unknown) => {
        setBusy(false);
        setProblem(messageOf(error));
      },
    );
  };
  return (
    <div className={cn(CARD, "mb-4 px-5 py-[18px]")}>
      <textarea
        aria-label="The task"
        value={task}
        rows={2}
        placeholder={`What should ${name} try in the app?`}
        onChange={(event) => {
          setTask(event.target.value);
        }}
        className="min-h-[60px] w-full resize-none rounded-[14px] bg-ground px-4 py-3.5 outline-none placeholder:text-faint focus-visible:ring-[3px] focus-visible:ring-ring/30"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <span className="text-[12.5px] text-muted-foreground">
          Runs on this computer, on the current app
        </span>
        {problem && (
          <span role="alert" className="text-[12.5px] text-destructive">
            {problem}
          </span>
        )}
        <Button
          size="pill"
          className="ml-auto"
          disabled={busy || !task.trim()}
          onClick={start}
        >
          <Crosshair aria-hidden strokeWidth={2.2} className="size-3.5" />
          Start test
        </Button>
      </div>
    </div>
  );
}

export function TestRun({ id }: Readonly<{ id: string }>) {
  const { data, problem } = useRead(
    `/api/kobble/test?id=${encodeURIComponent(id)}`,
  ) as Read<TestPage>;
  return (
    <div>
      {problem && (
        <ProblemBox title="This test cannot be read" text={problem} />
      )}
      {data && <RunBody page={data} />}
    </div>
  );
}

const TITLE = "mt-[30px] mb-3 text-[17px] font-semibold tracking-[-0.01em]";

function RunBody({ page }: Readonly<{ page: TestPage }>) {
  const { test, persona } = page;
  return (
    <>
      <a
        href={personaHash(persona.id, {})}
        className="mb-3.5 inline-flex items-center gap-1 text-[13px] font-semibold text-blue"
      >
        <ChevronLeft aria-hidden className="size-[15px]" strokeWidth={2.2} />
        {persona.name}
      </a>
      <div className={cn(CARD, "px-7 py-[26px]")}>
        <div className="mb-3 flex items-center gap-2">
          <StatusChip status={test.status} />
          <span className="text-[12.5px] text-muted-foreground">
            {test.id} · {whenOf(test)}
          </span>
        </div>
        <h1 className="mb-3.5 text-[28px] leading-[1.15] font-bold tracking-[-0.025em]">
          {test.task}
        </h1>
        <div className="flex flex-wrap gap-2">
          <a
            href={personaHash(persona.id)}
            className="inline-flex h-[34px] items-center gap-[7px] rounded-full bg-card pr-3.5 pl-1.5 text-[13px] font-medium text-foreground-2 shadow-card"
          >
            <PersonaFace face={persona.face} size={24} />
            As {persona.name}
          </a>
          <span className="inline-flex h-[34px] items-center rounded-full bg-card px-3.5 text-[13px] font-medium text-foreground-2 shadow-card">
            On the current app
          </span>
        </div>
      </div>
      {test.problem && (
        <div className="mt-4">
          <ProblemBox title="The test could not finish" text={test.problem} />
        </div>
      )}
      <h2 className={TITLE}>What the kobold did</h2>
      <Steps test={test} />
      <h2 className={TITLE}>Signals it filed</h2>
      <div className={CARD}>
        {page.signals.length === 0 && (
          <p className="p-[50px] text-center text-muted-foreground">None yet</p>
        )}
        {page.signals.map((signal) => (
          <SignalLine key={signal.id} signal={signal} />
        ))}
      </div>
    </>
  );
}

function Steps({ test }: Readonly<{ test: PersonaTest }>) {
  const working = test.status === "running" || test.status === "queued";
  return (
    <div className={CARD}>
      {test.steps.map((step, at) => (
        <div key={at} className={ROW}>
          <span className="w-[18px] text-[12.5px] text-muted-foreground">
            {at + 1}
          </span>
          <span className="grid min-w-0 flex-1">
            <span className="font-medium">{step.did}</span>
            <span className="text-[12.5px] text-muted-foreground">
              Expected: {step.expected}
              {step.note ? ` · ${step.note}` : ""}
            </span>
          </span>
          <span
            className={cn(
              "inline-flex h-[26px] flex-none items-center rounded-full px-2.5 text-xs font-medium",
              step.asExpected
                ? "text-foreground-2 shadow-[inset_0_0_0_1px_var(--line-soft)]"
                : "bg-[#fdecec] text-[#c4323a]",
            )}
          >
            {step.asExpected ? "As expected" : "Surprised"}
          </span>
        </div>
      ))}
      {working && (
        <div className={ROW}>
          <StatusIcon status={test.status} />
          <span className="text-[12.5px] text-muted-foreground">
            {test.status === "queued"
              ? "Waiting for the test before it…"
              : "The kobold is using the app…"}
          </span>
        </div>
      )}
      {!working && test.steps.length === 0 && (
        <p className="p-[50px] text-center text-muted-foreground">No steps</p>
      )}
    </div>
  );
}
