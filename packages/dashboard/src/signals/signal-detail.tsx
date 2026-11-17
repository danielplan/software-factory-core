// The one signal shown on Signals, in a big card: what was said, where it
// came from and when, who it sounds like (their little kobold), what already
// exists for its problem when something does, and what to do with it.

import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { KoboldJob, SignalView } from "@/api";
import { exploreHash, understandHash } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { Initial } from "@/understand/bits";
import { MoveForm } from "@/understand/move-form";
import { JobLine } from "@/understand/sorted-signal";
import { alreadyOf, alreadyWords } from "@/understand/view";

import { TriageActions } from "./triage-actions";
import { quoted } from "./view";

export function SignalDetail({
  signal,
  job,
  tint,
}: Readonly<{
  signal: SignalView;
  job?: KoboldJob;
  // The tint of the persona it sounds like, as on Personas.
  tint: (persona: string) => string;
}>) {
  const [moving, setMoving] = useState(false);
  return (
    <article
      key={signal.id}
      className="grid w-full max-w-2xl animate-enter gap-5 justify-self-center rounded-[22px] bg-card p-6 shadow-soft sm:p-8"
    >
      <header className="grid gap-2">
        <p className="text-section">{quoted(signal.text)}</p>
        <From signal={signal} tint={tint} />
      </header>
      <Already signal={signal} />
      <JobLine job={job?.working || signal.went === null ? job : undefined} />
      <TriageActions
        signal={signal}
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

// Where it came from and when, and who it sounds like.
function From({
  signal,
  tint,
}: Readonly<{ signal: SignalView; tint: (persona: string) => string }>) {
  const where = [signal.sourceName, signal.whoName, signal.when]
    .filter(Boolean)
    .join(" · ");
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-note text-muted-foreground">
      <span>{where}</span>
      {signal.soundsLike && signal.soundsLikeName && (
        <a
          href={understandHash(signal.soundsLike)}
          className="flex items-center gap-1.5 text-foreground-2 transition-colors hover:text-foreground"
        >
          <span aria-hidden>·</span>
          <Initial
            name={signal.soundsLikeName}
            tint={tint(signal.soundsLike)}
            small
          />
          {signal.soundsLikeName}
        </a>
      )}
    </p>
  );
}

// What already exists for its problem, as one soft line: an idea leads to
// it on Explorations.
function Already({ signal }: Readonly<{ signal: SignalView }>) {
  const { t } = useTranslation("understand");
  const already = alreadyOf(signal);
  if (!already) return null;
  const words = alreadyWords(already);
  const look =
    "flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-body transition-colors";
  if (already.kind === "explored")
    return (
      <a
        href={exploreHash(already.idea.id)}
        aria-label={t("signals.openIdea", { title: already.idea.title })}
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
