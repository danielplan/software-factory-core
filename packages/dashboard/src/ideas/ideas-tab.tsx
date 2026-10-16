import { ArrowUp } from "lucide-react";
import { useState } from "react";

import { messageOf, post } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import type { FactoryState } from "@/dashboard/dashboard";

import { IdeaCard } from "./idea-card";
import { IdeaWorkspace } from "./idea-workspace";

// Where work starts: one big box to say what to build next, and the ideas
// so far below it, newest first; one open in its workspace (#ideas/<id>).
export function IdeasTab({
  state,
  open,
}: Readonly<{ state: FactoryState; open: string | null }>) {
  const idea = state.ideas.find((one) => one.id === open);
  if (idea) return <IdeaWorkspace idea={idea} />;
  return (
    <div className="grid gap-12 pt-[12vh]">
      <NewIdea />
      {state.ideas.length > 0 && (
        <section aria-label="Your ideas" className="grid gap-3">
          <h2 className="px-1 text-sm font-medium">Your ideas</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {state.ideas.map((one) => (
              <IdeaCard key={one.id} idea={one} />
            ))}
          </div>
        </section>
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
      className="mx-auto grid w-full max-w-[720px] gap-5"
    >
      <h1 className="text-center text-[34px] font-medium tracking-[-0.02em]">
        What should we build next?
      </h1>
      <form
        className="glow-ring flex items-end gap-2 rounded-[22px] bg-card p-3 pl-5 shadow-big"
        onSubmit={(event) => {
          event.preventDefault();
          void start();
        }}
      >
        <label htmlFor="new-idea" className="sr-only">
          Your idea
        </label>
        <textarea
          id="new-idea"
          rows={3}
          autoFocus
          value={text}
          placeholder="A wish list, so customers can save what they like for later…"
          className="min-h-20 flex-1 resize-none bg-transparent py-2 text-base outline-none placeholder:text-muted-foreground"
          onChange={(event) => {
            setText(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey) return;
            event.preventDefault();
            void start();
          }}
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Shape it with the factory"
          className="size-10 rounded-full"
          disabled={busy || !text.trim()}
        >
          <ArrowUp aria-hidden />
        </Button>
      </form>
      {problem && <ProblemBox title="That did not work" text={problem} />}
    </section>
  );
}
