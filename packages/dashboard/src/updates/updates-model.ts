import type { UpdatesView } from "../../../server/src/updates/served.ts";

type UpdatesState = UpdatesView;

// What Settings › Updates says about new versions on GitHub, in plain words.
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
      title: updates.step
        ? `${updates.step}…`
        : "Taking the new version from GitHub…",
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

// The row in the sidebar, only when something needs the owner or just
// happened: an update running, changes ready, changes that cannot be taken
// yet, a newer Kobble, or an update in the last ten minutes.
export type UpdateRow = {
  tone: "busy" | "new" | "blocked" | "release" | "done";
  title: string;
  text: string;
};

const JUST = 10 * 60_000;

export function updateRow(
  updates: UpdatesState,
  now = Date.now(),
): UpdateRow | null {
  return changesRow(updates) ?? releaseRow(updates) ?? doneRow(updates, now);
}

function changesRow(updates: UpdatesState): UpdateRow | null {
  const { waiting, blocked } = updates;
  if (updates.updating)
    return {
      tone: "busy",
      title: "Updating…",
      text: updates.step ?? "Taking the changes from GitHub",
    };
  if (waiting.count === 0) return null;
  if (blocked)
    return { tone: "blocked", title: "Can't update yet", text: blocked.reason };
  return {
    tone: "new",
    title: `${String(waiting.count)} ${waiting.count === 1 ? "change" : "changes"} ready`,
    text: waiting.titles[0] ?? "",
  };
}

function releaseRow({ release }: UpdatesState): UpdateRow | null {
  if (!release.newest) return null;
  return {
    tone: "release",
    title: `Kobble ${release.newest} is out`,
    text: release.card
      ? `Being prepared in #${String(release.card.number)}`
      : "Prepare the upgrade for the team",
  };
}

function doneRow(updates: UpdatesState, now: number): UpdateRow | null {
  const last = updates.lastUpdate;
  if (!last || now - new Date(last.at).getTime() >= JUST) return null;
  return {
    tone: "done",
    title: "Updated",
    text: `${String(last.count)} ${last.count === 1 ? "change" : "changes"}, everything started again`,
  };
}
