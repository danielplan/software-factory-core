// What the frame around every page says, worked out from what the server
// sends: the small counts beside the pages in the sidebar, whether the
// kobold is active at its bottom (and on what), and the whole factory's
// light. Kept apart from the
// components so it is checked on its own.

import type {
  IdeaRow,
  IdeaView,
  KoboldJob,
  KoboldNews,
  Light,
  PartView,
  WorkView,
} from "../api.ts";
import { t } from "../i18n/i18n.ts";
import type { Page } from "./routes.ts";

// Only real numbers, and only when there is something to count: what people
// said that nobody has looked at yet (Signals), the ideas being explored,
// and the board's tickets not yet in the app.
export function countsOf(
  ideas: IdeaRow[] | null,
  work: WorkView | null,
  news: KoboldNews | null = null,
): Partial<Record<Page, number>> {
  // Only what is to go through one at a time on Signals (the kobold's new
  // stories are a line above it, not counted).
  const fresh = news ? news.toLookAt.length : 0;
  const exploring = (ideas ?? []).filter(
    (one) => one.state === "exploring",
  ).length;
  const open = (work?.cards ?? []).filter(
    (card) => card.stage !== "done",
  ).length;
  return {
    ...(fresh > 0 ? { signals: fresh } : {}),
    ...(exploring > 0 ? { explore: exploring } : {}),
    ...(open > 0 ? { build: open } : {}),
  };
}

// The whole factory's light, and what it means in words.
export function overallOf(parts: PartView[]): {
  lit: Light;
  words: string;
} {
  const shown = parts.filter((part) => part.light !== "none");
  const running = shown.filter((part) => part.light === "running").length;
  if (shown.some((part) => part.light === "problem"))
    return { lit: "problem", words: t("common:overall.problem") };
  if (shown.some((part) => part.light === "starting"))
    return { lit: "starting", words: t("common:overall.starting") };
  if (shown.length > 0 && running === shown.length)
    return { lit: "running", words: t("common:overall.running") };
  return {
    lit: "stopped",
    words: t("common:overall.stopped", { running, total: shown.length }),
  };
}

export type KoboldStatus = { busy: boolean; title: string; detail: string };

const active = (detail: string): KoboldStatus => ({
  busy: true,
  title: t("common:status.active"),
  detail,
});

// What a job on the records is doing, with what it says it does now; or
// that it waits for the jobs asked before it.
function doing(job: KoboldJob): string {
  if (job.waiting) return t("common:kobold.waiting");
  const what = t(`common:kobold.doing.${job.kind}`);
  return job.activity
    ? t("common:kobold.doingWith", { doing: what, activity: job.activity })
    : what;
}

// Whether the kobold is active, and on what: the card it builds, a job on
// the records (one at work before one waiting its turn), an idea it thinks
// about, a card it plans; not active
// otherwise, with the factory's light in words.
export function koboldStatus(
  jobs: KoboldJob[],
  work: WorkView | null,
  ideas: IdeaView[],
  quiet: string,
): KoboldStatus {
  const building = work?.builder.working;
  if (building)
    return active(t("common:kobold.building", { title: building.title }));
  const job =
    jobs.find((one) => one.working && !one.waiting) ??
    jobs.find((one) => one.working);
  if (job) return active(doing(job));
  const thinking = ideas.find((one) => one.working);
  if (thinking)
    return active(t("common:kobold.thinking", { title: thinking.title }));
  const planning = work?.coach.working;
  if (planning !== undefined && planning !== null)
    return active(t("common:kobold.planning", { number: planning }));
  return { busy: false, title: t("common:status.notActive"), detail: quiet };
}
