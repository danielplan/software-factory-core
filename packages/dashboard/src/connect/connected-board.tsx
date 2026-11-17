import { Trans, useTranslation } from "react-i18next";

import type { FactoryState } from "@/dashboard/dashboard";
import { STAGES } from "@/ideas/stages";
import { t } from "@/i18n/i18n";

type Entry = FactoryState["board"][string];

// The board work is tracked on, when one is connected: its name, a link to
// it, the label that marks the factory's work, and which of its columns
// each of the factory's stages is.
// Brief: only where it is.
export function ConnectedBoard({
  state,
  brief = false,
}: Readonly<{ state: FactoryState; brief?: boolean }>) {
  const board = boardOf(state);
  if (!board) return null;
  const { name, href, entry } = board;
  const all = entry.label === "*";
  const tracked = all ? "board.trackedAll" : "board.trackedLabel";
  const connected = all ? "board.connectedAll" : "board.connectedLabel";
  const key = brief ? tracked : connected;
  return (
    <div className="grid gap-3">
      <p className="text-body">
        <Trans
          ns="settings"
          i18nKey={key}
          values={{ name, label: entry.label }}
          components={{
            link: (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 font-medium text-primary underline-offset-2 transition-colors hover:underline"
              />
            ),
          }}
        />
      </p>
      {!brief && <StageColumns entry={entry} />}
    </div>
  );
}

function StageColumns({ entry }: Readonly<{ entry: Entry }>) {
  const { t } = useTranslation("settings");
  return (
    <ul className="flex flex-wrap gap-2" aria-label={t("board.stages")}>
      {STAGES.filter((stage) => stage.id !== "draft").map((stage) => {
        const column = (entry.stages as Record<string, string>)[stage.id];
        return (
          <li
            key={stage.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-tag"
          >
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ background: stage.colour }}
            />
            {stage.title}
            <span className="text-muted-foreground">
              {column ? `= ${column}` : `· ${t("board.noColumn")}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// The board work is tracked on, with its name, address and the site it is
// on; none without one.
export function boardOf(
  state: FactoryState,
): { name: string; href: string; site: string; entry: Entry } | null {
  const tracker = state.company.tracker;
  const entry = tracker === "none" ? undefined : state.board[tracker];
  return entry ? { ...whereOf(tracker, entry), entry } : null;
}

// The board's name, address and site, by tracker.
function whereOf(
  tracker: string,
  entry: Entry,
): { name: string; href: string; site: string } {
  const field = (key: string) => {
    const value = (entry as Record<string, unknown>)[key];
    return typeof value === "string" || typeof value === "number"
      ? String(value)
      : "";
  };
  if (tracker === "github")
    return {
      name: t("settings:board.github", {
        board: field("board"),
        repository: field("repository"),
      }),
      href: `https://github.com/${field("repository")}/projects`,
      site: "GitHub",
    };
  if (tracker === "jira")
    return {
      name: t("settings:board.jira", { project: field("project") }),
      href: `https://${field("site")}/browse/${field("project")}`,
      site: "Jira",
    };
  return { name: tracker, href: "#settings", site: tracker };
}
