// A page or a Home block of a team's own extension, drawn by Kobble's page in
// its own look from the description the extension gave (text and lists), so
// a team's page looks and behaves like the rest and cannot change how it works.

import {
  Calendar,
  ChartColumn,
  CircleCheck,
  Flag,
  List,
  Puzzle,
  Star,
  StickyNote,
} from "lucide-react";
import type { ReactNode } from "react";

import type { ShownPart, ShownView } from "@/api/client";
import { PageHead } from "@/components/layout/page-head";
import { Card } from "@/components/ui/card";
import { useT } from "@/i18n/use-t";

// The icons a description may name (the core's VIEW_ICONS); another is a puzzle piece.
const ICONS: Record<string, ReactNode> = {
  list: <List aria-hidden />,
  check: <CircleCheck aria-hidden />,
  flag: <Flag aria-hidden />,
  calendar: <Calendar aria-hidden />,
  chart: <ChartColumn aria-hidden />,
  note: <StickyNote aria-hidden />,
  star: <Star aria-hidden />,
};

export const iconOf = (name: string): ReactNode =>
  Object.hasOwn(ICONS, name) ? ICONS[name] : <Puzzle aria-hidden />;

function Text({
  part,
}: Readonly<{ part: Extract<ShownPart, { show: "text" }> }>) {
  return (
    <div className="grid gap-1.5 px-4 py-3.5">
      {part.title && <h2 className="text-[13px] font-medium">{part.title}</h2>}
      {part.text.split(/\n\s*\n/).map((paragraph) => (
        <p key={paragraph} className="text-[13px] text-foreground-2">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function Items({
  part,
}: Readonly<{ part: Extract<ShownPart, { show: "list" }> }>) {
  const t = useT().market.screen;
  return (
    <div>
      {part.title && (
        <h2 className="px-4 pt-3.5 pb-1 text-[13px] font-medium">
          {part.title}
        </h2>
      )}
      {part.items.length === 0 ? (
        <p className="px-4 py-3.5 text-[13px] text-muted-foreground">
          {part.empty ?? t.emptyList}
        </p>
      ) : (
        <ul>
          {part.items.map((item, at) => (
            <li
              key={`${item.title}-${String(at)}`}
              className="flex items-center gap-3 border-t border-line-soft px-4 py-2.5 first:border-t-0"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px]">{item.title}</span>
                {item.about && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.about}
                  </span>
                )}
              </span>
              {item.tag && (
                <span className="rounded-md bg-wash px-1.5 py-0.5 text-[11px] font-medium text-wash-foreground">
                  {item.tag}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// The parts one under the other, each on a card of its own.
export function ScreenParts({ view }: Readonly<{ view: ShownView }>) {
  return (
    <>
      {view.parts.map((part, at) => (
        <Card
          key={`${part.show}-${String(at)}`}
          className="gap-0 overflow-hidden py-0 shadow-soft"
        >
          {part.show === "text" ? <Text part={part} /> : <Items part={part} />}
        </Card>
      ))}
    </>
  );
}

// The parts of a Home block, one under the other in the block's own card.
export function BlockParts({ view }: Readonly<{ view: ShownView }>) {
  return (
    <div className="divide-y divide-line-soft">
      {view.parts.map((part, at) =>
        part.show === "text" ? (
          <Text key={`text-${String(at)}`} part={part} />
        ) : (
          <Items key={`list-${String(at)}`} part={part} />
        ),
      )}
    </div>
  );
}

// A page of an extension: its title and line, then its parts.
export function TeamPage({
  view,
  by,
}: Readonly<{ view: ShownView; by: string }>) {
  const t = useT().market.screen;
  return (
    <>
      <PageHead title={view.name} about={view.about ?? t.from(by)} />
      <ScreenParts view={view} />
    </>
  );
}
