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
} from "lucide-react";
import type { ReactNode } from "react";

import { StatusLight } from "@/components/status-light";
import { PageHead } from "@/components/page-head";
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

import type { FactoryState } from "./dashboard";

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
  const { data: explorations } = useExplorations();
  const { data: signals } = useSignals();
  const t = useT();
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
  const waiting = waitingOf(input, t.home);
  return (
    <>
      <PageHead title={t.shell.pages.home} about={t.home.about} />
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
      <Card className="gap-0 py-0 shadow-soft">
        {waiting.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
            {t.home.nothingWaits}
          </p>
        ) : (
          waiting.map((item) => <WaitingRow key={item.id} item={item} />)
        )}
      </Card>
      <Card className="grid gap-0 overflow-hidden py-0 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
        {loopOf(input, t.home, t.shell.pages).map((stage, at) => (
          <StageCell key={stage.id} stage={stage} first={at === 0} />
        ))}
      </Card>
    </>
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
