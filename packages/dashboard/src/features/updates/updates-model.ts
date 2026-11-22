import type { TFunction } from "i18next";
import type { UpdatesView } from "../../../../server/src/updates/served.ts";
import { clockIn } from "../../i18n/format.ts";
import type { Locale } from "../../i18n/locale.ts";
import { ENGLISH } from "../../i18n/messages.ts";
import { updateReason, updateStep } from "../../i18n/server-texts.ts";

type UpdatesState = UpdatesView;
type Words = TFunction;

// The language things are said in: its words, and its clock.
export type Saying = { m: Words; locale: Locale };
const ENGLISH_SAYING: Saying = { m: ENGLISH, locale: "en" };

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
    count > titles.length
      ? [saying.m("updates.more", { count: count - titles.length })]
      : [];
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
  const changes = m("updates.changes", { count: waiting.count });
  if (updates.updating)
    return {
      tone: "new",
      title: updates.step
        ? `${updateStep(updates.step, m)}…`
        : m("updates.taking"),
      text: m("updates.restartNote"),
      canUpdate: false,
    };
  if (waiting.count > 0 && blocked)
    return {
      tone: "blocked",
      title: m("updates.blockedTitle", { changes }),
      text: m("updates.blockedText", {
        reason: updateReason(blocked.reason, m),
      }),
      canUpdate: false,
    };
  if (waiting.count > 0)
    return {
      tone: "new",
      title: m("updates.newTitle", { changes }),
      text: m("updates.newText"),
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
  if (updates.looking && !updates.lastLookAt) return m("updates.looking");
  const looked = updates.lastLookAt
    ? m("updates.looked", { time: clockIn(locale, updates.lastLookAt) })
    : "";
  if (updates.offline) return m("updates.offline", { looked });
  const updated = updates.lastUpdate
    ? m("updates.updatedAt", { time: clockIn(locale, updates.lastUpdate.at) })
    : "";
  return m("updates.upToDate", { looked, updated });
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
  m: Words = ENGLISH,
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
      title: m("updates.row.updating"),
      text: updates.step
        ? updateStep(updates.step, m)
        : m("updates.row.takingChanges"),
    };
  if (waiting.count === 0) return null;
  if (blocked)
    return {
      tone: "blocked",
      title: m("updates.row.cantYet"),
      text: updateReason(blocked.reason, m),
    };
  return {
    tone: "new",
    title: m("updates.row.ready", { count: waiting.count }),
    text: waiting.titles[0] ?? "",
  };
}

function releaseRow({ release }: UpdatesState, m: Words): UpdateRow | null {
  if (!release.newest) return null;
  return {
    tone: "release",
    title: m("updates.row.release", { version: release.newest }),
    text: release.card
      ? m("updates.row.preparing", { number: release.card.number })
      : m("updates.row.prepare"),
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
    title: m("updates.row.updated"),
    text: m("updates.row.updatedText", {
      changes: m("updates.changes", { count: last.count }),
    }),
  };
}
