// Understand's third level: one story, told as a short paragraph. Where it
// starts and what the persona wants in a line above; then each scene as a
// sentence, in order, with what they do instead last. The sentence where it
// breaks is marked in the problem's colour; a guessed one is grey, and a
// seen one has a small mark that shows what was said, and where, on hover
// or focus. Under it, how much is seen, and the kobold's offer to ask
// about what is guessed; the signals the kobold put in it that nobody has
// looked at, to agree with or move. Beside it: the problem it breaks at and
// the ideas for it.

import { Tooltip } from "radix-ui";

import type { SignalView, StoryPage } from "@/api";
import { cn } from "@/lib/utils";

import { AskLine } from "./ask-line";
import { Initial } from "./bits";
import { SortedSignal } from "./sorted-signal";
import { StorySide } from "./story-side";
import { type Sentence, sentencesOf, storyFrom } from "./view";

export function StoryView({
  page,
  tint,
  toLookAt,
}: Readonly<{ page: StoryPage; tint: string; toLookAt: SignalView[] }>) {
  const { story, persona } = page;
  const setting = [
    story.starts && `Starts: ${story.starts}`,
    story.wants && `Wants: ${story.wants}`,
  ].filter(Boolean);
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section
        aria-label="The story"
        className="grid gap-4 rounded-2xl bg-card px-6 py-5 shadow-soft"
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <Initial name={persona.name} tint={tint} />
          <span className="flex-1 text-sm">
            <span className="font-semibold">{persona.name}</span>{" "}
            <span className="text-muted-foreground">{persona.role}</span>
          </span>
          <span className="text-xs text-label">{storyFrom(page)}</span>
        </div>
        {story.wrong !== null && (
          <p className="rounded-xl bg-wrong px-3.5 py-2.5 text-sm text-wrong-foreground">
            It didn't hold: {story.wrong}
          </p>
        )}
        {setting.length > 0 && (
          <p className="text-[13px] text-muted-foreground">
            {setting.join(" · ")}
          </p>
        )}
        <Prose sentences={sentencesOf(page)} />
        <AskLine
          story={story.id}
          known={page.known}
          persona={persona.name}
          canAsk={story.wrong === null}
        />
        {toLookAt.length > 0 && (
          <div className="grid gap-2">
            <p className="text-[13px] font-medium">
              The kobold put these here. Does each fit?
            </p>
            {toLookAt.map((signal) => (
              <SortedSignal key={signal.id} signal={signal} />
            ))}
          </div>
        )}
      </section>
      <StorySide page={page} />
    </div>
  );
}

function Prose({ sentences }: Readonly<{ sentences: Sentence[] }>) {
  return (
    <Tooltip.Provider delayDuration={150}>
      <p className="text-[17px] leading-[1.75]">
        {sentences.map((one, at) => (
          <span key={`${String(at)}-${one.text}`}>
            {at > 0 && " "}
            <span
              className={cn(
                "rounded-md",
                one.breaks &&
                  "bg-open box-decoration-clone px-1 py-0.5 text-open-foreground",
                !one.evidence && !one.breaks && "text-muted-foreground italic",
              )}
            >
              {one.text}
            </span>
            {one.evidence && <Evidence evidence={one.evidence} />}
          </span>
        ))}
      </p>
    </Tooltip.Provider>
  );
}

// A seen sentence's mark: the source's first letter, raised; what was said
// and where, on hover or focus.
function Evidence({
  evidence,
}: Readonly<{ evidence: NonNullable<Sentence["evidence"]> }>) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          aria-label={`Seen, in ${evidence.source}: ${evidence.text}`}
          className="relative -top-2 ml-0.5 inline-grid size-4 place-items-center rounded-full bg-solved align-baseline text-[10px] leading-none font-semibold text-solved-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {evidence.source.slice(0, 1).toUpperCase()}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={6}
          className="z-50 grid max-w-xs gap-1 rounded-xl bg-popover px-3.5 py-2.5 text-[13px] text-popover-foreground shadow-[0_0_0_1px_var(--border),var(--shadow-big)]"
        >
          <span>{evidence.text}</span>
          <span className="text-xs text-label">{evidence.source}</span>
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
