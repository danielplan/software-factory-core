import type { UpdatesState } from "../../../server/src/updates/project-updates.ts";

// What Workshop says about new versions on GitHub, in plain words.
export type UpdatesSummary = {
  tone: "quiet" | "new" | "blocked";
  title: string;
  text: string;
  // Show the Update button.
  canUpdate: boolean;
  // The merged changes waiting, and the files in the way.
  changes: string[];
  files: string[];
};

export function updatesSummary(updates: UpdatesState): UpdatesSummary {
  const { titles, count } = updates.waiting;
  const more =
    count > titles.length ? [`and ${String(count - titles.length)} more`] : [];
  return {
    ...whatToSay(updates),
    changes: updates.updating ? [] : [...titles, ...more],
    files: updates.blocked?.files ?? [],
  };
}

function whatToSay(
  updates: UpdatesState,
): Omit<UpdatesSummary, "changes" | "files"> {
  const { waiting, blocked } = updates;
  const changes = `${String(waiting.count)} ${waiting.count === 1 ? "change" : "changes"}`;
  if (updates.updating)
    return {
      tone: "new",
      title: "Taking the new version from GitHub…",
      text: "The products that run start again with it.",
      canUpdate: false,
    };
  if (waiting.count > 0 && blocked)
    return {
      tone: "blocked",
      title: `New version on GitHub (${changes}), but this folder cannot take it yet`,
      text: `Nothing was changed, because ${blocked.reason}. Save or undo those changes (or ask Claude to tidy up this folder), then press Look again.`,
      canUpdate: false,
    };
  if (waiting.count > 0)
    return {
      tone: "new",
      title: `New version on GitHub: ${changes}`,
      text: "Update takes it now; the products that run start again with it.",
      canUpdate: true,
    };
  return {
    tone: "quiet",
    title: quietTitle(updates),
    text: "",
    canUpdate: false,
  };
}

function quietTitle(updates: UpdatesState): string {
  if (updates.looking && !updates.lastLookAt) return "Looking on GitHub…";
  const looked = updates.lastLookAt
    ? ` · looked at ${clock(updates.lastLookAt)}`
    : "";
  if (updates.offline) return `GitHub could not be reached${looked}`;
  const updated = updates.lastUpdate
    ? ` · updated at ${clock(updates.lastUpdate.at)}`
    : "";
  return `Up to date with GitHub${looked}${updated}`;
}

// A time as the owner's clock shows it (14:05).
function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
