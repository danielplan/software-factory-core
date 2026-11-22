// Factory's blocks on Home: the product in a line, what waits, the loop
// from what came in to what is done, and the reviews. Each draws what it
// shows from what Home has read; the app hands them to Home
// (app/home-blocks.tsx), which arranges them.

import {
  ArrowRight,
  CircleCheck,
  Columns3,
  ExternalLink,
  FlaskConical,
  Inbox,
  Puzzle,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { AddOnView, FactoryState } from "@/api/client";
import { BlockCard, BlockEmpty } from "@/components/block-card";
import { StatusLight } from "@/components/status-light";
import { Card } from "@/components/ui/card";

import {
  type HomeInput,
  loopOf,
  type Stage,
  statusLine,
  type WaitingItem,
} from "@/lib/home-view";
import { nameOf } from "@/lib/market-view";
import { overallOf } from "@/lib/shell-view";

// A link that opens outside the factory, in a tab of its own.
const OUTSIDE = { target: "_blank", rel: "noreferrer" } as const;

const KIND_COLOUR: Record<WaitingItem["kind"], string> = {
  Review: "var(--build)",
  Answer: "var(--build)",
  Continue: "var(--explore)",
  Sort: "var(--understand)",
};

const STAGE_LOOK: Record<string, { icon: ReactNode; colour: string }> = {
  signals: { icon: <Inbox aria-hidden />, colour: "var(--understand)" },
  explore: { icon: <FlaskConical aria-hidden />, colour: "var(--explore)" },
  build: { icon: <Columns3 aria-hidden />, colour: "var(--build)" },
  done: { icon: <CircleCheck aria-hidden />, colour: "var(--source-app)" },
};

// A stage of a team's own extension.
const OTHER_LOOK = { icon: <Puzzle aria-hidden />, colour: "#8b5cf6" };

export function StatusBlock({ state }: Readonly<{ state: FactoryState }>) {
  const t = useTranslation().t;
  const products = state.parts.filter((part) => part.area === "products");
  const shown = products.filter((part) => part.light !== "none");
  const product = overallOf(products, t).lit;
  const building = state.work?.builder.working;
  return (
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
          t,
        )}
      </span>
      <a href="#system" className="font-medium text-blue hover:underline">
        {t("shell.pages.system")}
      </a>
    </div>
  );
}

export function WaitingBlock({
  waiting,
}: Readonly<{ waiting: WaitingItem[] }>) {
  const t = useTranslation().t;
  return (
    <Card className="gap-0 py-0 shadow-soft">
      {waiting.length === 0 ? (
        <BlockEmpty line={t("home.nothingWaits")} />
      ) : (
        waiting.map((item) => <WaitingRow key={item.id} item={item} />)
      )}
    </Card>
  );
}

export function LoopBlock({
  input,
  state,
}: Readonly<{ input: HomeInput; state: FactoryState }>) {
  const t = useTranslation().t;
  const order = state.stages.order.map((place) => {
    const owner = state.addOns.find((addOn) => addOn.id === place.by);
    return {
      ...place,
      by: owner ? nameOf(t, owner) : place.by,
      own: owner?.builtIn ?? false,
    };
  });
  const stages = loopOf(input, t, t, order);
  return (
    <Card
      className="grid gap-0 overflow-hidden py-0 shadow-soft sm:grid-cols-2 lg:[grid-template-columns:repeat(var(--stages),minmax(0,1fr))]"
      style={{ "--stages": stages.length } as CSSProperties}
    >
      {stages.map((stage, at) => (
        <StageCell key={stage.id} stage={stage} first={at === 0} />
      ))}
    </Card>
  );
}

export function ReviewsBlock({
  waiting,
  addOns,
}: Readonly<{ waiting: WaitingItem[]; addOns: AddOnView[] }>) {
  const t = useTranslation().t;
  const reviews = waiting.filter((item) => item.kind === "Review");
  return (
    <BlockCard id="reviews" addOns={addOns}>
      {reviews.length === 0 ? (
        <BlockEmpty line={t("home.blockEmpty.reviews")} />
      ) : (
        reviews.map((item) => <WaitingRow key={item.id} item={item} />)
      )}
    </BlockCard>
  );
}

function WaitingRow({ item }: Readonly<{ item: WaitingItem }>) {
  const t = useTranslation().t;
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 border-t border-line-soft px-4 py-2.5 first:border-t-0">
      <span
        className="text-xs font-medium"
        style={{ color: KIND_COLOUR[item.kind] }}
      >
        {t(`home.kinds.${item.kind}`)}
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
        {...(item.outside ? OUTSIDE : {})}
        className="inline-flex h-7 items-center gap-1 rounded-lg border border-border px-2.5 text-xs hover:bg-hover"
      >
        {item.kind === "Review"
          ? t("home.openPullRequest")
          : t(`home.kinds.${item.kind}`)}
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
  const look = Object.hasOwn(STAGE_LOOK, stage.id)
    ? (STAGE_LOOK[stage.id] ?? OTHER_LOOK)
    : OTHER_LOOK;
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
        {stage.count}
        {stage.count !== null && " "}
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
