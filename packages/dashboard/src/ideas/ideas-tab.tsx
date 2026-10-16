import { useState } from "react";

import { messageOf, post } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import type { FactoryState } from "@/dashboard/dashboard";

import { IdeaCard } from "./idea-card";
import { IdeaWorkspace } from "./idea-workspace";

// Where work starts: a new idea in a sentence, the ideas being shaped and
// the ones agreed to, and one open in its workspace (#ideas/<id>).
export function IdeasTab({
  state,
  open,
}: Readonly<{ state: FactoryState; open: string | null }>) {
  const idea = state.ideas.find((one) => one.id === open);
  if (idea) return <IdeaWorkspace idea={idea} />;
  return (
    <div className="grid max-w-3xl gap-5">
      <NewIdea />
      {state.ideas.length > 0 && (
        <div className="grid gap-2.5 sm:grid-cols-2">
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
        className="resize-none rounded-xl bg-card px-4 py-3 text-[15px] ring-1 ring-border outline-none placeholder:text-muted-foreground"
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
        Shape it with the factory
      </Button>
    </section>
  );
}
