import { Fragment, useState } from "react";

import { messageOf, type PartView, post } from "@/api";
import { Arrow } from "@/components/arrow";
import { ProblemBox } from "@/components/problem-box";
import { LABEL, LIGHTS, StatusLight } from "@/components/status-light";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { columnsOf } from "@/lib/columns";

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
      <h1 className="px-1 pt-1 text-[26px] font-semibold tracking-[-0.02em]">
        System
      </h1>
      <Card className="flex-row flex-wrap items-center gap-3 px-5 py-4 shadow-soft">
        <StatusLight light={top.light} />
        <span className="min-w-0 flex-1 text-[15px]">{top.text}</span>
      </Card>
      {problem && <ProblemBox title="That did not work" text={problem} />}
      <div className="grid gap-4">
        <Area
          title="Your products"
          colour="#5b7cfa"
          actions={
            products.length > 0 && (
              <>
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
              </>
            )
          }
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
        <Area
          title="The factory's own programs"
          colour="#8b5cf6"
          parts={factory}
          onPress={press}
        />
      </div>
      <Legend />
    </div>
  );
}

// What the lights mean.
function Legend() {
  return (
    <>
      <div className="flex flex-wrap gap-4 px-1 text-xs text-muted-foreground">
        {LIGHTS.map((light) => (
          <span key={light} className="inline-flex items-center gap-1.5">
            <StatusLight light={light} /> {LABEL[light]}
          </span>
        ))}
      </div>
    </>
  );
}

// One area of the factory, framed: its parts in columns, each after the
// parts it needs, joined by arrows (down on a phone).
function Area({
  title,
  colour,
  actions,
  parts,
  onPress,
  children,
}: Readonly<{
  title: string;
  colour: string;
  // Buttons at its top right.
  actions?: React.ReactNode;
  parts: PartView[];
  onPress: (path: string) => void;
  // Shown while the area has no parts.
  children?: React.ReactNode;
}>) {
  if (parts.length === 0 && !children) return null;
  return (
    <AreaCard title={title} colour={colour} actions={actions}>
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
  actions,
  children,
}: Readonly<{
  title: string;
  colour: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}>) {
  return (
    <Card aria-label={title} className="gap-3 py-4 shadow-soft">
      <CardHeader className="px-4">
        <CardTitle
          className="text-xs font-semibold tracking-[0.08em] uppercase"
          style={{ color: colour }}
        >
          {title}
        </CardTitle>
        {actions && <CardAction className="flex gap-2">{actions}</CardAction>}
      </CardHeader>
      <CardContent className="grid gap-2.5 px-4">{children}</CardContent>
    </Card>
  );
}

// How the factory is doing, in a sentence that says what to do: a problem
// first, then starting, then all running, else not running yet.
function headline(parts: PartView[]): {
  light: PartView["light"];
  text: string;
} {
  // A part that runs with others says nothing on its own.
  const lit = parts.filter(
    (part) => part.light !== "none" && part.start !== "with",
  );
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
  if (lit.some((part) => part.light === "running"))
    return {
      light: "stopped",
      text: "Some of your products are running: start the others to try everything.",
    };
  return {
    light: "stopped",
    text: "Your products are not running. Start them to try them on this computer.",
  };
}
