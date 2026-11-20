import { useState } from "react";

import { messageOf, type PartView, post } from "@/api";
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
import { type Links, type Mark, PartCard } from "./part-card";

// System: what the product is made of, as a map of its parts, each after
// the parts it needs and saying its links, with its light and its buttons in its box; how it is
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
      <Area title="Your product" parts={products} onPress={press}>
        <p className="py-6 text-center text-[13px] text-muted-foreground">
          No parts to run yet: they come with your first idea, on the{" "}
          <a
            href="#explore"
            className="text-foreground underline underline-offset-2"
          >
            Explorations
          </a>{" "}
          page.
        </p>
      </Area>
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
// parts it needs. Each card says what it needs and what uses it; under the
// pointer, its partners light up and the others fade.
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
  const [pointed, setPointed] = useState<string | null>(null);
  if (parts.length === 0 && !children) return null;
  const linksOf = linksIn(parts);
  const markOf = (part: PartView): Mark => {
    if (pointed === null) return null;
    if (part.id === pointed) return "self";
    const links = linksOf.get(pointed);
    if (links?.needIds.includes(part.id)) return "needs";
    if (links?.usedByIds.includes(part.id)) return "usedBy";
    return "apart";
  };
  return (
    <AreaCard title={title} actions={actions}>
      {parts.length === 0 ? (
        children
      ) : (
        <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:gap-3">
          {columnsOf(parts).map((column, index) => (
            <div
              key={column[0]?.id ?? index}
              className="grid min-w-0 flex-1 content-center gap-2.5"
            >
              {column.map((part) => (
                <PartCard
                  key={part.id}
                  part={part}
                  onPress={onPress}
                  links={linksOf.get(part.id)}
                  mark={markOf(part)}
                  onPoint={setPointed}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </AreaCard>
  );
}

// Each part's links within the area: the parts it needs and the parts that
// need it, by id and by name.
function linksIn(
  parts: PartView[],
): Map<string, Links & { needIds: string[]; usedByIds: string[] }> {
  const byId = new Map(parts.map((part) => [part.id, part]));
  return new Map(
    parts.map((part) => {
      const needIds = part.dependsOn.filter((id) => byId.has(id));
      const usedByIds = parts
        .filter((other) => other.dependsOn.includes(part.id))
        .map((other) => other.id);
      const names = (ids: string[]) =>
        ids.map((id) => byId.get(id)?.name ?? id);
      return [
        part.id,
        { needIds, usedByIds, needs: names(needIds), usedBy: names(usedByIds) },
      ];
    }),
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
