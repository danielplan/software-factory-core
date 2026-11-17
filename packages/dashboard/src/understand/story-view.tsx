// Understand's third level: one story, step by step, across the page: the
// story on the left, what goes wrong and what to check on the right. Each
// scene is a step of a timeline: seen (a check; what was said, and where,
// on hover or focus), guessed (a question mark, muted) or where it goes
// wrong (a cross, in the problem's colour); what they do instead comes
// last, then the kobold's offer to ask about what is guessed. Beside it,
// what goes wrong and the ideas for it, and what the kobold put in the
// story that nobody has looked at, to agree with or move.

import { Check, CircleHelp, CornerDownRight, X } from "lucide-react";
import { Tooltip } from "radix-ui";
import { useTranslation } from "react-i18next";

import type { SignalView, StoryPage } from "@/api";
import { cn } from "@/lib/utils";

import { AskLine } from "./ask-line";
import { Initial } from "./bits";
import { SortedSignal } from "./sorted-signal";
import { StoryProblem } from "./story-problem";
import { type Sentence, sentencesOf, storyFrom } from "./view";

export function StoryView({
  page,
  tint,
  toLookAt,
}: Readonly<{ page: StoryPage; tint: string; toLookAt: SignalView[] }>) {
  const { t } = useTranslation("understand");
  const { story, persona } = page;
  const setting = [
    story.starts && t("story.starts", { text: story.starts }),
    story.wants && t("story.wants", { text: story.wants }),
  ].filter(Boolean);
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section
        aria-label={t("story.label")}
        className="grid gap-4 rounded-2xl bg-card p-5 shadow-soft"
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <Initial name={persona.name} tint={tint} />
          <span className="grid flex-1">
            <span className="text-item">
              {persona.name}{" "}
              <span className="text-body text-muted-foreground">
                {persona.role}
              </span>
            </span>
            {setting.length > 0 && (
              <span className="text-note text-muted-foreground">
                {setting.join(" · ")}
              </span>
            )}
          </span>
          {"idea" in story.from && (
            <span className="text-tag text-muted-foreground">
              {storyFrom(page)}
            </span>
          )}
        </div>
        {story.wrong !== null && (
          <p className="rounded-xl bg-wrong px-3.5 py-2.5 text-body text-wrong-foreground">
            {t("story.didntHold", { why: story.wrong })}
          </p>
        )}
        <Timeline sentences={sentencesOf(page)} />
        <AskLine
          story={story.id}
          known={page.known}
          persona={persona.name}
          canAsk={story.wrong === null}
        />
      </section>
      <div className="grid content-start gap-5">
        <StoryProblem page={page} />
        {toLookAt.length > 0 && <ToCheck signals={toLookAt} />}
      </div>
    </div>
  );
}

function Timeline({ sentences }: Readonly<{ sentences: Sentence[] }>) {
  return (
    <Tooltip.Provider delayDuration={150}>
      <ol className="grid gap-1">
        {sentences.map((one, at) => (
          <li
            key={`${String(at)}-${one.text}`}
            className={cn(
              "relative flex items-start gap-3 rounded-xl px-3 py-2",
              one.breaks && "bg-open text-open-foreground",
            )}
          >
            {at < sentences.length - 1 && (
              <span
                aria-hidden
                className="absolute top-8 bottom-[-10px] left-[23px] w-px bg-border"
              />
            )}
            <StepMark sentence={one} />
            <span
              className={cn(
                "flex-1 pt-px text-body",
                !one.evidence && !one.breaks && "text-muted-foreground italic",
              )}
            >
              {one.text}
            </span>
            <StepTag sentence={one} />
          </li>
        ))}
      </ol>
    </Tooltip.Provider>
  );
}

const MARK = "relative grid size-6 flex-none place-items-center rounded-full";

// The step's mark: seen, guessed, where it goes wrong, or instead.
function StepMark({ sentence }: Readonly<{ sentence: Sentence }>) {
  const { t } = useTranslation("understand");
  if (sentence.breaks)
    return (
      <span className={cn(MARK, "bg-fresh text-white")}>
        <X aria-label={t("story.breaksLabel")} className="size-3.5" />
      </span>
    );
  if (sentence.evidence) return <Seen evidence={sentence.evidence} />;
  if (sentence.instead)
    return (
      <span className={cn(MARK, "bg-surface-2 text-muted-foreground")}>
        <CornerDownRight
          aria-label={t("story.insteadLabel")}
          className="size-3.5"
        />
      </span>
    );
  return (
    <span className={cn(MARK, "bg-surface-2 text-muted-foreground")}>
      <CircleHelp aria-label={t("story.guessedLabel")} className="size-3.5" />
    </span>
  );
}

function StepTag({ sentence }: Readonly<{ sentence: Sentence }>) {
  const { t } = useTranslation("understand");
  let tag: string | null = null;
  if (sentence.breaks) tag = t("story.breaksTag");
  else if (!sentence.evidence) tag = t("story.guessTag");
  if (!tag) return null;
  return (
    <span
      className={cn(
        "flex-none pt-1 text-tag",
        !sentence.breaks && "text-muted-foreground",
      )}
    >
      {tag}
    </span>
  );
}

// A seen step's mark: a check; what was said and where, on hover or focus.
function Seen({
  evidence,
}: Readonly<{ evidence: NonNullable<Sentence["evidence"]> }>) {
  const { t } = useTranslation("understand");
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          aria-label={t("story.seenLabel", {
            source: evidence.source,
            text: evidence.text,
          })}
          className={cn(
            MARK,
            "bg-solved text-solved-foreground outline-none hover:ring-2 hover:ring-success/40 focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <Check aria-hidden className="size-3.5" />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={6}
          className="z-50 grid max-w-xs gap-1 rounded-xl bg-popover px-3.5 py-2.5 text-note text-popover-foreground shadow-[0_0_0_1px_var(--border),var(--shadow-big)]"
        >
          <span>{evidence.text}</span>
          <span className="text-tag text-muted-foreground">
            {evidence.source}
          </span>
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

// What the kobold put in this story that nobody has looked at yet: each
// with Looks good or Move.
function ToCheck({ signals }: Readonly<{ signals: SignalView[] }>) {
  const { t } = useTranslation("understand");
  return (
    <section
      aria-label={t("story.toCheck")}
      className="grid gap-3 rounded-2xl bg-card p-5 shadow-soft"
    >
      <h2 className="flex items-baseline gap-2 text-section">
        {t("story.toCheck")}
        <span className="text-note text-muted-foreground">
          {signals.length}
        </span>
      </h2>
      {signals.map((signal) => (
        <SortedSignal key={signal.id} signal={signal} inStory />
      ))}
    </section>
  );
}
