import { ArrowRight, Boxes, SquareKanban } from "lucide-react";
import { Fragment, useState } from "react";

import { messageOf, type PartView, post } from "@/api";
import { Accent } from "@/components/accent";
import { Arrow } from "@/components/arrow";
import { ProblemBox } from "@/components/problem-box";
import { LABEL, LIGHTS, StatusLight } from "@/components/status-light";
import { Button } from "@/components/ui/button";
import { columnsOf } from "@/lib/columns";

import type { FactoryState } from "./dashboard";
import { PartCard } from "./part-card";

// The system as a map: the products in columns, each after the products it
// needs, joined by arrows; the factory's own parts beside them; the lights'
// legend below.
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
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1 pt-2">
        <h1 className="text-[30px] font-medium tracking-[-0.02em]">
          <Heading parts={state.parts} />
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-11 rounded-xl border-0 px-4"
            onClick={() => {
              press("/api/stop-all");
            }}
          >
            Stop all
          </Button>
          <Button
            className="h-11 rounded-xl px-4"
            onClick={() => {
              press("/api/start-all");
            }}
          >
            Start all
          </Button>
        </div>
      </div>
      {problem && <ProblemBox title="That did not work" text={problem} />}
      <div className="flex flex-wrap gap-5">
        <section
          aria-label="Your products"
          className="flex min-w-0 flex-[999_1_640px] flex-col gap-[18px] rounded-3xl bg-card p-6"
        >
          <span className="text-[13px] text-muted-foreground">
            Your products
          </span>
          {products.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No products yet — add them on the{" "}
              <a
                href="#products"
                className="text-foreground underline underline-offset-2"
              >
                Products
              </a>{" "}
              tab.
            </p>
          ) : (
            <ProductMap parts={products} onPress={press} />
          )}
        </section>
        <SidePanel state={state} factory={factory} onPress={press} />
      </div>
      <div className="flex flex-wrap gap-[18px] px-1 text-[13px] text-muted-foreground">
        {LIGHTS.map((light) => (
          <span key={light} className="inline-flex items-center gap-2">
            <StatusLight light={light} /> {LABEL[light]}
          </span>
        ))}
      </div>
    </div>
  );
}

// Beside the map, on a glow: what is left to set up, then the factory's own
// parts.
function SidePanel({
  state,
  factory,
  onPress,
}: Readonly<{
  state: FactoryState;
  factory: PartView[];
  onPress: (path: string) => void;
}>) {
  const steps = nextSteps(state);
  if (steps.length === 0 && factory.length === 0) return null;
  return (
    <aside className="glow-card flex min-w-0 flex-[1_1_300px] flex-col gap-3 rounded-3xl p-6">
      {steps.length > 0 && (
        <section aria-label="Next steps" className="grid gap-3">
          <span className="text-[13px] text-muted-foreground">Next steps</span>
          {steps.map((step) => (
            <a
              key={step.href}
              href={step.href}
              className="flex items-center gap-3 rounded-2xl border border-border-soft bg-card px-4 py-3.5 hover:border-foreground/40"
            >
              <span className="flex size-8 flex-none items-center justify-center rounded-lg bg-surface-2 text-muted-foreground [&_svg]:size-4">
                {step.icon}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[15px] font-medium">{step.title}</span>
                <span className="text-xs text-muted-foreground">
                  {step.text}
                </span>
              </span>
              <ArrowRight
                className="size-4 text-muted-foreground"
                aria-hidden
              />
            </a>
          ))}
        </section>
      )}
      {factory.length > 0 && (
        <section aria-label="The factory" className="grid gap-3">
          <span className="text-[13px] text-muted-foreground">The factory</span>
          {factory.map((part) => (
            <PartCard key={part.id} part={part} onPress={onPress} />
          ))}
        </section>
      )}
    </aside>
  );
}

// What is left to set up; each step goes once it is done.
function nextSteps(state: FactoryState) {
  const steps = [];
  if (state.products.length === 0)
    steps.push({
      href: "#products",
      icon: <Boxes aria-hidden />,
      title: "Add your products",
      text: "Make something new, or bring existing code.",
    });
  if (state.company.tracker === "none")
    steps.push({
      href: "#settings",
      icon: <SquareKanban aria-hidden />,
      title: "Connect Jira or GitHub",
      text: "Where your work is tracked.",
    });
  return steps;
}

function Heading({ parts }: Readonly<{ parts: PartView[] }>) {
  const lit = parts.filter((part) => part.light !== "none");
  if (lit.some((part) => part.light === "problem"))
    return (
      <>
        Something needs <Accent>you</Accent>
      </>
    );
  if (lit.length > 0 && lit.every((part) => part.light === "running"))
    return (
      <>
        Everything <Accent>running</Accent>
      </>
    );
  return (
    <>
      Your <Accent>system</Accent>
    </>
  );
}

function ProductMap({
  parts,
  onPress,
}: Readonly<{ parts: PartView[]; onPress: (path: string) => void }>) {
  const columns = columnsOf(parts);
  return (
    <div className="overflow-x-auto">
      <div
        className="flex items-center gap-3"
        style={{ minWidth: `${String(columns.length * 260)}px` }}
      >
        {columns.map((column, index) => (
          <Fragment key={column[0]?.id ?? index}>
            {index > 0 && <Arrow />}
            <div className="flex flex-1 flex-col gap-3">
              {column.map((part) => (
                <PartCard key={part.id} part={part} onPress={onPress} />
              ))}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
