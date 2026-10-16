import { ArrowRight, Lightbulb } from "lucide-react";
import { useState } from "react";

import { type IdeaView, messageOf, post } from "@/api";
import { Accent } from "@/components/accent";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import type { FactoryState } from "@/dashboard/dashboard";
import { cn } from "@/lib/utils";

import { IdeaWorkspace } from "./idea-workspace";

// The factory's ideas: a new one started with a sentence, the ones there,
// newest first, and one open in its workspace (#ideas/<id>).
export function IdeasTab({
  state,
  open,
}: Readonly<{ state: FactoryState; open: string | null }>) {
  const idea = state.ideas.find((one) => one.id === open);
  if (idea) return <IdeaWorkspace idea={idea} />;
  return (
    <div className="grid max-w-4xl gap-5">
      <h1 className="px-1 pt-2 text-[30px] font-medium tracking-[-0.02em]">
        Your <Accent>ideas</Accent>
      </h1>
      <NewIdea />
      {state.ideas.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">
          No ideas yet. Say what you would like next, and the factory shapes it
          with you.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {state.ideas.map((one) => (
            <IdeaCard key={one.id} idea={one} />
          ))}
        </div>
      )}
    </div>
  );
}

function NewIdea() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const start = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setProblem(null);
    try {
      const { id } = await post<{ id: string }>("/api/ideas", { text });
      window.location.hash = `ideas/${id}`;
    } catch (error) {
      setProblem(messageOf(error));
      setBusy(false);
    }
  };
  return (
    <section
      aria-label="A new idea"
      className="glow-card grid gap-3 rounded-3xl p-5 shadow-soft"
    >
      <label htmlFor="new-idea" className="text-sm font-medium">
        What would you like next?
      </label>
      <textarea
        id="new-idea"
        rows={2}
        value={text}
        placeholder="A wish list, so customers can save what they like for later…"
        className="resize-none rounded-xl bg-card px-4 py-3 text-[15px] outline-none ring-1 ring-border placeholder:text-muted-foreground"
        onChange={(event) => {
          setText(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey) return;
          event.preventDefault();
          void start();
        }}
      />
      {problem && <ProblemBox title="That did not work" text={problem} />}
      <Button
        className="h-10 justify-self-end px-4"
        disabled={busy || !text.trim()}
        onClick={() => void start()}
      >
        Shape it with the factory <ArrowRight aria-hidden />
      </Button>
    </section>
  );
}

function IdeaCard({ idea }: Readonly<{ idea: IdeaView }>) {
  const ready = idea.status === "ready";
  return (
    <a
      href={`#ideas/${idea.id}`}
      className="grid gap-2 rounded-2xl bg-card p-4 shadow-soft hover:ring-1 hover:ring-foreground/20"
    >
      <span className="flex items-start gap-2">
        <Lightbulb
          className="mt-0.5 size-4 flex-none text-muted-foreground"
          aria-hidden
        />
        <span className="flex-1 text-[15px] font-medium">{idea.title}</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium",
            ready ? "bg-success/15 text-success" : "bg-surface-2",
          )}
        >
          {ready ? "Ready" : "Planning"}
        </span>
      </span>
      <span className="text-xs text-muted-foreground">
        {idea.working ? "The factory is thinking… · " : ""}
        {String(idea.draft.cards.length)} cards · {when(idea.updated)}
      </span>
    </a>
  );
}

// "today at 10:24", or the date.
function when(iso: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return date.toDateString() === new Date().toDateString()
    ? `today at ${time}`
    : date.toLocaleDateString();
}
