// Factory: the connected GitHub board, in four columns (To do, Building,
// Review, Done). Each card has its number and title, and either the
// exploration and prototype it was handed off from (it opens it) or a red
// Fix chip. The builder, which builds the cards in To do, has a quiet line
// and its switch in the header; "Read it again" reads the board now.
// Without a board, the page says so and leads to connecting one.
// Prototype: cards the builder got stuck on show above the board (variant
// A) or in a Stuck column before To do (variant B), made up, so they show
// even without a board; then the board shows made-up cards too.

import {
  ArrowUpRight,
  CircleAlert,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import { type FactoryView, messageOf, post } from "@/api";
import { boardOf } from "@/connect/connected-board";
import { PageHead } from "@/components/page-head";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { FactoryState } from "@/dashboard/dashboard";
import { type Read, useRead } from "@/lib/use-read";
import { cn } from "@/lib/utils";
import { VARIANT } from "@/lib/variant";
import { CARD } from "@/signals/bits";

import { Card, OpenCard } from "./board-card";
import { CardPanel } from "./card-panel";
import { COLUMN_COLOURS, ColumnIcon } from "./column-icon";
import {
  minesOf,
  STUCK_COLOUR,
  StuckCard,
  StuckList,
  type StuckState,
  useStuck,
  withMoved,
} from "./stuck-cards";
import { WaitingCards } from "./waiting-card";

export function FactoryPage({ state }: Readonly<{ state: FactoryState }>) {
  const { data, problem } = useFactoryView(state);
  const [said, say] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const stuck = useStuck();
  // Deleted cards leave the board at once; one GitHub refuses comes back.
  const [gone, setGone] = useState<number[]>([]);
  const remove = (number: number) => {
    setOpen(null);
    say(null);
    setGone((was) => [...was, number]);
    post("/api/kobble/factory/delete", { number }).then(
      () => {
        press("/api/work/refresh");
      },
      (error: unknown) => {
        setGone((was) => was.filter((one) => one !== number));
        say(messageOf(error));
      },
    );
  };
  const press = (path: string, body: object = {}) => {
    say(null);
    post(path, body).catch((error: unknown) => {
      say(messageOf(error));
    });
  };
  const href = boardOf(state)?.href ?? null;
  const shown = problem ?? said ?? data?.problem ?? null;
  return (
    <>
      <PageHead
        title="Factory"
        actions={
          data?.connected ? (
            <Builder view={data} press={press} href={href} />
          ) : undefined
        }
      />
      {shown && <ProblemBox title="That did not work" text={shown} />}
      <OpenCard value={setOpen}>
        {data && <Board view={without(data, gone)} stuck={stuck} />}
      </OpenCard>
      {open !== null && (
        <CardPanel
          number={open}
          onClose={() => {
            setOpen(null);
          }}
          onDelete={() => {
            remove(open);
          }}
        />
      )}
    </>
  );
}

// The board less the cards just deleted.
function without(view: FactoryView, gone: number[]): FactoryView {
  if (gone.length === 0) return view;
  return {
    ...view,
    columns: view.columns.map((column) => ({
      ...column,
      cards: column.cards.filter((card) => !gone.includes(card.number)),
    })),
  };
}

// What waits for the owner, then the columns.
function Board({
  view,
  stuck,
}: Readonly<{ view: FactoryView; stuck: StuckState }>) {
  // Connected, but not read yet (just started): no empty columns meanwhile.
  if (view.connected && view.read === null)
    return (
      <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <LoaderCircle aria-hidden className="size-4 animate-spin" />
        Reading the board on GitHub…
      </p>
    );
  const shown = withMoved(view.connected ? view : MADE_UP_BOARD, stuck);
  return (
    <>
      {!view.connected && <NotConnectedLine />}
      {view.connected && <WaitingCards waiting={view.waiting} />}
      {VARIANT === "A" && <StuckList stuck={stuck} />}
      <Columns view={shown} stuck={stuck} />
    </>
  );
}

// Prototype: a made-up board to try the stuck cards on without one.
const MADE_UP_BOARD: FactoryView = {
  connected: false,
  problem: null,
  read: null,
  waiting: [],
  builder: { on: true, working: null, cards: [], now: {} },
  columns: [
    {
      id: "todo",
      title: "To do",
      cards: [madeUp(223, "Export orders to a spreadsheet")],
    },
    {
      id: "building",
      title: "Building",
      cards: [madeUp(218, "Let people change their delivery address")],
    },
    {
      id: "review",
      title: "Review",
      cards: [madeUp(212, "A clearer receipt by email")],
    },
    {
      id: "done",
      title: "Done",
      cards: [madeUp(205, "Sign in with a code by email")],
    },
  ],
};

function madeUp(
  number: number,
  title: string,
): FactoryView["columns"][number]["cards"][number] {
  return { number, title, url: "", from: null, fix: false, type: null };
}

// The board's columns, side by side and the same height (the window's,
// less the page's head); each scrolls on its own. Done shows its latest
// cards, the rest under Show all.
function Columns({
  view,
  stuck,
}: Readonly<{ view: FactoryView; stuck: StuckState }>) {
  const mine = minesOf(stuck);
  const column = VARIANT === "B";
  return (
    <div
      className={cn(
        "grid gap-3 md:grid-cols-2 xl:h-[calc(100dvh-150px)] xl:min-h-[360px]",
        column ? "xl:grid-cols-5" : "xl:grid-cols-4",
      )}
    >
      {column && <StuckColumn stuck={stuck} />}
      {view.columns.map((one) => (
        <Column key={one.id} column={one} now={view.builder.now} mine={mine} />
      ))}
    </div>
  );
}

// Variant B: a fifth column, before To do, on this page only.
function StuckColumn({ stuck }: Readonly<{ stuck: StuckState }>) {
  return (
    <ColumnFrame
      title="Stuck"
      colour={STUCK_COLOUR}
      icon={
        <CircleAlert
          aria-hidden
          className="size-[15px] flex-none"
          style={{ color: STUCK_COLOUR }}
        />
      }
      count={stuck.stuck.length}
      means="The builder could not finish it"
    >
      {stuck.stuck.map((one) => (
        <StuckCard
          key={one.card.number}
          one={one}
          onMove={(to) => {
            stuck.move(one.card.number, to);
          }}
        />
      ))}
      {stuck.stuck.length === 0 && <Empty />}
    </ColumnFrame>
  );
}

const DONE_SHOWN = 6;

// What each column means, under its title.
const MEANS: Record<FactoryView["columns"][number]["id"], string> = {
  todo: "Waiting to be built",
  building: "The builder is on it",
  review: "Waiting for your review",
  done: "Merged or closed",
};

function Column({
  column,
  now,
  mine,
}: Readonly<{
  column: FactoryView["columns"][number];
  now: FactoryView["builder"]["now"];
  mine: number[];
}>) {
  const [all, setAll] = useState(false);
  const cut = column.id === "done" && !all && column.cards.length > DONE_SHOWN;
  const cards = cut ? column.cards.slice(0, DONE_SHOWN) : column.cards;
  return (
    <ColumnFrame
      title={column.title}
      colour={COLUMN_COLOURS[column.id]}
      icon={<ColumnIcon column={column.id} />}
      count={column.cards.length}
      means={MEANS[column.id]}
    >
      {cards.map((card, at) => (
        <Card
          key={card.number}
          card={card}
          at={at}
          now={now[card.number] ?? null}
          mine={mine.includes(card.number)}
        />
      ))}
      {column.cards.length === 0 && <Empty />}
      {cut && (
        <button
          type="button"
          onClick={() => {
            setAll(true);
          }}
          className="rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-card hover:text-foreground"
        >
          Show all {column.cards.length}
        </button>
      )}
    </ColumnFrame>
  );
}

function Empty() {
  return (
    <p className="rounded-lg border border-dashed border-current/15 px-3 py-4 text-center text-xs text-faint">
      Nothing here
    </p>
  );
}

// A column's frame: its title, icon and count, what it means, and its
// cards, scrolling on their own.
function ColumnFrame({
  title,
  colour,
  icon,
  count,
  means,
  children,
}: Readonly<{
  title: string;
  colour: string;
  icon: ReactNode;
  count: number;
  means: string;
  children: ReactNode;
}>) {
  return (
    <section
      aria-label={title}
      className="flex min-h-0 flex-col rounded-xl border"
      style={{
        backgroundColor: `color-mix(in srgb, ${colour} 6%, #fafafa)`,
        borderColor: `color-mix(in srgb, ${colour} 16%, #e6e6ea)`,
      }}
    >
      <header className="grid gap-0.5 px-3.5 pt-3 pb-2.5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold">
          {icon}
          <span style={{ color: colour }}>{title}</span>
          <span
            className="ml-auto grid h-5 min-w-5 place-items-center rounded-md px-1.5 text-[11px] font-semibold"
            style={{
              color: colour,
              backgroundColor: `color-mix(in srgb, ${colour} 14%, transparent)`,
            }}
          >
            {count}
          </span>
        </h2>
        <p className="pl-[23px] text-xs text-muted-foreground">{means}</p>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {children}
      </div>
    </section>
  );
}

// The builder's quiet line and switch, Read it again, and the board on
// GitHub.
function Builder({
  view,
  press,
  href,
}: Readonly<{
  view: FactoryView;
  press: (path: string, body?: object) => void;
  href: string | null;
}>) {
  const [reading, setReading] = useState(false);
  return (
    <>
      <label className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <Switch
          checked={view.builder.on}
          onCheckedChange={(on) => {
            press("/api/builder", { on });
          }}
        />
        {view.builder.working && (
          <LoaderCircle
            aria-hidden
            className="size-3.5 flex-none animate-spin text-blue"
          />
        )}
        {builderWords(view.builder)}
      </label>
      <Button
        variant="ring"
        size="pill"
        onClick={() => {
          setReading(true);
          setTimeout(() => {
            setReading(false);
          }, 900);
          press("/api/work/refresh");
        }}
      >
        <RefreshCw
          aria-hidden
          strokeWidth={2}
          className={cn("size-[15px]", reading && "animate-spin")}
        />
        Read it again
      </Button>
      {href && (
        <Button asChild variant="ring" size="pill">
          <a href={href} target="_blank" rel="noreferrer">
            Open on GitHub <ArrowUpRight aria-hidden className="size-4" />
          </a>
        </Button>
      )}
    </>
  );
}

function builderWords(builder: FactoryView["builder"]): string {
  if (builder.working) return `Building ${builder.working}`;
  return builder.on
    ? "The builder takes cards from To do"
    : "The builder is off";
}

// Prototype: without a board, a line says so above the made-up one.
function NotConnectedLine() {
  return (
    <div
      className={`${CARD} flex flex-wrap items-center justify-between gap-3 px-5 py-3`}
    >
      <p className="text-[13px] text-muted-foreground">
        No GitHub board is connected yet. The cards below are made up, to try
        the page.
      </p>
      <Button asChild size="pill">
        <a href="#connect">Connect a board</a>
      </Button>
    </div>
  );
}

// The board as the page shows it, read again each time the factory read
// its board on GitHub (the state's stream says when), not only when
// Kobble's files change.
function useFactoryView(state: FactoryState): Read<FactoryView> {
  const read = state.work?.read ?? "";
  return useRead(`/api/kobble/factory?read=${read}`) as Read<FactoryView>;
}
