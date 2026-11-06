import { Loader2 } from "lucide-react";

import type { IdeaView } from "@/api";
import type { FactoryState } from "@/dashboard/dashboard";

import { ConnectedBoard } from "@/connect/connected-board";

import { IdeaCard } from "./idea-card";
import { STAGES } from "./stages";

// The columns work moves through: Backlog holds the ideas agreed to (a
// draft stays on the Ideas tab); the rest comes with the builder.
const COLUMNS = STAGES.filter((stage) => stage.id !== "draft");

// What the factory is doing: what it is busy with now, in a line beside
// the title, then every piece of work in the column of how far it is.
// Before there is any, it says where work starts.
export function BoardTab({ state }: Readonly<{ state: FactoryState }>) {
  const now = doing(state.ideas);
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-baseline gap-3 px-1 pt-1">
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Board</h1>
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          {now.busy ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <span
              aria-hidden
              className="size-2 rounded-full bg-muted-foreground/40"
            />
          )}
          {now.text}
        </span>
      </div>
      {!state.ideas.some((one) => one.status !== "draft") && (
        <p className="px-1 text-sm text-muted-foreground">
          Nothing on the board yet. Work starts as an{" "}
          <a
            href="#ideas"
            className="text-foreground underline underline-offset-2"
          >
            idea
          </a>
          : once you agree to its plan, it comes here.
        </p>
      )}
      <div className="px-1">
        <ConnectedBoard state={state} brief />
      </div>
      <div className="overflow-x-auto pb-2">
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${String(COLUMNS.length)}, minmax(10.5rem, 1fr))`,
          }}
        >
          {COLUMNS.map((column) => {
            const ideas = state.ideas.filter((one) => one.status === column.id);
            return (
              <section
                key={column.id}
                aria-label={column.title}
                className="grid min-h-[60vh] content-start gap-2 rounded-2xl p-2.5"
                style={{
                  background: `color-mix(in oklab, ${column.colour} 7%, var(--card))`,
                }}
              >
                <h2 className="flex items-center gap-2 px-1.5 py-1 text-[13px] font-semibold">
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ background: column.colour }}
                  />
                  {column.title}
                  <span className="font-normal text-muted-foreground">
                    {String(ideas.length)}
                  </span>
                </h2>
                {ideas.map((one) => (
                  <IdeaCard key={one.id} idea={one} status={false} />
                ))}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// What the factory is busy with, in a line: an idea it is thinking about,
// work waiting to be built, or nothing yet.
function doing(ideas: IdeaView[]): { busy: boolean; text: string } {
  const working = ideas.filter((one) => one.working);
  const [first] = working;
  if (first)
    return {
      busy: true,
      text:
        working.length === 1
          ? `Thinking about “${first.title}”`
          : `Thinking about ${String(working.length)} ideas`,
    };
  const waiting = ideas.filter((one) => one.status === "backlog").length;
  if (waiting > 0)
    return {
      busy: false,
      text: `${String(waiting)} in the backlog, waiting to be built`,
    };
  return { busy: false, text: "Waiting for work" };
}
