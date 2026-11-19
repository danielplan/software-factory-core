// A prototype on the board, its screen always the same size: the live app
// while it runs (on its branch, at a desktop's size, shrunk; Bigger opens
// it full size), being made, or a sketch with Start in its middle; how it
// differs, what odd thing happened, and its last persona test. Agreeing is
// the badge on its bar.

import type { NodeProps } from "@xyflow/react";
import { Play } from "lucide-react";

import type { TestResult, VersionRun } from "@/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/markdown";

import { Frame, useBoardDo } from "./frame";
import { Making } from "./prototype-making";
import { LiveScreen, SCREEN } from "./prototype-screen";
import type { ThingNode } from "./nodes";
import { useT } from "@/i18n/use-t";
import type { Messages } from "@/i18n/messages";

const TINTS = ["#cfe0ff", "#ffd6e2", "#d6f2e7"];

function stateWords(
  run: VersionRun | undefined,
  t: Messages["explore"],
): string | null {
  if (!run) return null;
  if (run.state === "starting") return t.starting;
  if (run.state === "failed") return run.problem ?? t.board.stopped;
  // Running or stopped: what is odd about it (not shared with the team).
  return run.problem;
}

function testWords(
  test: TestResult,
  b: Messages["explore"]["board"],
): { words: string; dot: string } {
  if (test.status === "done")
    return {
      words: b.stepsAsExpected(test.asExpected, test.steps),
      dot: test.asExpected === test.steps ? "bg-success" : "bg-destructive",
    };
  if (test.status === "failed")
    return { words: b.testUnfinished, dot: "bg-faint" };
  return { words: b.testing, dot: "bg-blue" };
}

// The screen: the running app, or a sketch of one with Start in its middle
// (Starting… while it starts).
function Screen({
  run,
  at,
  title,
  start,
}: Readonly<{
  run: VersionRun | undefined;
  at: number;
  title: string;
  start: (() => void) | null;
}>) {
  const t = useT();
  if (run?.state === "running" && run.url)
    return <LiveScreen url={run.url} title={title} />;
  const starting = run?.state === "starting";
  return (
    <div
      className="relative grid place-items-center rounded-[9px] bg-[#f3f4f7]"
      style={SCREEN}
    >
      {(start ?? starting) && (
        <Button
          size="pill"
          className="nodrag absolute z-10 gap-2 shadow-[0_8px_24px_-10px_rgb(20_24_36/0.45)]"
          disabled={starting}
          onClick={start ?? undefined}
        >
          {starting ? (
            t.explore.starting
          ) : (
            <>
              <Play aria-hidden className="size-4 fill-current" />{" "}
              {t.explore.start}
            </>
          )}
        </Button>
      )}
      <div className="flex h-36 w-[300px] flex-col gap-2.5 rounded-lg bg-card p-3.5 opacity-60 shadow-[0_1px_4px_rgb(0_0_0/0.1)]">
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
  const t = useT();
  const { thing, page } = data;
  const act = useBoardDo(page.exploration.id);
  if (thing.kind !== "prototype") return null;
  const run = page.runs.find((one) => one.version === thing.key);
  const test = page.tests[thing.key];
  const open = ["waiting", "exploring"].includes(page.exploration.status);
  const words = stateWords(run, t.explore);
  const result = test ? testWords(test, t.explore.board) : null;
  return (
    <Frame
      data={data}
      title={`${thing.key} · ${thing.name}`}
      glow={run?.state === "making"}
    >
      {run?.state === "making" ? (
        <Making run={run} />
      ) : (
        <Screen
          run={run}
          at={thing.key.charCodeAt(0) - 65}
          title={`${thing.key} · ${thing.name}`}
          start={
            open
              ? () => {
                  act("open", { key: thing.key });
                }
              : null
          }
        />
      )}
      <div className="text-xs text-muted-foreground">
        <Markdown text={thing.difference} />
      </div>
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
    </Frame>
  );
}
