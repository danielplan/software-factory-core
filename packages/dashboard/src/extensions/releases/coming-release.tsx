// The coming release: the work merged since the last release and, until
// the team prepares it, Prepare the release (the kobold is asked nothing
// before); once prepared, Release now at the top right, the number
// suggested (Change turns it into a field) and why.

import type { TFunction } from "i18next";
import { LoaderCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { messageOf, post, type ReleasesView } from "@/api/client";
import { TypeChip } from "@/components/card-type";
import { ProblemBox } from "@/components/layout/problem-box";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { cn } from "@/lib/utils";
import { CARD } from "@/components/page-bits";

import { problemWith, type Why, whyOf } from "./view";

type Words = TFunction;

type Connected = Extract<ReleasesView, { connected: true }>;

type Suggested = { next: string | null; why: string | null };

export function ComingRelease({ view }: Readonly<{ view: Connected }>) {
  const t = useTranslation().t;
  const { coming, last } = view;
  const at = useComingRelease(view);
  const nothing = coming.merged.length === 0;
  return (
    <section className="grid gap-3" aria-labelledby="coming-release">
      {at.said && (
        <ProblemBox title={t("releases.didNotWork")} text={at.said} />
      )}
      <div className={cn(CARD, "grid gap-4 p-5")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 id="coming-release" className="text-[15px] font-semibold">
            {t("releases.coming")}
          </h2>
          <ReleaseButton at={at} nothing={nothing} />
        </div>
        {nothing && (
          <p className="text-[13px] text-muted-foreground">
            {t("releases.nothing", {
              last,
              context: last ? "since" : undefined,
            })}
          </p>
        )}
        {!nothing && at.suggested === null && (
          <p className="text-[13px] text-muted-foreground">
            {t("releases.prepareAbout")}
          </p>
        )}
        {!nothing && at.suggested !== null && (
          <NumberLine
            suggested={at.suggested}
            typed={at.typed}
            onType={at.setTyped}
            problem={at.problem}
            last={last}
            view={at.shownView}
          />
        )}
        {!nothing && <Merged merged={coming.merged} last={last} />}
      </div>
    </section>
  );
}

// The coming release's state: the suggestion (from the server, or from
// Prepare until the page reads it), the number typed instead, and the two
// buttons' work.
function useComingRelease(view: Connected) {
  const { coming, last } = view;
  const [typed, setTyped] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [said, say] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<Suggested | null>(null);
  const suggested = coming.next ?? prepared?.next ?? null;
  const number = (typed ?? suggested ?? "").trim();
  const ask = (path: string, body: object, done: (answer: unknown) => void) => {
    setWorking(true);
    say(null);
    post(path, body).then(
      (answer) => {
        setWorking(false);
        done(answer);
      },
      (error: unknown) => {
        setWorking(false);
        say(messageOf(error));
      },
    );
  };
  const shownView =
    prepared && coming.next === null
      ? { ...view, coming: { ...coming, why: prepared.why } }
      : view;
  return {
    typed,
    setTyped,
    working,
    said,
    suggested,
    number,
    shownView,
    problem: problemWith(number, last),
    prepare: () => {
      ask("/api/releases/prepare", {}, (answer) => {
        setPrepared(answer as Suggested);
      });
    },
    release: () => {
      ask("/api/releases", { number }, () => {
        setTyped(null);
      });
    },
  };
}

// Prepare the release until the kobold suggested a number; Release now
// after.
function ReleaseButton({
  at,
  nothing,
}: Readonly<{ at: ReturnType<typeof useComingRelease>; nothing: boolean }>) {
  const t = useTranslation().t;
  const spinner = <LoaderCircle aria-hidden className="animate-spin" />;
  if (at.suggested === null)
    return (
      <Button
        variant="default"
        size="pill"
        disabled={at.working || nothing}
        onClick={at.prepare}
      >
        {at.working ? spinner : <Sparkles aria-hidden />}
        {at.working ? t("releases.preparing") : t("releases.prepare")}
      </Button>
    );
  return (
    <Button
      variant="default"
      size="pill"
      disabled={at.working || nothing || at.problem !== null}
      onClick={at.release}
    >
      {at.working && spinner}
      {at.working
        ? t("releases.releasing")
        : t("releases.releaseNow", { number: at.number })}
    </Button>
  );
}

function NumberLine({
  suggested,
  typed,
  onType,
  problem,
  last,
  view,
}: Readonly<{
  suggested: string;
  typed: string | null;
  onType: (typed: string | null) => void;
  problem: ReturnType<typeof problemWith>;
  last: string | null;
  view: Connected;
}>) {
  const t = useTranslation().t;
  const why = whyOf(view);
  const reason = reasonText(why, t);
  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]">
        <span className="font-medium">{t("releases.next")}</span>
        {typed === null ? (
          <>
            <span className="font-mono text-[15px] font-semibold">
              {suggested}
            </span>
            <button
              type="button"
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => {
                onType(suggested);
              }}
            >
              {t("releases.change")}
            </button>
          </>
        ) : (
          <>
            <Input
              value={typed}
              aria-label={t("releases.numberLabel")}
              aria-invalid={problem !== null}
              className="h-8 w-28 font-mono"
              autoFocus
              onChange={(event) => {
                onType(event.target.value);
              }}
            />
            <button
              type="button"
              aria-label={t("releases.useSuggestedLabel", {
                number: suggested,
              })}
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => {
                onType(null);
              }}
            >
              {t("releases.useSuggested", { number: suggested })}
            </button>
          </>
        )}
        {reason && <span className="text-muted-foreground">{reason}</span>}
      </div>
      {typed !== null && problem !== null && (
        <p role="alert" className="text-xs text-destructive">
          {problem === "not-a-number" || last === null
            ? t("releases.notANumber")
            : t("releases.notHigher", { last })}
        </p>
      )}
    </div>
  );
}

function Merged({
  merged,
  last,
}: Readonly<{ merged: Connected["coming"]["merged"]; last: string | null }>) {
  const t = useTranslation().t;
  return (
    <div className="grid gap-2">
      <h3 className="text-[13px] font-medium">
        {t("releases.merged", {
          count: merged.length,
          last,
          context: last ? "since" : undefined,
        })}
      </h3>
      <ul className="grid gap-1.5">
        {merged.map((one) => (
          <li
            key={one.number}
            className="flex flex-wrap items-center gap-2 text-[13px]"
          >
            <TypeChip type={one.type} />
            <span className="min-w-0 break-words">{one.title}</span>
            <a
              href={one.url}
              target="_blank"
              rel="noreferrer"
              title={t("releases.openPullRequest", { number: one.number })}
              aria-label={t("releases.openPullRequest", { number: one.number })}
              className="font-medium text-muted-foreground underline-offset-2 hover:underline"
            >
              {`#${String(one.number)}`}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

const REASONS = {
  first: (t: Words) => t("releases.first"),
  unknown: (t: Words) => t("releases.whyUnknown"),
  nothing: () => null,
};

// The words of the line beside the number.
function reasonText(why: Why, t: Words): string | null {
  return why.kind === "said" ? why.text : REASONS[why.kind](t);
}
