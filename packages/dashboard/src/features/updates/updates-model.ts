import type { UpdatesView } from "../../../../server/src/updates/served.ts";
import { clockIn } from "../../i18n/format.ts";
import type { Locale } from "../../i18n/locale.ts";
import { ENGLISH, type Messages } from "../../i18n/messages.ts";
import { updateReason, updateStep } from "../../i18n/server-texts.ts";

type UpdatesState = UpdatesView;
type Words = Messages["updates"];

// The language things are said in: its words, and its clock.
export type Saying = { m: Words; locale: Locale };
const ENGLISH_SAYING: Saying = { m: ENGLISH.updates, locale: "en" };

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

export function updatesSummary(
  updates: UpdatesState,
  saying: Saying = ENGLISH_SAYING,
): UpdatesSummary {
  const { titles, count } = updates.waiting;
  const more =
    count > titles.length ? [saying.m.more(count - titles.length)] : [];
  return {
    ...whatToSay(updates, saying),
    changes: updates.updating ? [] : [...titles, ...more],
    files: updates.blocked?.files ?? [],
  };
}

function whatToSay(
  updates: UpdatesState,
  saying: Saying,
): Omit<UpdatesSummary, "changes" | "files"> {
  const { m } = saying;
  const { waiting, blocked } = updates;
  const changes = m.changes(waiting.count);
  if (updates.updating)
    return {
      tone: "new",
      title: updates.step ? `${updateStep(updates.step, m)}…` : m.taking,
      text: m.restartNote,
      canUpdate: false,
    };
  if (waiting.count > 0 && blocked)
    return {
      tone: "blocked",
      title: m.blockedTitle(changes),
      text: m.blockedText(updateReason(blocked.reason, m)),
      canUpdate: false,
    };
  if (waiting.count > 0)
    return {
      tone: "new",
      title: m.newTitle(changes),
      text: m.newText,
      canUpdate: true,
    };
  return {
    tone: "quiet",
    title: quietTitle(updates, saying),
    text: "",
    canUpdate: false,
  };
}

function quietTitle(updates: UpdatesState, { m, locale }: Saying): string {
  if (updates.looking && !updates.lastLookAt) return m.looking;
  const looked = updates.lastLookAt
    ? m.looked(clockIn(locale, updates.lastLookAt))
    : "";
  if (updates.offline) return m.offline(looked);
  const updated = updates.lastUpdate
    ? m.updatedAt(clockIn(locale, updates.lastUpdate.at))
    : "";
  return m.upToDate(looked, updated);
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
  m: Words = ENGLISH.updates,
): UpdateRow | null {
  return (
    changesRow(updates, m) ?? releaseRow(updates, m) ?? doneRow(updates, now, m)
  );
}

function changesRow(updates: UpdatesState, m: Words): UpdateRow | null {
  const { waiting, blocked } = updates;
  if (updates.updating)
    return {
      tone: "busy",
      title: m.row.updating,
      text: updates.step ? updateStep(updates.step, m) : m.row.takingChanges,
    };
  if (waiting.count === 0) return null;
  if (blocked)
    return {
      tone: "blocked",
      title: m.row.cantYet,
      text: updateReason(blocked.reason, m),
    };
  return {
    tone: "new",
    title: m.row.ready(waiting.count),
    text: waiting.titles[0] ?? "",
  };
}

function releaseRow({ release }: UpdatesState, m: Words): UpdateRow | null {
  if (!release.newest) return null;
  return {
    tone: "release",
    title: m.row.release(release.newest),
    text: release.card ? m.row.preparing(release.card.number) : m.row.prepare,
  };
}

function doneRow(
  updates: UpdatesState,
  now: number,
  m: Words,
): UpdateRow | null {
  const last = updates.lastUpdate;
  if (!last || now - new Date(last.at).getTime() >= JUST) return null;
  return {
    tone: "done",
    title: m.row.updated,
    text: m.row.updatedText(m.changes(last.count)),
  };
}
