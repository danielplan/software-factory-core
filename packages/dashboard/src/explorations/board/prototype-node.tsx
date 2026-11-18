// A prototype on the board: the live screen while it runs (the real app on
// its branch, in a small frame you can use), otherwise a placeholder; how
// it differs, what is happening to it (the kobold making it, starting),
// its last persona test, and Open and Test (as the exploration's persona).
// Agreeing is the badge on its bar.

import type { NodeProps } from "@xyflow/react";
import { ExternalLink } from "lucide-react";

import type { TestResult, VersionRun } from "@/api";
import { PersonaFace } from "@/components/kobold-face";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/markdown";

import { Frame, useBoardDo } from "./frame";
import { Making } from "./prototype-making";
import type { ThingNode } from "./nodes";

const SMALL = "h-7 gap-1.5 px-2.5 text-xs";
const TINTS = ["#cfe0ff", "#ffd6e2", "#d6f2e7"];

function stateWords(run: VersionRun | undefined): string | null {
  if (!run) return null;
  if (run.state === "starting") return "Starting…";
  if (run.state === "failed") return run.problem ?? "It stopped.";
  // Running or stopped: what is odd about it (not shared with the team).
  return run.problem;
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

// The screen: the running app, or a sketch of one.
function Screen({
  run,
  at,
}: Readonly<{ run: VersionRun | undefined; at: number }>) {
  if (run?.state === "running" && run.url)
    return (
      <div className="nodrag nowheel h-[200px] overflow-hidden rounded-[9px] shadow-[0_0_0_1px_var(--line-soft)]">
        <iframe
          title="The prototype, running"
          src={run.url}
          className="h-[400px] w-[632px] origin-top-left scale-50 border-0"
        />
      </div>
    );
  return (
    <div className="grid h-[110px] place-items-center rounded-[9px] bg-[#f3f4f7]">
      <div className="flex h-20 w-[170px] flex-col gap-1.5 rounded-md bg-card p-2 shadow-[0_1px_4px_rgb(0_0_0/0.1)]">
        <div
          className="h-[6px] w-1/2 rounded-[3px]"
          style={{ background: TINTS[at % TINTS.length] }}
        />
        {[0, 1, 2].map((line) => (
          <div key={line} className="h-2 rounded-[3px] bg-[#f0f1f4]" />
        ))}
      </div>
    </div>
  );
}

export function PrototypeNode({ data }: NodeProps<ThingNode>) {
  const { thing, page } = data;
  if (thing.kind !== "prototype") return null;
  const run = page.runs.find((one) => one.version === thing.key);
  const test = page.tests[thing.key];
  const open = ["waiting", "exploring"].includes(page.exploration.status);
  const words = stateWords(run);
  const result = test ? testWords(test) : null;
  return (
    <Frame
      data={data}
      title={`${thing.key} · ${thing.name}`}
      glow={run?.state === "making"}
    >
      {run?.state === "making" ? (
        <Making run={run} />
      ) : (
        <Screen run={run} at={thing.key.charCodeAt(0) - 65} />
      )}
      <div className="text-xs text-muted-foreground">
        <Markdown text={thing.difference} />
      </div>
      {thing.said && (
        <div className="border-l-2 border-border pl-2 text-xs text-foreground-2">
          <Markdown text={thing.said} />
        </div>
      )}
      {words && <div className="text-xs text-foreground-2">{words}</div>}
      {test && result && (
        <a
          className="nodrag flex gap-1.5 text-xs"
          href={`#personas/${encodeURIComponent(test.persona)}/tests/${test.id}`}
        >
          <span
            className={cn("mt-[5px] size-2 flex-none rounded-full", result.dot)}
          />
          {result.words}
        </a>
      )}
      {open && <Actions data={data} run={run} />}
    </Frame>
  );
}

// Open (the running one opens in a new tab) and Test, as the exploration's
// persona.
function Actions({
  data,
  run,
}: Readonly<{ data: ThingNode["data"]; run: VersionRun | undefined }>) {
  const { thing, page } = data;
  const act = useBoardDo(page.exploration.id);
  if (thing.kind !== "prototype") return null;
  const persona = page.personas[0];
  const making = run?.state === "making";
  return (
    <div className="nodrag flex items-center gap-1.5">
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
            act("open", { key: thing.key });
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
          act("test", {
            key: thing.key,
            task: `Try “${thing.name}”: ${thing.difference}`,
          });
        }}
      >
        {persona && <PersonaFace face={persona.face} size={14} />}
        Test
      </Button>
    </div>
  );
}
