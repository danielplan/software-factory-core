import { Loader2, Plus } from "lucide-react";
import { useState } from "react";

import { type IdeaView, messageOf, post } from "@/api";
import { Accent } from "@/components/accent";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import type { FactoryState } from "@/dashboard/dashboard";
import { cn } from "@/lib/utils";

import { IdeaWorkspace } from "./idea-workspace";

// The columns an idea moves through. The last three come with the builder:
// until then they say so.
const COLUMNS = [
  { id: "planning", title: "Shaping", empty: "Ideas being shaped with you." },
  { id: "ready", title: "Ready", empty: "Plans you agreed to." },
  { id: "building", title: "Building", empty: "The builder comes next." },
  { id: "trying", title: "To try", empty: "Built, for you to try." },
  { id: "done", title: "Done", empty: "Tried and kept." },
] as const;

// What the factory is doing, as a board: every idea in the column of how
// far it is, the ones the factory works on right now marked so, and a new
// idea started from here. An idea opens in its workspace (#board/<id>).
export function BoardTab({
  state,
  open,
}: Readonly<{ state: FactoryState; open: string | null }>) {
  const [adding, setAdding] = useState(false);
  const idea = state.ideas.find((one) => one.id === open);
  if (idea) return <IdeaWorkspace idea={idea} />;
  const busy = state.ideas.filter((one) => one.working).length;
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3 px-1 pt-2">
        <h1 className="text-[30px] font-medium tracking-[-0.02em]">
          What the factory is <Accent>doing</Accent>
        </h1>
        <span className="text-sm text-muted-foreground">
          {busy > 0 ? `Working on ${String(busy)}` : "Waiting for your ideas"}
        </span>
        <span className="flex-1" />
        <Button
          className="h-10 px-4"
          onClick={() => {
            setAdding(!adding);
          }}
        >
          <Plus aria-hidden /> New idea
        </Button>
      </div>
      {adding && (
        <NewIdea
          onCancel={() => {
            setAdding(false);
          }}
        />
      )}
      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[1000px] grid-cols-5 gap-3">
          {COLUMNS.map((column) => {
            const ideas = state.ideas.filter((one) => one.status === column.id);
            return (
              <section
                key={column.id}
                aria-label={column.title}
                className="grid content-start gap-2.5 rounded-3xl bg-card/60 p-3"
              >
                <h2 className="flex items-center justify-between px-1.5 pt-1 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  {column.title}
                  <span className="font-normal">{String(ideas.length)}</span>
                </h2>
                {ideas.length === 0 ? (
                  <p className="px-1.5 pb-2 text-xs text-muted-foreground">
                    {column.empty}
                  </p>
                ) : (
                  ideas.map((one) => <IdeaCard key={one.id} idea={one} />)
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NewIdea({ onCancel }: Readonly<{ onCancel: () => void }>) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const start = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setProblem(null);
    try {
      const { id } = await post<{ id: string }>("/api/ideas", { text });
      window.location.hash = `board/${id}`;
    } catch (error) {
      setProblem(messageOf(error));
      setBusy(false);
    }
  };
  return (
    <section
      aria-label="A new idea"
      className="glow-card grid max-w-3xl gap-3 rounded-3xl p-5 shadow-soft"
    >
      <label htmlFor="new-idea" className="text-sm font-medium">
        What would you like next?
      </label>
      <textarea
        id="new-idea"
        rows={2}
        autoFocus
        value={text}
        placeholder="A wish list, so customers can save what they like for later…"
        className="resize-none rounded-xl bg-card px-4 py-3 text-[15px] ring-1 ring-border outline-none placeholder:text-muted-foreground"
        onChange={(event) => {
          setText(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
          if (event.key !== "Enter" || event.shiftKey) return;
          event.preventDefault();
          void start();
        }}
      />
      {problem && <ProblemBox title="That did not work" text={problem} />}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" className="h-10 px-3" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          className="h-10 px-4"
          disabled={busy || !text.trim()}
          onClick={() => void start()}
        >
          Shape it with the factory
        </Button>
      </div>
    </section>
  );
}

function IdeaCard({ idea }: Readonly<{ idea: IdeaView }>) {
  return (
    <a
      href={`#board/${idea.id}`}
      className={cn(
        "grid gap-1.5 rounded-2xl bg-card p-3.5 shadow-soft hover:ring-1 hover:ring-foreground/20",
        idea.working && "ring-2 ring-[var(--glow-c)]",
      )}
    >
      <span className="text-sm font-medium">{idea.title}</span>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {idea.working ? (
          <>
            <Loader2 className="size-3 animate-spin" aria-hidden /> The factory
            is thinking…
          </>
        ) : (
          `${String(idea.draft.cards.length)} cards · ${when(idea.updated)}`
        )}
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
