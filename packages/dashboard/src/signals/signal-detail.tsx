// One signal on the Signals page: what was said, where it came from, who
// it sounds like, where the kobold put it (why, on a small (?)), what
// already exists for its problem, and the actions: Fix, Explore (or Add to
// the idea already explored) and Dismiss; Move, quieter.

import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { KoboldJob, SignalView } from "@/api";
import { exploreHash, understandHash } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { MoveForm } from "@/understand/move-form";
import { SignalActions } from "@/understand/signal-actions";
import { JobLine, Why } from "@/understand/sorted-signal";
import { alreadyOf, alreadyWords, wentWords } from "@/understand/view";

import { KIND } from "./signal-list";
import { kindOf, quoted } from "./view";

export function SignalDetail({
  signal,
  job,
}: Readonly<{ signal: SignalView; job?: KoboldJob }>) {
  const { t } = useTranslation("understand");
  const [moving, setMoving] = useState(false);
  const kind = kindOf(signal);
  const { icon: Icon, tone } = KIND[kind];
  const from = [signal.sourceName, signal.whoName, signal.when]
    .filter(Boolean)
    .join(" · ");
  return (
    <article
      key={signal.id}
      className="grid animate-enter content-start gap-4 rounded-[18px] bg-card p-5 shadow-soft"
    >
      <header className="grid gap-2">
        <span
          className={cn(
            "flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-tag",
            tone,
          )}
        >
          <Icon aria-hidden className="size-3" />
          {t(`signals.kind.${kind}`)}
        </span>
        <p className="text-section">{quoted(signal.text)}</p>
        <p className="text-note text-muted-foreground">{from}</p>
      </header>
      <Where signal={signal} />
      <Already signal={signal} />
      <JobLine job={job?.working || signal.went === null ? job : undefined} />
      <SignalActions
        signal={signal}
        moving={moving}
        quiet
        onMove={() => {
          setMoving(!moving);
        }}
      />
      {moving && (
        <MoveForm
          signal={signal}
          onMoved={() => {
            setMoving(false);
          }}
        />
      )}
    </article>
  );
}

// Who it sounds like, and where the kobold put it.
function Where({ signal }: Readonly<{ signal: SignalView }>) {
  const { t } = useTranslation("understand");
  const went = wentWords(signal);
  return (
    <div className="flex flex-wrap items-center gap-2 text-body">
      {signal.soundsLike && signal.soundsLikeName && (
        <a
          href={understandHash(signal.soundsLike)}
          className="rounded-full bg-surface-2 px-2.5 py-0.5 text-tag text-foreground-2 transition-colors hover:bg-hover"
        >
          {t("signal.soundsLike", { name: signal.soundsLikeName })}
        </a>
      )}
      <ArrowRight aria-hidden className="size-4 text-muted-foreground" />
      {went.href ? (
        <a
          href={went.href}
          className="font-medium underline-offset-4 hover:underline"
        >
          {went.words}
        </a>
      ) : (
        <span className="font-medium">{went.words}</span>
      )}
      {signal.why && <Why why={signal.why} />}
    </div>
  );
}

// What already exists for its problem, as one soft row: an idea leads to
// it on Explore.
function Already({ signal }: Readonly<{ signal: SignalView }>) {
  const already = alreadyOf(signal);
  if (!already) return null;
  const words = alreadyWords(already);
  const look =
    "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-body transition-colors";
  if (already.kind === "explored")
    return (
      <a
        href={exploreHash(already.idea.id)}
        className={cn(look, "bg-tint hover:bg-hover")}
      >
        <span className="flex-1">{words}</span>
        <ArrowRight aria-hidden className="size-4 text-muted-foreground" />
      </a>
    );
  return (
    <p className={cn(look, "bg-solved text-solved-foreground")}>
      <Check aria-hidden className="size-4" />
      {words}
    </p>
  );
}
