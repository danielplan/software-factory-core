// The coming release: its title with Release now at the top right, the
// number suggested (Change turns it into a field) and why, and the work
// merged since the last release.

import { LoaderCircle } from "lucide-react";
import { useState } from "react";

import { messageOf, post, type ReleasesView } from "@/api";
import { TypeChip } from "@/factory/card-type";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/use-t";
import { cn } from "@/lib/utils";
import { CARD } from "@/signals/bits";

import type { Messages } from "@/i18n/messages";

import { problemWith, type Why, whyOf } from "./view";

type Words = Messages["releases"];

type Connected = Extract<ReleasesView, { connected: true }>;

export function ComingRelease({ view }: Readonly<{ view: Connected }>) {
  const t = useT().releases;
  const { coming, last } = view;
  // The number the team typed instead of the suggested one, while it does.
  const [typed, setTyped] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [said, say] = useState<string | null>(null);
  const number = (typed ?? coming.next).trim();
  const problem = problemWith(number, last);
  const nothing = coming.merged.length === 0;
  const release = () => {
    setWorking(true);
    say(null);
    post("/api/releases", { number }).then(
      () => {
        setWorking(false);
        setTyped(null);
      },
      (error: unknown) => {
        setWorking(false);
        say(messageOf(error));
      },
    );
  };
  return (
    <section className="grid gap-3" aria-labelledby="coming-release">
      {said && <ProblemBox title={t.didNotWork} text={said} />}
      <div className={cn(CARD, "grid gap-4 p-5")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 id="coming-release" className="text-[15px] font-semibold">
            {t.coming}
          </h2>
          <Button
            variant="default"
            size="pill"
            disabled={working || nothing || problem !== null}
            onClick={release}
          >
            {working && <LoaderCircle aria-hidden className="animate-spin" />}
            {working ? t.releasing : t.releaseNow(number)}
          </Button>
        </div>
        {nothing ? (
          <p className="text-[13px] text-muted-foreground">{t.nothing(last)}</p>
        ) : (
          <NumberLine
            suggested={coming.next}
            typed={typed}
            onType={setTyped}
            problem={problem}
            last={last}
            view={view}
          />
        )}
        {!nothing && <Merged merged={coming.merged} last={last} />}
      </div>
    </section>
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
  const t = useT().releases;
  const why = whyOf(view);
  const reason = reasonText(why, t);
  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]">
        <span className="font-medium">{t.next}</span>
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
              {t.change}
            </button>
          </>
        ) : (
          <>
            <Input
              value={typed}
              aria-label={t.numberLabel}
              aria-invalid={problem !== null}
              className="h-8 w-28 font-mono"
              autoFocus
              onChange={(event) => {
                onType(event.target.value);
              }}
            />
            <button
              type="button"
              aria-label={t.useSuggestedLabel(suggested)}
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => {
                onType(null);
              }}
            >
              {t.useSuggested(suggested)}
            </button>
          </>
        )}
        {reason && <span className="text-muted-foreground">{reason}</span>}
      </div>
      {typed !== null && problem !== null && (
        <p role="alert" className="text-xs text-destructive">
          {problem === "not-a-number" || last === null
            ? t.notANumber
            : t.notHigher(last)}
        </p>
      )}
    </div>
  );
}

function Merged({
  merged,
  last,
}: Readonly<{ merged: Connected["coming"]["merged"]; last: string | null }>) {
  const t = useT().releases;
  return (
    <div className="grid gap-2">
      <h3 className="text-[13px] font-medium">
        {t.merged(merged.length, last)}
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
              title={t.openPullRequest(one.number)}
              aria-label={t.openPullRequest(one.number)}
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
  first: (t: Words) => t.first,
  unknown: (t: Words) => t.whyUnknown,
  nothing: () => null,
};

// The words of the line beside the number.
function reasonText(why: Why, t: Words): string | null {
  return why.kind === "said" ? why.text : REASONS[why.kind](t);
}
