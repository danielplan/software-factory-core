import { Hammer, LayoutDashboard, Lightbulb, SquareKanban } from "lucide-react";
import { Fragment, useState } from "react";

import { messageOf, type PartView, post } from "@/api";
import { Arrow } from "@/components/arrow";
import { ProblemBox } from "@/components/problem-box";
import { LABEL, LIGHTS, StatusLight } from "@/components/status-light";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { columnsOf } from "@/lib/columns";
import { TRACKER_NAMES } from "@/setup/draft";

import type { FactoryState } from "./dashboard";
import { PartCard } from "./part-card";

// The factory at a glance: how it is doing in a line, then its components
// in two areas side by side, the products and the factory itself,
// each a map of parts after the parts they need; what is left to set up,
// the lights, and what each part does.
export function SystemTab({ state }: Readonly<{ state: FactoryState }>) {
  const [problem, setProblem] = useState<string | null>(null);
  const press = (path: string) => {
    setProblem(null);
    post(path).catch((error: unknown) => {
      setProblem(messageOf(error));
    });
  };
  const products = state.parts.filter((part) => part.area === "products");
  const factory = state.parts.filter((part) => part.area === "factory");
  const top = headline(state.parts);
  return (
    <div className="grid content-start gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 pt-1">
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">System</h1>
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <StatusLight light={top.light} />
          {top.text}
        </span>
        <span className="flex-1" />
        <Button
          variant="outline"
          className="h-9 px-3.5 text-[13px]"
          onClick={() => {
            press("/api/start-all");
          }}
        >
          Start all
        </Button>
        <Button
          variant="outline"
          className="h-9 px-3.5 text-[13px]"
          onClick={() => {
            press("/api/stop-all");
          }}
        >
          Stop all
        </Button>
      </div>
      {problem && <ProblemBox title="That did not work" text={problem} />}
      <div className="grid items-start gap-4 lg:grid-cols-[2.3fr_1.5fr]">
        <Area
          title="Your products"
          colour="#5b7cfa"
          parts={products}
          onPress={press}
        >
          <p className="py-6 text-center text-sm text-muted-foreground">
            No products yet: describe what you want to build on the{" "}
            <a
              href="#ideas"
              className="text-foreground underline underline-offset-2"
            >
              Ideas
            </a>{" "}
            tab.
          </p>
        </Area>
        <FactoryArea state={state} parts={factory} onPress={press} />
      </div>
      <Legend parts={state.parts} />
    </div>
  );
}

// The lights' meaning, and what each part does (folded away).
function Legend({ parts }: Readonly<{ parts: PartView[] }>) {
  return (
    <>
      <div className="flex flex-wrap gap-4 px-1 text-xs text-muted-foreground">
        {LIGHTS.map((light) => (
          <span key={light} className="inline-flex items-center gap-1.5">
            <StatusLight light={light} /> {LABEL[light]}
          </span>
        ))}
      </div>
      <details className="rounded-2xl bg-card px-5 py-3">
        <summary className="cursor-pointer text-sm font-medium">
          What each part does
        </summary>
        <dl className="mt-3 mb-1 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[12rem_1fr]">
          {parts.map((part) => (
            <div key={part.id} className="contents">
              <dt className="font-medium">{part.name}</dt>
              <dd className="text-muted-foreground">{part.does}</dd>
            </div>
          ))}
        </dl>
      </details>
    </>
  );
}

// One area of the factory, framed: its parts in columns, each after the
// parts it needs, joined by arrows (down on a phone).
function Area({
  title,
  colour,
  parts,
  onPress,
  children,
}: Readonly<{
  title: string;
  colour: string;
  parts: PartView[];
  onPress: (path: string) => void;
  // Shown while the area has no parts.
  children?: React.ReactNode;
}>) {
  if (parts.length === 0 && !children) return null;
  return (
    <AreaCard title={title} colour={colour}>
      {parts.length === 0 ? (
        children
      ) : (
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:gap-0">
          {columnsOf(parts).map((column, index) => (
            <Fragment key={column[0]?.id ?? index}>
              {index > 0 && (
                <span className="mx-2 flex rotate-90 self-center sm:rotate-0">
                  <Arrow />
                </span>
              )}
              <div className="grid min-w-0 flex-1 content-center gap-2.5">
                {column.map((part) => (
                  <PartCard key={part.id} part={part} onPress={onPress} />
                ))}
              </div>
            </Fragment>
          ))}
        </div>
      )}
    </AreaCard>
  );
}

