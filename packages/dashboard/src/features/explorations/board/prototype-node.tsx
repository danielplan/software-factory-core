// A prototype on the board: its screen, always the same size, with its
// variants (a choice's options, other ways) and made-up data switched
// outside the app, in a toolbar, a tab bar or a row at its foot (see
// prototype-layout.ts): the live app while it runs (on its branch, on the page the change
// is on, with the variant picked; at a desktop's size, shrunk; Bigger opens
// it full size), being made, or a sketch with Start in its middle; how the
// variant differs, what odd thing happened, and its last persona test.
// Agreeing (the badge on its bar) agrees to the variant shown.

import type { NodeProps } from "@xyflow/react";
import { Play } from "lucide-react";
import { useState } from "react";

import type { TestResult, VersionRun } from "@/api/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Frame, useBoardDo } from "./frame";
import { MADE_UP_ID } from "./made-up-page";
import { layoutOf } from "./prototype-layout";
import { Making, MakingStatus } from "./prototype-making";
import { Starting } from "./prototype-starting";
import { hasSwitches, TabBar, Toolbar } from "./prototype-switches";
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
  // Starting says itself, on the screen.
  if (run.state === "starting") return null;
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
function shownUrl(url: string, opens: string | undefined, picked: Picked) {
  const address = new URL(opens ?? "", url);
  if (picked.variant) address.searchParams.set("variant", picked.variant);
  if (picked.state) address.searchParams.set("state", picked.state);
  return address.toString();
}

type Picked = { variant: string; state: string };

// A prototype's variants (none when it is one way only) and the one shown:
// the one picked here, at once, else the one the board keeps.
function variantsOf(made: Made, picked: string | null) {
  const variants =
    (made.variants?.length ?? 0) > 1 ? (made.variants ?? []) : [];
  const first = variants[0]?.key ?? "";
  const variant = variants.length > 0 ? (picked ?? made.variant ?? first) : "";
  // The agreed one: the variant the board keeps, once the prototype is agreed.
  const agreed = made.agreed ? (made.variant ?? variant) : undefined;
  return { variants, variant, agreed };
}

// What the frame shows: the live screen (usable while it is made), the page
// drawing itself before it runs, or Start. What the kobold does is said once,
// in its status, never here.
function Shown({
  run,
  shown,
  title,
  at,
  start,
  joined,
}: Readonly<{
  run: VersionRun | undefined;
  shown: VersionRun | undefined;
  title: string;
  at: number;
  start: (() => void) | null;
  // The screen is joined to the switches on this side: square corners there.
  joined?: "top" | "bottom";
}>) {
  const live = run?.state === "running" && run.url !== null;
  return (
    <div
      className={cn(
        "grid",
        joined === "top" && "[&>*]:rounded-t-none",
        joined === "bottom" && "[&>*]:rounded-b-none",
      )}
    >
      {run?.making && !live ? (
        <Making />
      ) : (
        <Screen
          run={shown}
          at={at}
          title={title}
          start={start}
          making={run?.making === true}
        />
      )}
    </div>
  );
}

function shownOf(
  run: VersionRun | undefined,
  opens: string | undefined,
  picked: Picked,
): VersionRun | undefined {
  return run?.url ? { ...run, url: shownUrl(run.url, opens, picked) } : run;
}

export function PrototypeNode({ data }: NodeProps<ThingNode>) {
  const t = useT();
  const { thing, page } = data;
  const act = useBoardDo(page.exploration.id);
  const [picked, pick] = useState<string | null>(null);
  const [state, setState] = useState("");
  if (thing.kind !== "prototype") return null;
  const { variants, variant, agreed } = variantsOf(thing, picked);
  const run = page.runs.find((one) => one.version === thing.key);
  const open = ["waiting", "exploring"].includes(page.exploration.status);
  const shownRun = shownOf(run, thing.opens, { variant, state });
  const about = variants.find((one) => one.key === variant);
  const layout = layoutOf();
  const switches = {
    variants,
    shown: variant,
    agreed,
    onPick: (key: string) => {
      pick(key);
      // The made-up exploration is not on the server: nothing to tell it.
      if (page.exploration.id === MADE_UP_ID) return;
      act("board", { do: { act: "show", id: thing.id, variant: key } });
    },
    states: thing.states ?? [],
    state,
    onState: setState,
  };
  const bar = hasSwitches(switches);
  const status = run?.making ? <MakingStatus run={run} /> : null;
  const screen = (joined?: "top" | "bottom") => (
    <Shown
      run={run}
      shown={shownRun}
      title={`${thing.key} · ${thing.name}`}
      at={thing.key.charCodeAt(0) - 65}
      joined={joined}
      start={
        open
          ? () => {
              act("open", { key: thing.key });
            }
          : null
      }
    />
  );
  return (
    <Frame
      data={data}
      title={thing.name}
      tag={thing.key}
      glow={run?.making === true}
      status={layout === "B" ? null : status}
    >
      {layout === "A" && bar && <Toolbar {...switches} />}
      {layout === "B" && bar && <TabBar {...switches} status={status} />}
      {layout === "B" && !bar && status}
      {layout === "C" ? (
        <div className="grid">
          {screen(bar ? "bottom" : undefined)}
          {bar && <Toolbar {...switches} joined="bottom" />}
        </div>
      ) : (
        screen(layout === "B" && bar ? "top" : undefined)
      )}
      <About
        words={stateWords(run, t.explore)}
        test={page.tests[thing.key] ?? null}
      />
    </Frame>
  );
}

// What odd thing happened, and its last persona test.
function About({
  words,
  test,
}: Readonly<{
  words: string | null;
  test: TestResult | null;
}>) {
  const t = useT();
  const result = test ? testWords(test, t.explore.board) : null;
  return (
    <>
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
