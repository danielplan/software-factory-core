import type { FactoryState } from "@/dashboard/dashboard";

import { IdeaCard } from "./idea-card";

// The columns work moves through. Backlog holds the ideas still being
// shaped; To do, the plans agreed to; the rest comes with the builder.
const COLUMNS = [
  { id: "planning", title: "Backlog" },
  { id: "ready", title: "To do" },
  { id: "building", title: "In progress" },
  { id: "trying", title: "Review" },
  { id: "done", title: "Done" },
] as const;

// What the factory is doing: every piece of work in the column of how far
// it is. Before there is any, it says where work starts.
export function BoardTab({ state }: Readonly<{ state: FactoryState }>) {
  return (
    <div className="grid gap-3">
      {state.ideas.length === 0 && (
        <p className="px-1 text-sm text-muted-foreground">
          Nothing on the board yet. Work starts as an{" "}
          <a
            href="#ideas"
            className="text-foreground underline underline-offset-2"
          >
            idea
          </a>
          .
        </p>
      )}
      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[960px] grid-cols-5 gap-3">
          {COLUMNS.map((column) => {
            const ideas = state.ideas.filter((one) => one.status === column.id);
            return (
              <section
                key={column.id}
                aria-label={column.title}
                className="grid min-h-[60vh] content-start gap-2 rounded-2xl bg-card/50 p-2.5"
              >
                <h2 className="flex items-center gap-2 px-1.5 py-1 text-[13px] font-medium">
                  {column.title}
                  <span className="text-muted-foreground">
                    {String(ideas.length)}
                  </span>
                </h2>
                {ideas.map((one) => (
                  <IdeaCard key={one.id} idea={one} />
                ))}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
