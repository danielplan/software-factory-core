// A prototype on the board: its variants (a choice's options, other ways)
// switched on top, outside the app, and its screen below, always the same
// size: the live app while it runs (on its branch, on the page the change
// is on, with the variant picked; at a desktop's size, shrunk; Bigger opens
// it full size), being made, or a sketch with Start in its middle; how the
// variant differs, what odd thing happened, and its last persona test.
// Agreeing (the badge on its bar) agrees to the variant shown.

import { Link } from "react-router";
import type { TFunction } from "i18next";
import type { NodeProps } from "@xyflow/react";
import { Check, Play } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { TestResult, VersionRun } from "@/api/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Frame, useBoardDo } from "./frame";
import {
  CouldNot,
  madeUpStart,
  MadeUpScreen,
  TinkerLine,
  useMadeUpStart,
} from "./made-up-start";
import { Making, MakingLine } from "./prototype-making";
import { Starting } from "./prototype-starting";
import { States } from "./prototype-states";
import { Segment, ShownVariant, SwitchRow } from "./prototype-switches";
import { LiveScreen, SCREEN } from "./prototype-screen";
import type { ThingNode } from "./nodes";

const TINTS = ["#cfe0ff", "#ffd6e2", "#d6f2e7"];

function stateWords(run: VersionRun | undefined, t: TFunction): string | null {
  if (!run) return null;
  if (run.state === "starting") return t("explore.starting");
  if (run.state === "failed") return run.problem ?? t("explore.board.stopped");
  // Running or stopped: what is odd about it (not shared with the team).
  return run.problem;
}

function testWords(
  test: TestResult,
  b: TFunction,
): { words: string; dot: string } {
  if (test.status === "done")
    return {
      words: b("explore.board.stepsAsExpected", {
        good: test.asExpected,
        all: test.steps,
      }),
      dot: test.asExpected === test.steps ? "bg-success" : "bg-destructive",
    };
  if (test.status === "failed")
    return { words: b("explore.board.testUnfinished"), dot: "bg-faint" };
  return { words: b("explore.board.testing"), dot: "bg-blue" };
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
  const t = useTranslation().t;
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
          <Play aria-hidden className="size-4 fill-current" />{" "}
          {t("explore.start")}
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

// What the frame shows: the live screen (with what the kobold does, while
// it is made), the kobold at work before it runs, or Start.
function Shown({
  run,
  shown,
  title,
  at,
  start,
  madeUp = false,
}: Readonly<{
  run: VersionRun | undefined;
  shown: VersionRun | undefined;
  title: string;
  at: number;
  start: (() => void) | null;
  // Variant D, running: the made-up screen stands in for the app.
  madeUp?: boolean;
}>) {
  if (madeUp) return <MadeUpScreen style={SCREEN} />;
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
  picked: Picked,
): VersionRun | undefined {
  return run?.url ? { ...run, url: shownUrl(run.url, opens, picked) } : run;
}

export function PrototypeNode({ data }: NodeProps<ThingNode>) {
  const t = useTranslation().t;
  const { thing, page } = data;
  const act = useBoardDo(page.exploration.id);
  const [picked, pick] = useState<string | null>(null);
  const [state, setState] = useState("");
  const made = useMadeUpStart(thing.kind === "prototype" ? thing.key : "");
  if (thing.kind !== "prototype") return null;
  const { variants, variant, agreed } = variantsOf(thing, picked);
  const madeUp = madeUpStart(page.canRun);
  const run = madeUp
    ? made.run
    : page.runs.find((one) => one.version === thing.key);
  const open = ["waiting", "exploring"].includes(page.exploration.status);
  const shownRun = shownOf(run, thing.opens, { variant, state });
  const about = variants.find((one) => one.key === variant);
  return (
    <Frame
      data={data}
      title={thing.name}
      tag={thing.key}
      glow={run?.making === true}
    >
      {variants.length > 0 && (
        <Variants
          variants={variants}
          shown={variant}
          agreed={agreed}
          onPick={(key) => {
            pick(key);
            act("board", { do: { act: "show", id: thing.id, variant: key } });
          }}
        />
      )}
      <ShownVariant
        letter={about?.key}
        name={about?.name}
        difference={about?.difference ?? thing.difference}
      />
      <States states={thing.states ?? []} shown={state} onPick={setState} />
      <Shown
        run={run}
        shown={shownRun}
        title={`${thing.key} · ${thing.name}`}
        at={thing.key.charCodeAt(0) - 65}
        madeUp={madeUp && made.running}
        start={
          open && !(madeUp && made.problem)
            ? () => {
                if (madeUp) made.start();
                else act("open", { key: thing.key });
              }
            : null
        }
      />
      {madeUp && made.line && <TinkerLine />}
      {madeUp && made.problem && <CouldNot retry={made.start} />}
      <About words={stateWords(run, t)} test={page.tests[thing.key] ?? null} />
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
  const t = useTranslation().t;
  const result = test ? testWords(test, t) : null;
  return (
    <>
      {words && <div className="text-xs text-foreground-2">{words}</div>}
      {test && result && (
        <Link
          className="nodrag flex gap-1.5 text-xs"
          to={`/personas/${encodeURIComponent(test.persona)}/tests/${test.id}`}
        >
          <span
            className={cn("mt-[5px] size-2 flex-none rounded-full", result.dot)}
          />
          {result.words}
        </Link>
      )}
    </>
  );
}

// The switch between a prototype's variants, outside the app: one short
// segment each, its letter (its name on hover and under the switch), a tick
// on the agreed one. Once one is agreed, the others are archived behind a
// "+N" segment that shows them again; nothing is removed.
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
  const b = useTranslation().t;
  const [all, showAll] = useState(false);
  const archived = agreed !== undefined && !all;
  const listed = archived
    ? variants.filter((one) => one.key === agreed)
    : variants;
  const others = variants.length - 1;
  return (
    <SwitchRow label={b("explore.board.variant")} role="tablist">
      {listed.map((one) => (
        <Segment
          key={one.key}
          role="tab"
          on={one.key === shown}
          title={[`${one.key} · ${one.name}`, one.difference]
            .filter(Boolean)
            .join(": ")}
          onPick={() => {
            onPick(one.key);
          }}
        >
          {one.key}
          {one.key === agreed && (
            <Check aria-hidden className="size-3 flex-none text-[#197653]" />
          )}
        </Segment>
      ))}
      {agreed !== undefined && others > 0 && (
        <Segment
          on={false}
          title={
            archived
              ? b("explore.board.showArchived", { n: others })
              : b("explore.board.hideArchived")
          }
          onPick={() => {
            showAll(archived);
          }}
        >
          {archived ? `+${String(others)}` : "−"}
        </Segment>
      )}
    </SwitchRow>
  );
}
