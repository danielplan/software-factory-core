// Understand's third level: one story. Where it starts and what the
// persona wants, then scene by scene, each with what shows it (its source
// and the first thing said) or guessed, the scene where it breaks marked,
// and what they do instead. When scenes are guessed, the kobold offers to
// draft a question for people like the persona. Beside it: the problem it
// breaks at, the real problem behind that, and the ideas for it.

import type { StoryPage } from "@/api";
import { cn } from "@/lib/utils";

import { Initial, Label, Squares } from "./bits";
import { AskLine } from "./ask-line";
import { StorySide } from "./story-side";
import { evidenceOf, guessedCount, storyFrom } from "./view";

export function StoryView({
  page,
  tint,
}: Readonly<{ page: StoryPage; tint: string }>) {
  const { story, persona } = page;
  const parts = [...story.scenes, ...(story.instead ? [story.instead] : [])];
  const seen = parts.map((part) => part.evidence.length > 0);
  const from = storyFrom(page);
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section
        aria-label="The story"
        className="grid gap-3.5 rounded-2xl bg-card px-6 py-5 shadow-soft"
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <Initial name={persona.name} tint={tint} />
          <span className="flex-1 text-sm">
            <span className="font-semibold">{persona.name}</span>{" "}
            <span className="text-muted-foreground">{persona.role}</span>
          </span>
          <span className="text-xs text-muted-foreground">{from}</span>
        </div>
        {story.wrong !== null && (
          <p className="rounded-xl bg-surface px-3.5 py-2.5 text-sm">
            It didn't hold: {story.wrong}
          </p>
        )}
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Box title="Starts" text={story.starts || "Not said yet"} />
          <Box title="Wants" text={story.wants || "Not said yet"} />
        </div>
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <span className="flex-1">Scene by scene</span>
          <Squares seen={seen} />
          {page.known.seen} of {page.known.of} scenes seen
        </div>
        <ol className="grid gap-2">
          {story.scenes.map((scene, at) => (
            <Scene
              key={`${String(at)}-${scene.text}`}
              where={scene.where}
              text={scene.text}
              evidence={evidenceOf(scene.evidence, page.signals)}
              breaks={scene.breaks}
            />
          ))}
          {story.instead && (
            <Scene
              where="Instead"
              text={story.instead.text}
              evidence={evidenceOf(story.instead.evidence, page.signals)}
              instead
            />
          )}
        </ol>
        {guessedCount(seen) > 0 && story.wrong === null && (
          <AskLine
            story={story.id}
            guessed={guessedCount(seen)}
            persona={persona.name}
          />
        )}
      </section>
      <StorySide page={page} />
    </div>
  );
}

function Box({ title, text }: Readonly<{ title: string; text: string }>) {
  return (
    <div className="grid gap-0.5 rounded-xl bg-surface px-3.5 py-2.5">
      <Label>{title}</Label>
      <span className="text-[15px]">{text}</span>
    </div>
  );
}

function Scene({
  where,
  text,
  evidence,
  breaks = false,
  instead = false,
}: Readonly<{
  where: string | null;
  text: string;
  evidence: { source: string; text: string } | null;
  breaks?: boolean;
  instead?: boolean;
}>) {
  return (
    <li
      className={cn(
        "grid items-center gap-x-4 gap-y-1 rounded-xl border px-3.5 py-2.5 sm:grid-cols-[110px_minmax(0,1fr)_auto]",
        breaks && "border-fresh bg-fresh/[0.06] ring-1 ring-fresh",
        instead && "border-dashed",
      )}
    >
      <span
        className={cn(
          "text-[13px] font-medium text-muted-foreground",
          breaks && "text-fresh",
        )}
      >
        {where ?? ""}
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className="text-[15px] font-medium">{text}</span>
        {evidence && (
          <span className="truncate text-[13px] text-muted-foreground">
            {evidence.text}
          </span>
        )}
      </span>
      <span className="flex gap-1.5">
        {breaks && (
          <span className="rounded-full bg-fresh px-2.5 py-0.5 text-xs font-semibold text-white">
            breaks here
          </span>
        )}
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
            evidence
              ? "bg-solved text-solved-foreground"
              : "bg-surface-2 text-muted-foreground",
          )}
        >
          {evidence ? evidence.source : "guessed"}
        </span>
      </span>
    </li>
  );
}
