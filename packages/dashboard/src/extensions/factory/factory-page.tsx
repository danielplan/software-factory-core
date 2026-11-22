// Factory: the connected GitHub board, in four columns (To do, Building,
// Review, Done). Each card has its number and title, and either the
// exploration and prototype it was handed off from (it opens it) or a red
// Fix chip. The builder, which builds the cards in To do, has a quiet line
// and its switch in the header; "Read it again" reads the board now. Above
// the columns, what waits for the owner: the builder's questions, and the
// cards it got stuck on (Stuck). Without a board, the page says so and
// leads to connecting one.

import type { TFunction } from "i18next";
import { ArrowUpRight, LoaderCircle, Plug, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { type FactoryState, messageOf, post } from "@/api/client";
import { boardOf } from "@/components/connected-board";
import { PageHead } from "@/components/layout/page-head";
import { ProblemBox } from "@/components/layout/problem-box";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { type Read, useRead } from "@/api/query";
import { type FactoryView, factoryViewSchema } from "@/api/schemas/factory";
import { cn } from "@/lib/utils";
import { CARD } from "@/components/page-bits";

import { Card, OpenCard } from "./board-card";
import { CardPanel } from "./card-panel";
import { COLUMN_COLOURS, ColumnIcon } from "./column-icon";
import { StuckList } from "./stuck-cards";
import { WaitingCards } from "./waiting-card";

export function FactoryPage({ state }: Readonly<{ state: FactoryState }>) {
  const t = useTranslation().t;
  const { data, problem } = useFactoryView(state);
  const [said, say] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
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
        title={t("shell.pages.build")}
        actions={
          data?.connected ? (
            <Builder view={data} press={press} href={href} />
          ) : undefined
        }
      />
      {shown && <ProblemBox title={t("factory.didNotWork")} text={shown} />}
      <OpenCard value={setOpen}>
        {data && <Board view={without(data, gone)} />}
      </OpenCard>
      {open !== null && (
        <CardPanel
          number={open}
          {...knownOf(data, open)}
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

// What the board knows of a card already: its title, shown while its panel
// loads, and what the builder did on it so far.
function knownOf(view: FactoryView | null | undefined, number: number) {
  const card = view?.columns
    .flatMap((column) => column.cards)
    .find((one) => one.number === number);
  return {
    title: card?.title ?? null,
    trace: view?.builder.trace[number] ?? [],
  };
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
function Board({ view }: Readonly<{ view: FactoryView }>) {
  const t = useTranslation().t;
  // Connected, but not read yet (just started): no empty columns meanwhile.
  if (view.connected && view.read === null)
    return (
      <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <LoaderCircle aria-hidden className="size-4 animate-spin" />
        {t("factory.reading")}
      </p>
    );
  return (
    <>
      {view.connected && <WaitingCards waiting={view.waiting} />}
      {view.connected && <StuckList stuck={view.stuck} />}
      <Columns view={view} />
    </>
  );
}

// The board's columns, side by side and the same height (the window's,
// less the page's head); each scrolls on its own. Done shows its latest
// cards, the rest under Show all.
function Columns({ view }: Readonly<{ view: FactoryView }>) {
  if (!view.connected) return <NotConnected />;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:h-[calc(100dvh-150px)] xl:min-h-[360px] xl:grid-cols-4">
      {view.columns.map((column) => (
        <Column key={column.id} column={column} now={view.builder.now} />
      ))}
    </div>
  );
}

const DONE_SHOWN = 6;

function Column({
  column,
  now,
}: Readonly<{
  column: FactoryView["columns"][number];
  now: FactoryView["builder"]["now"];
}>) {
  const t = useTranslation().t;
  const [all, setAll] = useState(false);
  const colour = COLUMN_COLOURS[column.id];
  const cut = column.id === "done" && !all && column.cards.length > DONE_SHOWN;
  const cards = cut ? column.cards.slice(0, DONE_SHOWN) : column.cards;
  return (
    <section
      aria-label={t(`factory.columns.${column.id}`)}
      className="flex min-h-0 flex-col rounded-xl border"
      style={{
        backgroundColor: `color-mix(in srgb, ${colour} 6%, #fafafa)`,
        borderColor: `color-mix(in srgb, ${colour} 16%, #e6e6ea)`,
      }}
    >
      <header className="grid gap-0.5 px-3.5 pt-3 pb-2.5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold">
          <ColumnIcon column={column.id} />
          <span style={{ color: colour }}>
            {t(`factory.columns.${column.id}`)}
          </span>
          <span
            className="ml-auto grid h-5 min-w-5 place-items-center rounded-md px-1.5 text-[11px] font-semibold"
            style={{
              color: colour,
              backgroundColor: `color-mix(in srgb, ${colour} 14%, transparent)`,
            }}
          >
            {column.cards.length}
          </span>
        </h2>
        <p className="pl-[23px] text-xs text-muted-foreground">
          {t(`factory.means.${column.id}`)}
        </p>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {cards.map((card, at) => (
          <Card
            key={card.number}
            card={card}
            at={at}
            now={now[card.number] ?? null}
          />
        ))}
        {column.cards.length === 0 && (
          <p className="rounded-lg border border-dashed border-current/15 px-3 py-4 text-center text-xs text-faint">
            {t("factory.nothingHere")}
          </p>
        )}
        {cut && (
          <button
            type="button"
            onClick={() => {
              setAll(true);
            }}
            className="rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-card hover:text-foreground"
          >
            {t("factory.showAll", { n: column.cards.length })}
          </button>
        )}
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
  const t = useTranslation().t;
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
        {builderWords(view.builder, t)}
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
        {t("factory.readAgain")}
      </Button>
      {href && (
        <Button asChild variant="ring" size="pill">
          <a href={href} target="_blank" rel="noreferrer">
            {t("factory.openOnGitHub")}{" "}
            <ArrowUpRight aria-hidden className="size-4" />
          </a>
        </Button>
      )}
    </>
  );
}

function builderWords(builder: FactoryView["builder"], m: TFunction): string {
  if (builder.working)
    return m("factory.builder.building", { what: builder.working });
  return builder.on ? m("factory.builder.on") : m("factory.builder.off");
}

function NotConnected() {
  const t = useTranslation().t;
  return (
    <div className={`${CARD} grid justify-items-start gap-3 px-6 py-6`}>
      <p className="text-[15px] font-semibold">
        {t("factory.notConnected.title")}
      </p>
      <p className="max-w-prose text-[13px] text-muted-foreground">
        {t("factory.notConnected.text")}
      </p>
      <Button asChild size="pill" className="mt-1">
        <a href="#connect">
          <Plug aria-hidden />
          {t("factory.notConnected.connect")}
        </a>
      </Button>
    </div>
  );
}

// The board as the page shows it, read again each time the factory read
// its board on GitHub (the state's stream says when), not only when
// Kobble's files change.
function useFactoryView(state: FactoryState): Read<FactoryView> {
  const read = state.work?.read ?? "";
  return useRead(`/api/kobble/factory?read=${read}`, factoryViewSchema);
}
