// Factory: the connected GitHub board, in four columns (To do, Building,
// Review, Done). Each card has its number and title, and either the
// exploration and prototype it was handed off from (it opens it) or a red
// Fix chip. The builder, which builds the cards in To do, has a quiet line
// and its switch in the header; "Read it again" reads the board now.
// Without a board, the page says so and leads to connecting one.

import { ArrowUpRight, FlaskConical, RefreshCw } from "lucide-react";
import { useState } from "react";

import { type FactoryCard, type FactoryView, messageOf, post } from "@/api";
import { boardOf } from "@/connect/connected-board";
import { PageHead } from "@/components/page-head";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { FactoryState } from "@/dashboard/dashboard";
import { type Read, useRead } from "@/lib/use-read";
import { CARD } from "@/signals/bits";

import { ColumnIcon } from "./column-icon";

export function FactoryPage({ state }: Readonly<{ state: FactoryState }>) {
  const { data, problem } = useRead("/api/kobble/factory") as Read<FactoryView>;
  const [said, say] = useState<string | null>(null);
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
      {data && <Columns view={data} />}
    </>
  );
}

function Columns({ view }: Readonly<{ view: FactoryView }>) {
  if (!view.connected) return <NotConnected />;
  return (
    <div className="grid items-start gap-3.5 md:grid-cols-2 xl:grid-cols-4">
      {view.columns.map((column) => (
        <section
          key={column.id}
          aria-label={column.title}
          className="flex min-h-[480px] flex-col gap-2.5 rounded-[20px] bg-[#eceef2] p-3"
        >
          <h2 className="flex items-center gap-2 px-1.5 py-1 font-semibold">
            <ColumnIcon column={column.id} />
            {column.title}
            <span className="text-[12.5px] font-normal text-muted-foreground">
              {column.cards.length}
            </span>
          </h2>
          {column.cards.map((card) => (
            <Card key={card.number} card={card} />
          ))}
        </section>
      ))}
    </div>
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
  return (
    <>
      <label className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <Switch
          checked={view.builder.on}
          onCheckedChange={(on) => {
            press("/api/builder", { on });
          }}
        />
        {builderWords(view.builder)}
      </label>
      <Button
        variant="ring"
        size="pill"
        onClick={() => {
          press("/api/work/refresh");
        }}
      >
        <RefreshCw aria-hidden strokeWidth={2} className="size-[15px]" />
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

function Card({ card }: Readonly<{ card: FactoryCard }>) {
  return (
    <article className="flex flex-col gap-2 rounded-2xl bg-card px-4 py-3.5 shadow-card">
      <a
        href={card.url}
        target="_blank"
        rel="noreferrer"
        className="text-[12.5px] text-muted-foreground hover:text-foreground"
      >
        #{card.number}
      </a>
      <span className="leading-[1.35] font-semibold">{card.title}</span>
      <div>
        <Origin card={card} />
      </div>
    </article>
  );
}

// Where a card came from: an exploration's prototype, or a fix.
function Origin({ card }: Readonly<{ card: FactoryCard }>) {
  if (card.from)
    return (
      <a
        href={`#explore/${encodeURIComponent(card.from.exploration)}`}
        className="inline-flex h-[26px] items-center gap-1.5 rounded-full bg-wash px-2.5 text-xs font-medium text-wash-foreground"
      >
        <FlaskConical aria-hidden strokeWidth={2} className="size-3" />
        {card.from.exploration}
        {card.from.key ? ` · prototype ${card.from.key}` : ""}
      </a>
    );
  if (!card.fix) return null;
  return (
    <span className="inline-flex h-[26px] items-center rounded-full bg-type-bug/10 px-2.5 text-xs font-medium text-type-bug">
      Fix
    </span>
  );
}

function NotConnected() {
  return (
    <div className={`${CARD} grid justify-items-start gap-3 px-6 py-6`}>
      <p className="font-semibold">No GitHub board is connected yet.</p>
      <p className="text-sm text-muted-foreground">
        The factory's work lives on a GitHub board: fixes and handed-off
        prototypes go to its To do column, and the builder takes them from
        there.
      </p>
      <Button asChild size="pill">
        <a href="#connect">Connect a board</a>
      </Button>
    </div>
  );
}
