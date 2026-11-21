// A prototype on the board: its variants (a choice's options, other ways)
// switched on top, outside the app, and its screen below, always the same
// size: the live app while it runs (on its branch, on the page the change
// is on, with the variant picked; at a desktop's size, shrunk; Bigger opens
// it full size), being made, or a sketch with Start in its middle; how the
// variant differs, what odd thing happened, and its last persona test.
// Agreeing (the badge on its bar) agrees to the variant shown.

import type { NodeProps } from "@xyflow/react";
import { Check, Play } from "lucide-react";
import { useState } from "react";

import type { TestResult, VersionRun } from "@/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/markdown";

import { Frame, useBoardDo } from "./frame";
import { Making, MakingLine } from "./prototype-making";
import { Starting } from "./prototype-starting";
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
  making = false,
}: Readonly<{
  run: VersionRun | undefined;
  at: number;
  title: string;
  start: (() => void) | null;
  making?: boolean;
}>) {
  const t = useT();
  if (run?.state === "running" && run.url)
    return <LiveScreen url={run.url} title={title} making={making} />;
  const starting = run?.state === "starting";
  return (
    <div
      className="relative grid place-items-center rounded-[9px] bg-[#f3f4f7]"
      style={SCREEN}
    >
      {run?.state === "starting" && <Starting run={run} />}
      {start && !starting && (
        <Button
          size="pill"
          className="nodrag absolute z-10 gap-2 shadow-[0_8px_24px_-10px_rgb(20_24_36/0.45)]"
          onClick={start}
        >
          <Play aria-hidden className="size-4 fill-current" /> {t.explore.start}
        </Button>
      )}
      <div
        className={cn(
          "flex h-36 w-[300px] flex-col gap-2.5 rounded-lg bg-card p-3.5 opacity-60 shadow-[0_1px_4px_rgb(0_0_0/0.1)]",
          starting && "motion-safe:animate-pulse",
        )}
      >
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

type Made = Extract<ThingNode["data"]["thing"], { kind: "prototype" }>;

// Where the prototype shows: on the page the change is on, with the variant
// picked (?variant=), chosen outside the app.
function shownUrl(url: string, opens: string | undefined, variant: string) {
  const address = new URL(opens ?? "", url);
  if (variant) address.searchParams.set("variant", variant);
  return address.toString();
}

// A prototype's variants (none when it is one way only) and the one shown:
// the one picked here, at once, else the one the board keeps.
function variantsOf(made: Made, picked: string | null) {
  const variants =
    (made.variants?.length ?? 0) > 1 ? (made.variants ?? []) : [];
  const first = variants[0]?.key ?? "";
  const variant = variants.length > 0 ? (picked ?? made.variant ?? first) : "";
  return { variants, variant };
}

// What the frame shows: the live screen (with what the kobold does, while
// it is made), the kobold at work before it runs, or Start.
function Shown({
  run,
  shown,
  title,
  at,
  start,
}: Readonly<{
  run: VersionRun | undefined;
  shown: VersionRun | undefined;
  title: string;
  at: number;
  start: (() => void) | null;
}>) {
  const live = run?.state === "running" && run.url !== null;
  if (run?.making && !live) return <Making run={run} />;
  return (
    <>
      {run?.making && <MakingLine run={run} />}
      <Screen
        run={shown}
        at={at}
        title={title}
        start={start}
        making={run?.making === true}
      />
    </>
  );
}

function shownOf(
  run: VersionRun | undefined,
  opens: string | undefined,
  variant: string,
): VersionRun | undefined {
  return run?.url ? { ...run, url: shownUrl(run.url, opens, variant) } : run;
}

export function PrototypeNode({ data }: NodeProps<ThingNode>) {
  const t = useT();
  const { thing, page } = data;
  const act = useBoardDo(page.exploration.id);
  const [picked, pick] = useState<string | null>(null);
  if (thing.kind !== "prototype") return null;
  const { variants, variant } = variantsOf(thing, picked);
  const run = page.runs.find((one) => one.version === thing.key);
  const open = ["waiting", "exploring"].includes(page.exploration.status);
  const shownRun = shownOf(run, thing.opens, variant);
  const about = variants.find((one) => one.key === variant);
  return (
    <Frame
      data={data}
      title={`${thing.key} · ${thing.name}`}
      glow={run?.making === true}
    >
      {variants.length > 0 && (
        <Variants
          variants={variants}
          shown={variant}
          agreed={thing.agreed ? variant : undefined}
          onPick={(key) => {
            pick(key);
            act("board", { do: { act: "show", id: thing.id, variant: key } });
          }}
        />
      )}
      <Shown
        run={run}
        shown={shownRun}
        title={`${thing.key} · ${thing.name}`}
        at={thing.key.charCodeAt(0) - 65}
        start={
          open
            ? () => {
                act("open", { key: thing.key });
              }
            : null
        }
      />
      <About
        difference={about?.difference ?? thing.difference}
        words={stateWords(run, t.explore)}
        test={page.tests[thing.key] ?? null}
      />
    </Frame>
  );
}

// How the version shown differs (and what it was changed from), what odd
// thing happened, and its last persona test.
function About({
  difference,
  words,
  test,
}: Readonly<{
  difference: string;
  words: string | null;
  test: TestResult | null;
}>) {
  const t = useT();
  const result = test ? testWords(test, t.explore.board) : null;
  return (
    <>
      <div className="text-xs text-muted-foreground">
        <Markdown text={difference} />
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

// The switch between a prototype's variants, outside the app: one segment
// each, its letter and name, a tick on the agreed one.
function Variants({
  variants,
  shown,
  agreed,
  onPick,
}: Readonly<{
  variants: NonNullable<Made["variants"]>;
  shown: string;
  agreed: string | undefined;
  onPick: (key: string) => void;
}>) {
  const t = useT();
  return (
    <div
      role="tablist"
      aria-label={t.explore.board.variants}
      className="nodrag flex flex-wrap gap-1 rounded-[10px] bg-[#f3f4f7] p-1"
    >
      {variants.map((one) => {
        const on = one.key === shown;
        return (
          <button
            key={one.key}
            type="button"
            role="tab"
            aria-selected={on}
            title={[`${one.key} · ${one.name}`, one.difference]
              .filter(Boolean)
              .join(": ")}
            onClick={() => {
              onPick(one.key);
            }}
            className={cn(
              "inline-flex h-7 max-w-[12rem] items-center gap-1.5 rounded-[7px] px-2.5 text-xs",
              on
                ? "bg-card font-semibold text-foreground shadow-[0_1px_2px_rgb(20_24_36/0.12)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="flex-none">{one.key}</span>
            <span className="truncate font-normal">{one.name}</span>
            {one.key === agreed && (
              <Check aria-hidden className="size-3 flex-none text-[#197653]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
