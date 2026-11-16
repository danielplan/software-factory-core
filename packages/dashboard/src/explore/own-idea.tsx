// "My own idea": what you have in mind and who it is for. The kobold writes
// the idea with the story it assumes behind it, every scene guessed and its
// problem assumed, so it can be checked later; you keep it, or throw it
// away.

import { useState } from "react";

import { type IdeaPage, type KoboldJob, messageOf, post } from "@/api";
import type { PersonaTag } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { exploreHash } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { Initial, KoboldMark } from "@/understand/bits";
import { useKoboldJobs } from "@/understand/use-records";
import { tintOf } from "@/understand/view";

import { useIdeaPage } from "./use-explore";

export function OwnIdea({ personas }: Readonly<{ personas: PersonaTag[] }>) {
  const [text, setText] = useState("");
  const [persona, setPersona] = useState<string | null>(null);
  const [job, setJob] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const draft = async () => {
    setProblem(null);
    try {
      const sent = await post<{ job: KoboldJob }>("/api/explore/own", {
        text,
        persona,
      });
      setJob(sent.job.id);
    } catch (error) {
      setProblem(messageOf(error));
    }
  };
  if (job)
    return (
      <Drafting
        job={job}
        onAgain={() => {
          setJob(null);
        }}
      />
    );
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Describe your idea. The kobold writes the story it assumes, with every
        scene guessed, so it can be checked later.
      </p>
      <textarea
        aria-label="Your idea"
        value={text}
        rows={3}
        placeholder="A standing order: the usual supplies arrive every Monday without ordering."
        onChange={(event) => {
          setText(event.target.value);
        }}
        className="w-full rounded-[10px] border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      <div className="grid gap-1.5">
        <span className="text-sm font-medium">For whom?</span>
        <div className="flex flex-wrap gap-2">
          {personas.map((one) => (
            <button
              key={one.id}
              type="button"
              aria-pressed={one.id === persona}
              onClick={() => {
                setPersona(one.id);
              }}
              className={cn(
                "flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm",
                one.id === persona &&
                  "border-foreground ring-1 ring-foreground",
              )}
            >
              <Initial name={one.name} tint={tintOf(one.at)} />
              {one.name}
            </button>
          ))}
        </div>
      </div>
      {problem && <ProblemBox title="It could not be drafted" text={problem} />}
      <Button
        className="w-fit"
        disabled={!text.trim() || !persona}
        onClick={() => void draft()}
      >
        Draft the story
      </Button>
    </div>
  );
}

// While the kobold writes it, what it is doing; then the story it assumes.
function Drafting({
  job: id,
  onAgain,
}: Readonly<{ job: string; onAgain: () => void }>) {
  const job = useKoboldJobs().find((one) => one.id === id);
  if (job?.made) return <Assumed idea={job.made} onAgain={onAgain} />;
  if (job?.problem)
    return (
      <div className="grid gap-3">
        <ProblemBox title="The kobold could not write it" text={job.problem} />
        <Button variant="outline" className="w-fit" onClick={onAgain}>
          Try again
        </Button>
      </div>
    );
  return (
    <p
      className="flex animate-breathe items-center gap-2 text-sm text-primary"
      role="status"
    >
      <KoboldMark />
      The kobold is writing the story behind your idea
      {job?.activity ? `: ${job.activity}` : "…"}
    </p>
  );
}

function Assumed({
  idea,
  onAgain,
}: Readonly<{ idea: string; onAgain: () => void }>) {
  const { data } = useIdeaPage(idea);
  if (!data?.assumed) return null;
  const discard = () => {
    void post("/api/explore/discard", { idea }).then(onAgain);
  };
  return (
    <div className="grid gap-3">
      <p className="flex items-center gap-2 text-sm">
        <KoboldMark />
        The story behind your idea, as the kobold assumes it:
      </p>
      <AssumedStory page={data} />
      <p className="text-xs text-muted-foreground">
        Nothing anyone said is behind it yet. When a signal matches a scene, it
        turns from guessed to seen.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={discard}>
          Throw it away
        </Button>
        <Button asChild>
          <a href={exploreHash(idea)}>Keep the idea</a>
        </Button>
      </div>
    </div>
  );
}

function AssumedStory({ page }: Readonly<{ page: IdeaPage }>) {
  const story = page.assumed;
  if (!story) return null;
  const problem = page.for[0];
  return (
    <div className="grid gap-2 rounded-2xl bg-surface px-4 py-3.5">
      <p className="flex items-center gap-2">
        <Initial
          name={page.persona?.name ?? "?"}
          tint={tintOf(page.persona?.at ?? 0)}
        />
        <b className="flex-1">{story.title}</b>
        <span className="rounded-full border px-2 py-0.5 text-xs">assumed</span>
      </p>
      <p className="text-xs text-muted-foreground">
        Starts: {story.starts || "not said"} · Wants:{" "}
        {story.wants || "not said"}
      </p>
      <ol className="grid gap-1.5">
        {story.scenes.map((scene, at) => (
          <li
            key={`${String(at)}-${scene.text}`}
            className="grid grid-cols-[90px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-dashed bg-card px-3 py-2 text-sm"
          >
            <span className="text-xs text-muted-foreground">
              {scene.where ?? ""}
            </span>
            <span>{scene.text}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                scene.breaks ? "bg-open text-open-foreground" : "bg-surface-2",
              )}
            >
              {scene.breaks ? "breaks here · guessed" : "guessed"}
            </span>
          </li>
        ))}
      </ol>
      {problem && (
        <p className="text-xs">
          <span className="text-muted-foreground">Assumed problem </span>
          <b>{problem.title}</b>
        </p>
      )}
    </div>
  );
}
