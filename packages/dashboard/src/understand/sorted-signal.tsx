// A signal the kobold sorted: what was said, where it went and why, with
// Move (put it elsewhere) and Looks good (a person agrees, and their name
// goes on it); a bug or an update sent to Build gets a fix ticket. While
// the kobold works on it, what it is doing.

import { useState } from "react";

import { type KoboldJob, messageOf, post, type SignalView } from "@/api";
import { FixTicketFor } from "@/build/fix-ticket";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";

import { MoveForm } from "./move-form";
import { wentWords } from "./view";

export function SortedSignal({
  signal,
  job,
}: Readonly<{ signal: SignalView; job?: KoboldJob }>) {
  const [moving, setMoving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const went = wentWords(signal);
  const from = [signal.sourceName, signal.whoName, signal.when].filter(Boolean);
  const agree = async () => {
    setProblem(null);
    try {
      await post("/api/understand/looks-good", { signal: signal.id });
    } catch (error) {
      setProblem(messageOf(error));
    }
  };
  return (
    <div className="grid gap-1.5 border-t border-border-soft pt-2.5 sm:pl-10">
      <p className="text-sm">{signal.text}</p>
      <p className="text-xs text-muted-foreground">From {from.join(" · ")}</p>
      <p className="flex flex-wrap items-center gap-x-2 text-sm">
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
            · sounds like {signal.soundsLikeName}
          </span>
        )}
      </p>
      {signal.why && (
        <p className="text-xs text-muted-foreground">{signal.why}</p>
      )}
      {/* Why the kobold could not sort it, while it is still not sorted. */}
      <JobLine job={job?.working || signal.went === null ? job : undefined} />
      <div className="flex gap-2 pt-0.5">
        <Button
          variant="outline"
          size="xs"
          aria-expanded={moving}
          onClick={() => {
            setMoving(!moving);
          }}
        >
          Move
        </Button>
        {signal.went !== null && signal.by === "kobold" && (
          <Button variant="outline" size="xs" onClick={() => void agree()}>
            Looks good
          </Button>
        )}
        <FixTicketFor signal={signal} />
      </div>
      {moving && (
        <MoveForm
          signal={signal}
          onMoved={() => {
            setMoving(false);
          }}
        />
      )}
      {problem && <ProblemBox title="That did not work" text={problem} />}
    </div>
  );
}

// What the kobold is doing with it, or why it could not.
export function JobLine({ job }: Readonly<{ job?: KoboldJob }>) {
  if (!job) return null;
  if (job.working)
    return (
      <p className="animate-breathe text-xs text-primary" role="status">
        The kobold is sorting it{job.activity ? `: ${job.activity}` : "…"}
      </p>
    );
  return job.problem ? (
    <p className="text-xs text-destructive">{job.problem}</p>
  ) : null;
}
