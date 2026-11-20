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
import { PageHead } from "@/components/page-head";
import { columnsOf } from "@/lib/columns";

import type { FactoryState } from "./dashboard";
import { LayerMap } from "./layer-map";
import { PartCard } from "./part-card";

// System: what the product is made of, as a map of its parts in layers
// (what people open, what works behind, where data lives) joined by lines
// to the parts each needs, with its light and its buttons in its box; how it is
// doing in a line, Start all and Stop all. The factory's own programs are
// in Settings (FactoryPrograms).
export function SystemPage({ state }: Readonly<{ state: FactoryState }>) {
  const [problem, setProblem] = useState<string | null>(null);
  const press = usePress(setProblem);
  const products = state.parts.filter((part) => part.area === "products");
  const top = headline(products);
  return (
    <>
      <PageHead
        title="System"
        about="What your product is made of and how its parts connect. Start, stop and open them here."
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
      />
      <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-foreground-2">
        <StatusLight light={top.light} />
        <span className="min-w-0 flex-1">{top.text}</span>
      </div>
      {problem && <ProblemBox title="That did not work" text={problem} />}
      {products.length >= 2 ? (
        <AreaCard title="Your product">
          <LayerMap parts={products} onPress={press} />
        </AreaCard>
      ) : (
        <AreaCard title="Example: a made-up product">
          <p className="text-xs text-muted-foreground">
            Your product has too few parts for a map yet, so here is how one
            looks with made-up parts. Its buttons do nothing.
          </p>
          <LayerMap parts={EXAMPLE} onPress={() => undefined} />
        </AreaCard>
      )}
      <Legend />
    </>
  );
}

// The factory's own programs (the builder, the board's reading, …), with
// their lights and buttons: on Settings, out of the product's way.
export function FactoryPrograms({ state }: Readonly<{ state: FactoryState }>) {
  const [problem, setProblem] = useState<string | null>(null);
  const press = usePress(setProblem);
  const factory = state.parts.filter((part) => part.area === "factory");
  if (factory.length === 0) return null;
  return (
    <>
      {problem && <ProblemBox title="That did not work" text={problem} />}
      <Area
        title="The factory's own programs"
        parts={factory}
        onPress={press}
      />
    </>
  );
}

function usePress(setProblem: (problem: string | null) => void) {
  return (path: string) => {
    setProblem(null);
    post(path).catch((error: unknown) => {
      setProblem(messageOf(error));
    });
  };
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
  actions,
  parts,
  onPress,
  children,
}: Readonly<{
  title: string;
  // Buttons at its top right.
  actions?: React.ReactNode;
  parts: PartView[];
  onPress: (path: string) => void;
  // Shown while the area has no parts.
  children?: React.ReactNode;
}>) {
  if (parts.length === 0 && !children) return null;
  return (
    <AreaCard title={title} actions={actions}>
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

// An area's frame: a card with its title.
function AreaCard({
  title,
  actions,
  children,
}: Readonly<{
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}>) {
  return (
    <Card aria-label={title} className="gap-3 py-4 shadow-soft">
      <CardHeader className="px-4">
        <CardTitle className="text-[13px] font-semibold">{title}</CardTitle>
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
      text: "No parts to run yet: they come with your first idea.",
    };
  if (problems > 0)
    return {
      light: "problem",
      text: `${problems === 1 ? "One part" : String(problems) + " parts"} could not start: the card says why and what to do.`,
    };
  if (lit.some((part) => part.light === "starting"))
    return { light: "starting", text: "Starting your product…" };
  if (lit.every((part) => part.light === "running"))
    return {
      light: "running",
      text: "Everything is running: open it to try it.",
    };
  if (lit.some((part) => part.light === "running"))
    return {
      light: "stopped",
      text: "Some parts are running: start the others to try everything.",
    };
  return {
    light: "stopped",
    text: "Your product is not running. Start it to try it on this computer.",
  };
}

// Made-up parts, for the map while the product has too few of its own.
const EXAMPLE: PartView[] = [
  example("shop", "Shop", "The shop people buy from.", ["orders-api", "design-kit", "files"], "running", true),
  example("back-office", "Back office", "Where the team handles orders.", ["orders-api", "payments", "design-kit"], "stopped", true),
  example("orders-api", "Orders server", "Takes and keeps the orders.", ["database", "payments"], "running"),
  example("payments", "Payments", "Talks to the payment provider.", ["database"], "running"),
  example("design-kit", "Design kit", "Buttons and pages both screens share.", [], "none", false, "with"),
  example("database", "Database", "Where orders and customers are kept.", [], "running", false, "never"),
  example("files", "File storage", "Product photos.", [], "stopped", false, "never"),
];

function example(
  id: string,
  name: string,
  does: string,
  dependsOn: string[],
  light: PartView["light"],
  opens = false,
  start: PartView["start"] = "auto",
): PartView {
  return {
    id,
    name,
    area: "products",
    does,
    dependsOn,
    start,
    light,
    step: null,
    problem: null,
    link: opens ? "#system" : null,
    canStart: false,
    canStop: false,
    outside: false,
  };
}
