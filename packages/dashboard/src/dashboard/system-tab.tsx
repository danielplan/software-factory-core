import { Fragment, useState } from "react";

import { messageOf, type PartView, post } from "@/api";
import { Arrow } from "@/components/arrow";
import { ProblemBox } from "@/components/problem-box";
import { LABEL, LIGHTS, StatusLight } from "@/components/status-light";
import { Button } from "@/components/ui/button";
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
      <div className="flex flex-wrap items-center gap-3 px-1 pt-2">
        <h1 className="inline-flex items-center gap-2.5 text-[22px] font-medium tracking-[-0.01em]">
          <StatusLight light={top.light} />
          {top.text}
        </h1>
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
      <NextSteps state={state} />
      <div className="grid items-start gap-4 lg:grid-cols-[2.3fr_1.5fr]">
        <Area title="Your products" parts={products} onPress={press}>
          <p className="py-6 text-center text-sm text-muted-foreground">
            No products yet: describe what you want to build on the{" "}
            <a
              href="#board"
              className="text-foreground underline underline-offset-2"
            >
              Board
            </a>{" "}
            tab.
          </p>
        </Area>
        <FactoryArea state={state} parts={factory} onPress={press} />
      </div>
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
          {state.parts.map((part) => (
            <div key={part.id} className="contents">
              <dt className="font-medium">{part.name}</dt>
              <dd className="text-muted-foreground">{part.does}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}

// One area of the factory, framed: its parts in columns, each after the
// parts it needs, joined by arrows (down on a phone).
function Area({
  title,
  parts,
  onPress,
  children,
}: Readonly<{
  title: string;
  parts: PartView[];
  onPress: (path: string) => void;
  // Shown while the area has no parts.
  children?: React.ReactNode;
}>) {
  if (parts.length === 0 && !children) return null;
  return (
    <section
      aria-label={title}
      className="grid gap-3 rounded-3xl bg-card p-4 shadow-soft"
    >
      <h2 className="px-1 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        {title}
      </h2>
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
    </section>
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
  const ready = state.ideas.filter((idea) => idea.status === "ready").length;
  const components = [
    { name: "Dashboard", text: "Running: this page", light: "running" },
    {
      name: "Ideas",
      text: `${String(state.ideas.length)} ideas, ${String(ready)} ready`,
      light: "running",
      href: "#board",
    },
    {
      name: "Where work is tracked",
      text: TRACKER_NAMES[state.company.tracker],
      light: state.company.tracker === "none" ? "stopped" : "running",
      href: "#settings",
    },
    { name: "Builder", text: "Builds ready ideas: comes next", light: "none" },
  ] as const;
  return (
    <section
      aria-label="The factory"
      className="grid gap-3 rounded-3xl bg-card p-4 shadow-soft"
    >
      <h2 className="px-1 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        The factory
      </h2>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {components.map((one) => {
          const inner = (
            <>
              <span className="flex items-center gap-2 text-sm font-medium">
                <StatusLight light={one.light} /> {one.name}
              </span>
              <span className="text-xs text-muted-foreground">{one.text}</span>
            </>
          );
          const look =
            "grid gap-1 rounded-xl border border-border-soft bg-surface px-3 py-2.5";
          return "href" in one ? (
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
    </section>
  );
}

// What is left to set up, in a line; each goes once it is done.
function NextSteps({ state }: Readonly<{ state: FactoryState }>) {
  const steps = [
    ...(state.products.length === 0
      ? [{ href: "#board", text: "Start your first product" }]
      : []),
    ...(state.company.tracker === "none"
      ? [{ href: "#settings", text: "Connect Jira or GitHub" }]
      : []),
  ];
  if (steps.length === 0) return null;
  return (
    <p className="flex flex-wrap items-center gap-2 px-1 text-sm text-muted-foreground">
      Next:
      {steps.map((step) => (
        <a
          key={step.href}
          href={step.href}
          className="rounded-full bg-card px-3 py-1 text-foreground shadow-soft hover:bg-surface-2"
        >
          {step.text}
        </a>
      ))}
    </p>
  );
}

// The factory's light and line: a problem first, then starting, then all
// running.
function headline(parts: PartView[]): {
  light: PartView["light"];
  text: string;
} {
  const lit = parts.filter((part) => part.light !== "none");
  const problems = lit.filter((part) => part.light === "problem").length;
  if (problems > 0)
    return {
      light: "problem",
      text:
        problems === 1
          ? "One part needs you"
          : `${String(problems)} parts need you`,
    };
  if (lit.some((part) => part.light === "starting"))
    return { light: "starting", text: "Starting…" };
  if (lit.length > 0 && lit.every((part) => part.light === "running"))
    return { light: "running", text: "Everything is running" };
  return { light: "stopped", text: "Ready to start" };
}
