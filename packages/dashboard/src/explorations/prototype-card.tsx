// A prototype on the canvas: a small preview, its name and how it differs,
// what is happening to it (the kobold making it, starting, running with a
// link to open it), its last persona test, and Open, Test (as the
// exploration's persona) and Agree. A sketch until agreed; the agreed one
// is outlined in green.

import { ExternalLink } from "lucide-react";

import type { ExplorationPage, TestResult, VersionRun } from "@/api";
import { PersonaFace } from "@/components/kobold-face";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Badge } from "./bits";

type Made = ExplorationPage["board"]["prototypes"][number];
type Press = (path: string, body: object) => void;

const TINTS = ["#cfe0ff", "#ffd6e2", "#d6f2e7"];
const SMALL = "h-7 gap-1.5 px-2.5 text-xs";

function stateWords(run: VersionRun | undefined): string | null {
  if (!run) return null;
  if (run.state === "making") {
    const doing = run.activity ? `: ${run.activity}` : "…";
    return `The kobold is making it${doing}`;
  }
  if (run.state === "starting") return "Starting…";
  if (run.state === "failed") return run.problem ?? "It stopped.";
  return run.state === "running" ? run.problem : null;
}

export function PrototypeCard({
  page,
  made,
  press,
}: Readonly<{ page: ExplorationPage; made: Made; press: Press }>) {
  const open = ["waiting", "exploring"].includes(page.exploration.status);
  const run = page.runs.find((one) => one.version === made.key);
  const test = page.tests[made.key];
  const words = stateWords(run);
  return (
    <div
      data-box="prototype"
      data-key={made.key}
      data-agreed={made.agreed ? "1" : "0"}
      className={cn(
        "rounded-[14px] bg-card p-2.5",
        made.agreed ? "shadow-[0_0_0_2px_#12a594]" : "shadow-card",
      )}
    >
      <Screen at={made.key.charCodeAt(0) - 65} />
      <div className="mx-0.5 mt-2 mb-0.5 flex items-center gap-1.5">
        <span className="flex-1 text-[13px] font-semibold">
          {made.key} · {made.name}
        </span>
        <Badge agreed={made.agreed} />
      </div>
      <div className="mx-0.5 mb-1.5 text-xs text-muted-foreground">
        {made.difference}
      </div>
      {words && (
        <div className="mx-0.5 mb-1.5 text-xs text-foreground-2">{words}</div>
      )}
      {test && <TestLine test={test} />}
      {open && <Actions page={page} made={made} run={run} press={press} />}
    </div>
  );
}

function Screen({ at }: Readonly<{ at: number }>) {
  return (
    <div className="grid h-[70px] place-items-center rounded-[9px] bg-[#f3f4f7]">
      <div className="flex h-14 w-[120px] flex-col gap-1 rounded-md bg-card p-[5px] shadow-[0_1px_4px_rgb(0_0_0/0.1)]">
        <div
          className="h-[5px] w-1/2 rounded-[3px]"
          style={{ background: TINTS[at % TINTS.length] }}
        />
        {[0, 1, 2].map((line) => (
          <div key={line} className="h-[7px] rounded-[3px] bg-[#f0f1f4]" />
        ))}
      </div>
    </div>
  );
}

function testWords(test: TestResult): { words: string; dot: string } {
  if (test.status === "done")
    return {
      words: `${String(test.asExpected)} of ${String(test.steps)} steps as expected`,
      dot: test.asExpected === test.steps ? "bg-success" : "bg-destructive",
    };
  if (test.status === "failed")
    return { words: "The test did not finish", dot: "bg-faint" };
  return { words: "Testing…", dot: "bg-blue" };
}

function TestLine({ test }: Readonly<{ test: TestResult }>) {
  const { words, dot } = testWords(test);
  return (
    <div className="mx-0.5 mb-1 flex gap-1.5 text-xs">
      <span className={cn("mt-[5px] size-2 flex-none rounded-full", dot)} />
      <a
        href={`#personas/${encodeURIComponent(test.persona)}/tests/${test.id}`}
      >
        {words}
      </a>
    </div>
  );
}

function Actions({
  page,
  made,
  run,
  press,
}: Readonly<{
  page: ExplorationPage;
  made: Made;
  run: VersionRun | undefined;
  press: Press;
}>) {
  const persona = page.personas[0];
  const making = run?.state === "making";
  return (
    <div className="mt-1.5 flex items-center gap-1.5">
      {run?.state === "running" && run.url ? (
        <Button asChild variant="ring" size="pill-sm" className={SMALL}>
          <a href={run.url} target="_blank" rel="noreferrer">
            Open <ExternalLink aria-hidden className="size-3" />
          </a>
        </Button>
      ) : (
        <Button
          variant="ring"
          size="pill-sm"
          className={SMALL}
          disabled={making}
          onClick={() => {
            press("open", { key: made.key });
          }}
        >
          Open
        </Button>
      )}
      <Button
        variant="ring"
        size="pill-sm"
        className={SMALL}
        disabled={!persona || making}
        title={
          persona ? `Test it as ${persona.name}` : "Testing needs a persona"
        }
        onClick={() => {
          press("test", {
            key: made.key,
            task: `Try “${made.name}”: ${made.difference}`,
          });
        }}
      >
        {persona && <PersonaFace face={persona.face} size={14} />}
        Test
      </Button>
      <button
        type="button"
        className="ml-auto text-xs font-semibold text-blue"
        onClick={() => {
          press("agree", { key: made.key });
        }}
      >
        {made.agreed ? "Undo" : "Agree"}
      </button>
    </div>
  );
}
