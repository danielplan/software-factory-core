// One signal on the board: what was said (three lines at most), who it
// sounds like (their little kobold) or else where it came from, and when;
// what already exists for its problem as a small chip; and Fix, Explore (or
// Add to the idea) and Dismiss, shown when the mouse or the focus is on the
// card (always on a touch screen). Pressing the words opens it in full.

import { useTranslation } from "react-i18next";

import type { SignalView } from "@/api";
import { cn } from "@/lib/utils";
import { Initial } from "@/understand/bits";
import { alreadyOf, alreadyWords } from "@/understand/view";

import { TriageActions } from "./triage-actions";
import { quoted, signalsHash } from "./view";

export function SignalCard({
  signal,
  tint,
}: Readonly<{ signal: SignalView; tint: (persona: string) => string }>) {
  const { t } = useTranslation("understand");
  const already = alreadyOf(signal);
  return (
    <article className="group grid animate-enter gap-2.5 rounded-xl bg-card p-3.5 shadow-soft transition-shadow hover:shadow-lift">
      <a
        href={signalsHash(signal.id)}
        aria-label={t("signals.open", { text: quoted(signal.text) })}
        className="grid gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="line-clamp-3 text-item">{quoted(signal.text)}</span>
        <Who signal={signal} tint={tint} />
      </a>
      {already && (
        <span
          className={cn(
            "w-fit rounded-full px-2 py-0.5 text-tag",
            already.kind === "explored"
              ? "bg-tint text-tint-foreground"
              : "bg-solved text-solved-foreground",
          )}
        >
          {alreadyWords(already)}
        </span>
      )}
      <div className="transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100">
        <TriageActions signal={signal} compact />
      </div>
    </article>
  );
}

// Who it sounds like (their little kobold and name), or else where it came
// from; and when.
function Who({
  signal,
  tint,
}: Readonly<{ signal: SignalView; tint: (persona: string) => string }>) {
  const person =
    signal.soundsLike && signal.soundsLikeName
      ? { id: signal.soundsLike, name: signal.soundsLikeName }
      : null;
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-note text-muted-foreground">
      {person && <Initial name={person.name} tint={tint(person.id)} small />}
      <span className="truncate">
        {[person?.name ?? signal.sourceName, signal.when]
          .filter(Boolean)
          .join(" · ")}
      </span>
    </span>
  );
}
