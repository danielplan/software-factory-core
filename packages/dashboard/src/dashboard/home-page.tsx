// Home, the first page: how the product is doing in a line (System has the
// rest), what waits for the owner, and the loop from what came in to what
// is done, each stage leading to its page.

import {
  ArrowRight,
  CircleCheck,
  Columns3,
  ExternalLink,
  FlaskConical,
  Inbox,
  Plus,
  RotateCcw,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import { StatusLight } from "@/components/status-light";
import { PageHead } from "@/components/page-head";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useExplorations } from "@/explorations/explorations-page";
import {
  loopOf,
  type HomeInput,
  type Stage,
  statusLine,
  type WaitingItem,
  waitingOf,
} from "@/lib/home-view";
import { overallOf } from "@/lib/shell-view";
import { useT } from "@/i18n/use-t";
import { useSignals } from "@/signals/use-signals";

import { useExtensions } from "@/extensions/data";
import { MADE_STATE, VARIANT } from "@/lib/prototype-flags";

import type { FactoryState } from "./dashboard";
import { ArrangeButton, type BlockId, HomeBlocks } from "./home-blocks";

// Prototype: made-up items, so Home shows something to arrange.
function madeUp(count: number): WaitingItem[] {
  const all: WaitingItem[] = [
    ["Review", "Retry the sync when the live app is slow", "#58"],
    ["Review", "Show the kobold's trace in a card's panel on the Factory page", "#61"],
    ["Answer", "Which board should the new add-on read?", "#63"],
    ["Review", "packages/dashboard/src/explorations/board/prototype-states.tsx", "#64"],
    ["Continue", "Make your own extensions", ""],
    ["Sort", "3 new signals", ""],
  ].map(([kind, title, number], at) => ({
    id: `made-up-${String(at)}`,
    kind: kind as WaitingItem["kind"],
    title: title ?? "",
    about: "Made-up example",
    number: number || null,
    href: "#build",
    outside: false,
  }));
  return all.slice(0, count);
}

const KIND_COLOUR: Record<WaitingItem["kind"], string> = {
  Review: "var(--build)",
  Answer: "var(--build)",
  Continue: "var(--explore)",
  Sort: "var(--understand)",
};

const STAGE_LOOK: Record<Stage["id"], { icon: ReactNode; colour: string }> = {
  signals: { icon: <Inbox aria-hidden />, colour: "var(--understand)" },
  explore: { icon: <FlaskConical aria-hidden />, colour: "var(--explore)" },
  build: { icon: <Columns3 aria-hidden />, colour: "var(--build)" },
  done: { icon: <CircleCheck aria-hidden />, colour: "var(--source-app)" },
};

export function HomePage({ state }: Readonly<{ state: FactoryState }>) {
  const { data: explorations, problem: exploringProblem } = useExplorations();
  const { data: signals, problem: signalsProblem } = useSignals();
  // Blocks are shown once what they show is read, so none of them grows or
  // moves after it appears.
  const ready =
    (explorations !== null || exploringProblem !== null) &&
    (signals !== null || signalsProblem !== null);
  const t = useT();
  const [arranging, setArranging] = useState(false);
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState(false);
  // B: only the blocks of installed extensions are on offer.
  const { all } = useExtensions(state);
  const installed =
    VARIANT === "B" ? new Set(all.filter((e) => e.on).map((e) => e.id)) : null;
  const input: HomeInput = {
    work: state.work,
    signals: signals?.signals ?? [],
    fresh: signals?.counts.new ?? 0,
    exploring: explorations?.exploring ?? [],
  };
  const products = state.parts.filter((part) => part.area === "products");
  const shown = products.filter((part) => part.light !== "none");
  const product = overallOf(products, t.shell).lit;
  const building = state.work?.builder.working;
  const real = waitingOf(input, t.home);
  const waiting =
    MADE_STATE === "empty"
      ? []
      : MADE_STATE === "many"
        ? [...real, ...madeUp(6)].slice(0, 8)
        : real.length > 0
          ? real
          : madeUp(3);
  const reviewsNow = waiting.filter((item) => item.kind === "Review");
  const reviews =
    reviewsNow.length === 0 && MADE_STATE !== "empty"
      ? madeUp(4).filter((item) => item.kind === "Review")
      : reviewsNow;
  const blocks: Record<BlockId, ReactNode> = {
    status: (
      <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-foreground-2">
        <StatusLight light={product} />
        <span className="min-w-0 flex-1">
          {statusLine(
            {
              light: product,
              running: shown.filter((part) => part.light === "running").length,
              shown: shown.length,
            },
            building ? `#${String(building.number)} ${building.title}` : null,
            t.home,
          )}
        </span>
        <a href="#system" className="font-medium text-blue hover:underline">
          {t.shell.pages.system}
        </a>
      </div>
    ),
    waiting: (
      <Card className="gap-0 py-0 shadow-soft">
        {waiting.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
            {t.home.nothingWaits}
          </p>
        ) : (
          waiting.map((item) => <WaitingRow key={item.id} item={item} />)
        )}
      </Card>
    ),
    loop: (
      <Card className="grid gap-0 overflow-hidden py-0 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
        {loopOf(input, t.home, t.shell.pages).map((stage, at) => (
          <StageCell key={stage.id} stage={stage} first={at === 0} />
        ))}
      </Card>
    ),
    exploring: (
      <BlockCard name="Being explored" from="Explorations">
        {MADE_STATE === "empty" || input.exploring.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
            Nothing is being explored.
          </p>
        ) : (
          input.exploring.slice(0, 4).map((row) => (
            <a
              key={row.id}
              href={`#explore/${encodeURIComponent(row.id)}`}
              className="grid gap-0.5 border-t border-line-soft px-4 py-2.5 first:border-t-0 hover:bg-surface"
            >
              <span className="truncate text-[13px]">{row.title}</span>
              {row.line && (
                <span className="truncate text-xs text-muted-foreground">
                  {row.line}
                </span>
              )}
            </a>
          ))
        )}
      </BlockCard>
    ),
    signals: (
      <BlockCard name="New signals" from="Signals">
        {MADE_STATE === "empty" || input.signals.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
            No new signals.
          </p>
        ) : (
          input.signals.slice(0, 3).map((signal) => (
            <a
              key={signal.text}
              href="#signals"
              className="block truncate border-t border-line-soft px-4 py-2.5 text-[13px] first:border-t-0 hover:bg-surface"
            >
              {signal.text}
            </a>
          ))
        )}
      </BlockCard>
    ),
    reviews: (
      <BlockCard name="Open reviews" from="Factory">
        {reviews.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
            No pull request waits for your review.
          </p>
        ) : (
          reviews.map((item) => <WaitingRow key={item.id} item={item} />)
        )}
      </BlockCard>
    ),
    failed: (
      <BlockCard name="Failed check" from="Checks">
        {MADE_STATE === "empty" ? (
          <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
            No check has failed.
          </p>
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-[13px]">
                <StatusLight light="problem" />
                <span className="truncate">Lint and type check failed</span>
              </span>
              <span className="block break-all text-xs text-muted-foreground">
                #58 Retry the sync when the live app is slow · packages/server/src/kobble/sync.ts
              </span>
            </span>
            <a
              href="#build"
              className="inline-flex h-7 items-center gap-1 rounded-lg border border-border px-2.5 text-xs hover:bg-hover"
            >
              Open
              <ArrowRight aria-hidden className="size-3" />
            </a>
          </div>
        )}
      </BlockCard>
    ),
  };
  return (
    <>
      <PageHead
        title={t.shell.pages.home}
        about={t.home.about}
        actions={
          <>
            {arranging && (
              <Button
                variant="ghost"
                size="pill"
                className="text-muted-foreground"
                onClick={() => {
                  setResetting(true);
                }}
              >
                <RotateCcw aria-hidden />
                Reset layout
              </Button>
            )}
            {arranging && (
              <Button
                variant="ring"
                size="pill"
                onClick={() => {
                  setAdding(true);
                }}
              >
                <Plus aria-hidden />
                Add a block
              </Button>
            )}
            <ArrangeButton
              editing={arranging}
              onClick={() => {
                setArranging(!arranging);
                setAdding(false);
                setResetting(false);
              }}
            />
          </>
        }
      />
      <HomeBlocks
        blocks={blocks}
        editing={arranging}
        installed={installed}
        ready={ready}
        adding={adding}
        onAdding={setAdding}
        resetting={resetting}
        onResetting={setResetting}
      />
    </>
  );
}

