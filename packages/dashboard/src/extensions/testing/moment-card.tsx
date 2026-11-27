// One moment of a test as a card: its time and how it went, the picture of
// the screen then (whole in a new tab), what the persona did, what they
// said, what they expected when it went otherwise, and what was filed at it.
// A day's cards sit in a slider.

import { Link } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useRef } from "react";
import { useTranslation } from "react-i18next";

import type { SignalRow, TestMoment } from "@/api/client";
import { CARD, TypeChip } from "@/components/page-bits";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";

import { CountChip } from "./test-bits";

// How the moment went, as one chip at the top of its card: the worst
// signal filed at it, or whether it went as the persona expected.
function Outcome({ moment }: Readonly<{ moment: TestMoment }>) {
  const t = useTranslation().t;
  const worst = (["bug", "question", "idea"] as const).find((kind) =>
    moment.signals.some((signal) => signal.type === kind),
  );
  if (worst)
    return <CountChip kind={worst}>{t(`testing.moment.${worst}`)}</CountChip>;
  return moment.asExpected ? (
    <CountChip kind="ok">{t("testing.moment.ok")}</CountChip>
  ) : (
    <CountChip kind="surprise">{t("testing.moment.surprise")}</CountChip>
  );
}

export function Moment({
  test,
  moment,
}: Readonly<{ test: string; moment: TestMoment }>) {
  const t = useTranslation().t;
  const bug = moment.signals.some((signal) => signal.type === "bug");
  return (
    <article
      className={cn(
        CARD,
        "flex w-[300px] flex-none snap-start flex-col",
        bug &&
          "shadow-[0_0_0_1px_color-mix(in_srgb,var(--type-bug)_35%,var(--border))]",
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2.5">
        <span className="font-semibold">
          {moment.time ?? `#${String(moment.number)}`}
        </span>
        <Outcome moment={moment} />
      </div>
      {moment.shot && <Shot test={test} name={moment.shot} did={moment.did} />}
      <div className="grid gap-2 px-4 pt-3 pb-4 text-[13px] leading-snug">
        <p className="font-medium">{moment.did}</p>
        {moment.note && (
          <p className="text-foreground-2 italic">“{moment.note}”</p>
        )}
        {!moment.asExpected && (
          <p className="text-muted-foreground">
            {t("testing.run.expected", { what: moment.expected })}
          </p>
        )}
        {moment.signals.length > 0 && (
          <div className="mt-1 grid gap-1.5 border-t border-line-soft pt-2.5">
            {moment.signals.map((signal) => (
              <Found key={signal.id} signal={signal} />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

// A day's moments side by side, scrolled within the row (never the page),
// a card at a time, with Earlier and Later.
export function Slider({ children }: Readonly<{ children: ReactNode }>) {
  const t = useTranslation().t;
  const row = useRef<HTMLDivElement>(null);
  const move = (by: number) => {
    row.current?.scrollBy({ left: by * 312, behavior: "smooth" });
  };
  return (
    <div className="min-w-0">
      {/* On the day's title line: its section is placed relative. */}
      <div className="absolute top-[22px] right-0 flex gap-1.5">
        <button
          type="button"
          aria-label={t("testing.run.earlier")}
          onClick={() => {
            move(-2);
          }}
          className="grid size-8 place-items-center rounded-lg bg-card text-foreground-2 shadow-card hover:bg-surface"
        >
          <ChevronLeft aria-hidden className="size-4" strokeWidth={2.2} />
        </button>
        <button
          type="button"
          aria-label={t("testing.run.later")}
          onClick={() => {
            move(2);
          }}
          className="grid size-8 place-items-center rounded-lg bg-card text-foreground-2 shadow-card hover:bg-surface"
        >
          <ChevronRight aria-hidden className="size-4" strokeWidth={2.2} />
        </button>
      </div>
      <div
        ref={row}
        className="flex snap-x snap-mandatory items-start gap-3 overflow-x-auto overscroll-x-contain px-0.5 pt-0.5 pb-3"
      >
        {children}
      </div>
    </div>
  );
}

export function Found({ signal }: Readonly<{ signal: SignalRow }>) {
  return (
    <Link
      to={`/signals/${encodeURIComponent(signal.id)}`}
      className="group -mx-1 flex items-start gap-2 rounded-[8px] px-1 py-0.5 text-[12.5px] text-foreground-2 hover:bg-surface"
    >
      <TypeChip type={signal.type} />
      <span className="group-hover:underline">
        <Markdown text={signal.text} inline />
      </span>
    </Link>
  );
}

// The picture of the screen then, small; it opens whole in a new tab.
function Shot({
  test,
  name,
  did,
}: Readonly<{ test: string; name: string; did: string }>) {
  const src = `/api/kobble/testing/shot?id=${encodeURIComponent(test)}&name=${encodeURIComponent(name)}`;
  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className="block border-y border-line-soft bg-surface"
    >
      <img
        src={src}
        alt={did}
        loading="lazy"
        className="aspect-[16/10] w-full object-cover object-top-left"
      />
    </a>
  );
}
