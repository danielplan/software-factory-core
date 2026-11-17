// Something people said, that the kobold placed: what was said, where it
// went (why, on a small (?)), and what a person does with it (signal-actions.tsx: Fix,
// Explore, Dismiss; agree with where it is, or move it). While the kobold
// works on it, what it is doing.

import { CircleHelp } from "lucide-react";
import { Tooltip } from "radix-ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { KoboldJob, SignalView } from "@/api";
import { cn } from "@/lib/utils";

import { MoveForm } from "./move-form";
import { SignalActions } from "./signal-actions";
import { wentWords } from "./view";

// In a story's own page (inStory) it says nothing of where it went: that is
// the story shown.
export function SortedSignal({
  signal,
  job,
  inStory = false,
}: Readonly<{ signal: SignalView; job?: KoboldJob; inStory?: boolean }>) {
  const { t } = useTranslation("understand");
  const [moving, setMoving] = useState(false);
  const from = [signal.sourceName, signal.whoName, signal.when].filter(Boolean);
  return (
    <div
      className={cn(
        "grid gap-1.5 border-t border-border-soft pt-2.5",
        !inStory && "sm:pl-10",
      )}
    >
      <p className="text-item">{signal.text}</p>
      <p className="text-note text-muted-foreground">
        {t("signal.from", { where: from.join(" · ") })}
      </p>
      {!inStory && <Went signal={signal} />}
      {/* Why the kobold could not sort it, while it is still not sorted. */}
      <JobLine job={job?.working || signal.went === null ? job : undefined} />
      <SignalActions
        signal={signal}
        moving={moving}
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
    </div>
  );
}

// Where it went, who it sounds like, and why.
function Went({ signal }: Readonly<{ signal: SignalView }>) {
  const { t } = useTranslation("understand");
  const went = wentWords(signal);
  return (
    <>
      <p className="flex flex-wrap items-center gap-x-2 text-body">
        <span aria-hidden>→</span>
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
        {signal.soundsLikeName && (
          <span className="text-muted-foreground">
            · {t("signal.soundsLike", { name: signal.soundsLikeName })}
          </span>
        )}
        {signal.why && <Why why={signal.why} />}
      </p>
    </>
  );
}

// Why the kobold placed it there: on hover or focus of a small (?).
export function Why({ why }: Readonly<{ why: string }>) {
  const { t } = useTranslation("understand");
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            aria-label={t("signal.why", { why })}
            className="inline-grid size-5 place-items-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CircleHelp aria-hidden className="size-3.5" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={6}
            className="z-50 max-w-xs rounded-xl bg-popover px-3.5 py-2.5 text-note text-popover-foreground shadow-[0_0_0_1px_var(--border),var(--shadow-big)]"
          >
            {why}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

// What the kobold is doing with it, or why it could not.
export function JobLine({ job }: Readonly<{ job?: KoboldJob }>) {
  const { t } = useTranslation("understand");
  if (!job) return null;
  if (job.working)
    return (
      <p className="animate-breathe text-tag text-primary" role="status">
        {job.activity
          ? t("signal.readingWhat", { what: job.activity })
          : t("signal.reading")}
      </p>
    );
  return job.problem ? (
    <p className="text-tag text-destructive">{job.problem}</p>
  ) : null;
}
