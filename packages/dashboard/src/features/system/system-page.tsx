import { Link } from "react-router";
import type { TFunction } from "i18next";
import { Play, Square } from "lucide-react";
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  type FactoryState,
  messageOf,
  type PartView,
  post,
} from "@/api/client";
import { Arrow } from "@/components/arrow";
import { ProblemBox } from "@/components/layout/problem-box";
import { LIGHTS, StatusLight } from "@/components/status-light";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHead } from "@/components/layout/page-head";

import { columnsOf } from "./columns";

import { PartCard } from "./part-card";
import { SystemMap } from "./system-map";

// System: what the product is made of, as a map of its parts with a line to
// each part that needs it, each with its type, its light and its buttons in
// its box; how it is
// doing in a line, Start all and Stop all. The factory's own programs are
// in Settings (FactoryPrograms).
export function SystemPage({ state }: Readonly<{ state: FactoryState }>) {
  const [problem, setProblem] = useState<string | null>(null);
  const press = usePress(setProblem);
  const t = useTranslation().t;
  const s = t;
  const products = state.parts.filter((part) => part.area === "products");
  const top = headline(products, s);
  return (
    <>
      <PageHead
        title={t("shell.pages.system")}
        about={s("system.about")}
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
                <Play aria-hidden />
                {s("system.startAll")}
              </Button>
              <Button
                variant="outline"
                className="h-9 px-3.5 text-[13px]"
                onClick={() => {
                  press("/api/stop-all");
                }}
              >
                <Square aria-hidden />
                {s("system.stopAll")}
              </Button>
            </>
          )
        }
      />
      <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-foreground-2">
        <StatusLight light={top.light} />
        <span className="min-w-0 flex-1">{top.text}</span>
      </div>
      {problem && <ProblemBox title={s("system.didNotWork")} text={problem} />}
      <Area
        title={s("system.yourProduct")}
        parts={products}
        onPress={press}
        map
      >
        <p className="py-6 text-center text-[13px] text-muted-foreground">
          {s("system.noPartsBefore")}{" "}
          <Link
            to="/explore"
            className="text-foreground underline underline-offset-2"
          >
            {t("shell.pages.explore")}
          </Link>
          {s("system.noPartsAfter")}
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
  const s = useTranslation().t;
  const factory = state.parts.filter((part) => part.area === "factory");
  if (factory.length === 0) return null;
  return (
    <>
      {problem && <ProblemBox title={s("system.didNotWork")} text={problem} />}
      <Area title={s("system.programs")} parts={factory} onPress={press} />
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
  const t = useTranslation().t;
  return (
    <>
      <div className="flex flex-wrap gap-4 px-1 text-xs text-muted-foreground">
        {LIGHTS.map((light) => (
          <span key={light} className="inline-flex items-center gap-1.5">
            <StatusLight light={light} /> {t(`shell.lights.${light}`)}
          </span>
        ))}
      </div>
    </>
  );
}

// One area of the factory, framed: its parts in columns, each after the
// parts it needs, joined by arrows (down on a phone); or, as a map, each
// part a box with a line to each part that needs it.
function Area({
  title,
  actions,
  parts,
  onPress,
  map = false,
  children,
}: Readonly<{
  title: string;
  // Buttons at its top right.
  actions?: React.ReactNode;
  parts: PartView[];
  onPress: (path: string) => void;
  // Drawn as a map, with a line for each part another one needs.
  map?: boolean;
  // Shown while the area has no parts.
  children?: React.ReactNode;
}>) {
  if (parts.length === 0 && !children) return null;
  return (
    <AreaCard title={title} actions={actions}>
      {parts.length === 0 ? (
        children
      ) : (
        <AreaParts parts={parts} onPress={onPress} map={map} />
      )}
    </AreaCard>
  );
}

// An area's parts: as a map, or in columns.
function AreaParts({
  parts,
  onPress,
  map,
}: Readonly<{
  parts: PartView[];
  onPress: (path: string) => void;
  map: boolean;
}>) {
  if (map) return <SystemMap parts={parts} onPress={onPress} />;
  return (
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
function headline(
  parts: PartView[],
  says: TFunction,
): {
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
      text: says("system.headline.none"),
    };
  if (problems > 0)
    return {
      light: "problem",
      text: says("system.headline.problem", { count: problems }),
    };
  if (lit.some((part) => part.light === "starting"))
    return { light: "starting", text: says("system.headline.starting") };
  if (lit.every((part) => part.light === "running"))
    return {
      light: "running",
      text: says("system.headline.running"),
    };
  if (lit.some((part) => part.light === "running"))
    return {
      light: "stopped",
      text: says("system.headline.some"),
    };
  return {
    light: "stopped",
    text: says("system.headline.stopped"),
  };
}