// An area's frame: a card with its title in the area's colour.
function AreaCard({
  title,
  colour,
  children,
}: Readonly<{ title: string; colour: string; children: React.ReactNode }>) {
  return (
    <Card aria-label={title} className="gap-3 py-4 shadow-soft">
      <CardHeader className="px-4">
        <CardTitle
          className="text-xs font-semibold tracking-[0.08em] uppercase"
          style={{ color: colour }}
        >
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2.5 px-4">{children}</CardContent>
    </Card>
  );
}

// The factory itself, as components: this dashboard, the ideas, where work
// is tracked and the builder (to come), then any parts it runs.
function FactoryArea({
  state,
  parts,
  onPress,
}: Readonly<{
  state: FactoryState;
  parts: PartView[];
  onPress: (path: string) => void;
}>) {
  const components = componentsOf(state);
  return (
    <AreaCard title="The factory" colour="#8b5cf6">
      <div className="grid gap-2.5 sm:grid-cols-2">
        {components.map(({ icon: Icon, ...one }) => {
          const inner = (
            <>
              <span className="flex items-center gap-2 text-sm font-medium">
                <span
                  className="flex size-7 items-center justify-center rounded-lg [&_svg]:size-4"
                  style={{
                    color: one.colour,
                    background: `color-mix(in oklab, ${one.colour} 14%, transparent)`,
                  }}
                >
                  <Icon aria-hidden />
                </span>
                {one.name}
              </span>
              <span className="text-xs text-muted-foreground">{one.text}</span>
            </>
          );
          const look =
            "grid gap-1.5 rounded-xl border border-border-soft bg-surface px-3 py-2.5";
          return one.href ? (
            <a
              key={one.name}
              href={one.href}
              className={`${look} hover:border-foreground/30`}
            >
              {inner}
            </a>
          ) : (
            <div key={one.name} className={look}>
              {inner}
            </div>
          );
        })}
      </div>
      {parts.map((part) => (
        <PartCard key={part.id} part={part} onPress={onPress} />
      ))}
    </AreaCard>
  );
}

// The factory's own components, each with its icon and colour.
function componentsOf(state: FactoryState) {
  const ready = state.ideas.filter((idea) => idea.status === "ready").length;
  return [
    {
      name: "Dashboard",
      text: "Running: this page",
      icon: LayoutDashboard,
      colour: "#5b7cfa",
    },
    {
      name: "Ideas",
      text: `${count(state.ideas.length, "idea")}, ${String(ready)} ready to build`,
      icon: Lightbulb,
      colour: "#e2a13c",
      href: "#ideas",
    },
    {
      name: "Where work is tracked",
      text: TRACKER_NAMES[state.company.tracker],
      icon: SquareKanban,
      colour: "#8b5cf6",
      href: "#settings",
    },
    {
      name: "Builder",
      text: "Builds the ideas you agree to: comes next",
      icon: Hammer,
      colour: "#64748b",
    },
  ];
}

// How the factory is doing, in a sentence that says what to do: a problem
// first, then starting, then all running, else not running yet.
function headline(parts: PartView[]): {
  light: PartView["light"];
  text: string;
} {
  const lit = parts.filter((part) => part.light !== "none");
  const problems = lit.filter((part) => part.light === "problem").length;
  if (lit.length === 0)
    return {
      light: "none",
      text: "No products to run yet: they come with your first idea.",
    };
  if (problems > 0)
    return {
      light: "problem",
      text: `${problems === 1 ? "One part" : String(problems) + " parts"} could not start: the card says why and what to do.`,
    };
  if (lit.some((part) => part.light === "starting"))
    return { light: "starting", text: "Starting your products…" };
  if (lit.every((part) => part.light === "running"))
    return {
      light: "running",
      text: "Everything is running: open a product to try it.",
    };
  return {
    light: "stopped",
    text: "Your products are not running. Start them to try them on this computer.",
  };
}

// "1 idea", "3 ideas".
function count(n: number, noun: string): string {
  return `${String(n)} ${noun}${n === 1 ? "" : "s"}`;
}