// A block an add-on offers: its name and where it comes from, over a card.
function BlockCard({
  name,
  from,
  children,
}: Readonly<{ name: string; from: string; children: ReactNode }>) {
  return (
    <div className="grid gap-1.5">
      <span
        data-block-title
        className="flex items-center gap-2 text-[13px] font-medium"
      >
        {name}
        <span className="text-xs font-normal text-muted-foreground">
          {from}
        </span>
      </span>
      <Card className="gap-0 py-0 shadow-soft">{children}</Card>
    </div>
  );
}

function WaitingRow({ item }: Readonly<{ item: WaitingItem }>) {
  const t = useT().home;
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 border-t border-line-soft px-4 py-2.5 first:border-t-0">
      <span
        className="text-xs font-medium"
        style={{ color: KIND_COLOUR[item.kind] }}
      >
        {t.kinds[item.kind]}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px]">
          {item.title}
          {item.number && (
            <span className="ml-2 text-xs text-muted-foreground">
              {item.number}
            </span>
          )}
        </span>
        {item.about && (
          <span className="block truncate text-xs text-muted-foreground">
            {item.about}
          </span>
        )}
      </span>
      <a
        href={item.href}
        {...(item.outside ? { target: "_blank", rel: "noreferrer" } : {})}
        className="inline-flex h-7 items-center gap-1 rounded-lg border border-border px-2.5 text-xs hover:bg-hover"
      >
        {item.kind === "Review" ? t.openPullRequest : t.kinds[item.kind]}
        {item.outside ? (
          <ExternalLink aria-hidden className="size-3" />
        ) : (
          <ArrowRight aria-hidden className="size-3" />
        )}
      </a>
    </div>
  );
}

function StageCell({
  stage,
  first,
}: Readonly<{ stage: Stage; first: boolean }>) {
  const look = STAGE_LOOK[stage.id];
  return (
    <a
      href={stage.href}
      className={
        "grid content-start gap-1.5 border-line-soft px-4 py-3.5 hover:bg-surface max-sm:border-t" +
        (first ? "" : " sm:border-l")
      }
    >
      <span className="flex items-center gap-2 text-[13px] font-medium">
        <span
          className="grid size-[22px] place-items-center rounded-md [&_svg]:size-[14px]"
          style={{
            color: look.colour,
            backgroundColor: `color-mix(in srgb, ${look.colour} 13%, transparent)`,
          }}
        >
          {look.icon}
        </span>
        {stage.name}
      </span>
      <span className="text-[22px] font-semibold tracking-[-0.02em] tabular-nums">
        {stage.count}{" "}
        <span className="text-xs font-normal tracking-normal text-muted-foreground">
          {stage.says}
        </span>
      </span>
      {stage.items.map((title) => (
        <span key={title} className="truncate text-xs text-foreground-2">
          {title}
        </span>
      ))}
    </a>
  );
}
