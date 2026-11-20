// A prototype on the board: a frame with its versions (the choice's
// options, the changes, other ways), a switch between them on top, and the
// version shown below, its screen always the same size: the live app while
// it runs (on its branch, at a desktop's size, shrunk; Bigger opens it full
// size), being made, or a sketch with Start in its middle; how it differs,
// what odd thing happened, and its last persona test. Agreeing (the badge
// on its bar) is for the version shown. Switching while one runs runs the
// other instead.

import type { NodeProps } from "@xyflow/react";
import { Check, Play } from "lucide-react";
import { useState } from "react";

import type { TestResult, VersionRun } from "@/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/markdown";

import { Frame, useBoardDo } from "./frame";
import { Making } from "./prototype-making";
import { LiveScreen, SCREEN } from "./prototype-screen";
import { type ThingNode, versionsIn } from "./nodes";

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
            "Starting…"
          ) : (
            <>
              <Play aria-hidden className="size-4 fill-current" /> Start
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

type Made = ReturnType<typeof versionsIn>[number];

const LIVE = new Set(["running", "starting"]);

// The version shown: the one picked, else one being made, else the one
// running, else the agreed one, else the newest. A new version shows
// itself.
function useShown(versions: Made[], runs: VersionRun[]) {
  // What was picked, and among how many versions: a new one shows itself.
  const [picked, setPicked] = useState<{ key: string; of: number } | null>(
    null,
  );
  const count = versions.length;
  const pick = (key: string) => {
    setPicked({ key, of: count });
  };
  const state = (made: Made) =>
    runs.find((run) => run.version === made.key)?.state;
  const shown =
    versions.find((made) => picked?.of === count && made.key === picked.key) ??
    versions.findLast((made) => state(made) === "making") ??
    versions.find((made) => LIVE.has(state(made) ?? "")) ??
    versions.find((made) => made.agreed) ??
    versions.at(-1);
  return { shown, pick };
}

export function PrototypeNode({ data }: NodeProps<ThingNode>) {
  const { thing: first, page } = data;
  const act = useBoardDo(page.exploration.id);
  const versions = first.kind === "prototype" ? versionsIn(page, first.id) : [];
  const { shown: thing, pick } = useShown(versions, page.runs);
  if (!thing) return null;
  const runOf = (key: string) => page.runs.find((one) => one.version === key);
  const run = runOf(thing.key);
  const open = ["waiting", "exploring"].includes(page.exploration.status);
  // Switching while another version of this frame runs runs this one.
  const switchTo = (key: string) => {
    pick(key);
    const live = versions.some(
      (made) => made.key !== key && LIVE.has(runOf(made.key)?.state ?? ""),
    );
    const state = runOf(key)?.state;
    if (open && live && state !== "making" && !LIVE.has(state ?? ""))
      act("open", { key });
  };
  return (
    <Frame
      data={{ ...data, thing }}
      title={`${thing.key} · ${thing.name}`}
      glow={run?.state === "making"}
    >
      {versions.length > 1 && (
        <Versions
          versions={versions}
          shown={thing.key}
          stateOf={(key) => runOf(key)?.state}
          onPick={switchTo}
        />
      )}
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
      <About
        thing={thing}
        words={stateWords(run)}
        test={page.tests[thing.key] ?? null}
      />
    </Frame>
  );
}

// How the version shown differs (and what it was changed from), what odd
// thing happened, and its last persona test.
function About({
  thing,
  words,
  test,
}: Readonly<{ thing: Made; words: string | null; test: TestResult | null }>) {
  const result = test ? testWords(test) : null;
  return (
    <>
      <div className="text-xs text-muted-foreground">
        {thing.from && (
          <span className="font-medium text-foreground-2">
            Changed from {thing.from}:{" "}
          </span>
        )}
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
    </>
  );
}

// The switch between a frame's versions: one segment each, its letter, a
// dot while it is made or runs, a tick when agreed.
function Versions({
  versions,
  shown,
  stateOf,
  onPick,
}: Readonly<{
  versions: Made[];
  shown: string;
  stateOf: (key: string) => VersionRun["state"] | undefined;
  onPick: (key: string) => void;
}>) {
  return (
    <div
      role="tablist"
      aria-label="Versions"
      className="nodrag flex flex-wrap gap-1 rounded-[10px] bg-[#f3f4f7] p-1"
    >
      {versions.map((made) => {
        const state = stateOf(made.key);
        const on = made.key === shown;
        return (
          <button
            key={made.key}
            type="button"
            role="tab"
            aria-selected={on}
            title={[`${made.key} · ${made.name}`, made.difference]
              .filter(Boolean)
              .join(": ")}
            onClick={() => {
              onPick(made.key);
            }}
            className={cn(
              "inline-flex h-7 max-w-[11rem] items-center gap-1.5 rounded-[7px] px-2.5 text-xs",
              on
                ? "bg-card font-semibold text-foreground shadow-[0_1px_2px_rgb(20_24_36/0.12)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {state === "making" && (
              <span className="size-1.5 flex-none rounded-full bg-blue motion-safe:animate-pulse" />
            )}
            {state && LIVE.has(state) && (
              <span className="size-1.5 flex-none rounded-full bg-success" />
            )}
            <span className="flex-none">{made.key}</span>
            <span className="truncate font-normal">
              {made.from ? `from ${made.from}` : made.name}
            </span>
            {made.agreed && (
              <Check aria-hidden className="size-3 flex-none text-[#197653]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
