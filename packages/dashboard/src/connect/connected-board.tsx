import { ArrowUpRight } from "lucide-react";

import type { FactoryState } from "@/dashboard/dashboard";
import { STAGES } from "@/ideas/stages";

type Entry = FactoryState["board"][string];

// The board work is tracked on, when one is connected: its name, a link to
// it, the label that marks the factory's work, and which of its columns
// each of the factory's stages is.
// Brief: only where it is.
export function ConnectedBoard({
  state,
  brief = false,
}: Readonly<{ state: FactoryState; brief?: boolean }>) {
  const tracker = state.company.tracker;
  const entry = tracker === "none" ? undefined : state.board[tracker];
  if (!entry) return null;
  const { name, href } = whereOf(tracker, entry);
  return (
    <div className="grid gap-3">
      <p className="text-sm">
        {brief ? "Your work is tracked on " : "Connected to "}
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 font-medium text-primary underline-offset-2 transition-colors hover:underline"
        >
          {name}
          <ArrowUpRight className="size-3.5" aria-hidden />
        </a>
        {entry.label === "*"
          ? ", all of its work."
          : `, the work labelled “${entry.label}”.`}
      </p>
      {!brief && <StageColumns entry={entry} />}
    </div>
  );
}

function StageColumns({ entry }: Readonly<{ entry: Entry }>) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Stages and columns">
      {STAGES.filter((stage) => stage.id !== "draft").map((stage) => {
        const column = (entry.stages as Record<string, string>)[stage.id];
        return (
          <li
            key={stage.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs"
          >
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ background: stage.colour }}
            />
            {stage.title}
            <span className="text-muted-foreground">
              {column ? `= ${column}` : "· no column"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// The board's name and address, by tracker.
function whereOf(
  tracker: string,
  entry: Entry,
): { name: string; href: string } {
  const field = (key: string) => {
    const value = (entry as Record<string, unknown>)[key];
    return typeof value === "string" || typeof value === "number"
      ? String(value)
      : "";
  };
  if (tracker === "github")
    return {
      name: `board ${field("board")} of ${field("repository")} on GitHub`,
      href: `https://github.com/${field("repository")}/projects`,
    };
  if (tracker === "jira")
    return {
      name: `${field("project")} on Jira`,
      href: `https://${field("site")}/browse/${field("project")}`,
    };
  return { name: tracker, href: "#settings" };
}
