// What the Explore page and prototype mode say, worked out from what the
// server sends, in the dashboard's language: the ideas by step, what is
// next for each, why an idea is at its stage, a version's votes and what
// it is doing, what the send row says, and which address prototype mode
// shows. Kept apart from the components so it is checked on its own.

import type {
  Board,
  IdeaPage,
  IdeaRow,
  PartView,
  PrototypePage,
  VersionRun,
} from "../api.ts";
import { i18next, t } from "../i18n/i18n.ts";

// "A, B and C", in the dashboard's language.
export function listOf(items: string[]): string {
  return new Intl.ListFormat(i18next.language, {
    style: "long",
    type: "conjunction",
  }).format(items);
}

type WhyOf = Pick<IdeaPage, "lead" | "tie" | "tickets" | "answer">;
const issuesOf = (page: WhyOf) =>
  listOf(page.tickets.map((ticket) => `#${String(ticket.issue)}`));
// It worked, or not; and who closed it when, once someone answered.
function closed(page: WhyOf, worked: boolean): string {
  if (!page.answer)
    return t(worked ? "explore:why.worked" : "explore:why.didntWork");
  const { by, on } = page.answer;
  return t(worked ? "explore:why.workedBy" : "explore:why.didntWorkBy", {
    by,
    on,
  });
}
const WHY: Record<IdeaPage["stage"], (page: WhyOf) => string> = {
  idea: () => t("explore:why.idea"),
  versions: (page) => t(page.tie ? "explore:why.tie" : "explore:why.noVotes"),
  picked: (page) => t("explore:why.picked", { version: page.lead?.key ?? "?" }),
  building: (page) => t("explore:why.building", { issues: issuesOf(page) }),
  inApp: (page) => t("explore:why.inApp", { issues: issuesOf(page) }),
  worked: (page) => closed(page, true),
  didntWork: (page) => closed(page, false),
};

// Why an idea is at its stage, in one plain line.
export function ideaWhy(page: WhyOf & Pick<IdeaPage, "stage">): string {
  return WHY[page.stage](page);
}

// What is next for an idea, on its card in the grid; nothing when its
// stage already says it all.
export function ideaNext(
  idea: Pick<IdeaRow, "stage" | "versions">,
): string | null {
  if (idea.stage === "versions")
    return t("explore:next.versions", { count: idea.versions });
  if (idea.stage === "picked") return t("explore:next.picked");
  if (idea.stage === "inApp") return t("explore:next.inApp");
  return null;
}

// The ideas by step, in order: Plan (no versions yet), Prototypes
// (versions to try and vote on), Handed off (sent to Build, in the app, or
// worked), Dropped (it didn't work).
export const STEPS = ["plan", "prototypes", "handedOff", "dropped"] as const;
export type Step = (typeof STEPS)[number];

const STEP_OF: Record<IdeaRow["stage"], Step> = {
  idea: "plan",
  versions: "prototypes",
  picked: "prototypes",
  building: "handedOff",
  inApp: "handedOff",
  worked: "handedOff",
  didntWork: "dropped",
};

export function ideaGroups(
  ideas: IdeaRow[],
): { step: Step; ideas: IdeaRow[] }[] {
  return STEPS.map((step) => ({
    step,
    ideas: ideas.filter((idea) => STEP_OF[idea.stage] === step),
  }));
}

// On a version: how many voted for it.
export function voteWords(picks: string[]): string {
  return t("explore:votes", { count: picks.length });
}

// Sending to Build makes an issue on a connected GitHub board; the
// factory's own board, or another tracker, cannot take one yet.
export function canSend(tracker: string, board: Board): boolean {
  return tracker === "github" && board.github !== undefined;
}

// The send row under the versions: the version with the most votes, ready
// to send; why it cannot be sent yet (no GitHub board, a tie, or no vote);
// or where it went once sent.
export function sendLine(
  page: Pick<IdeaPage, "lead" | "tie" | "versions" | "state" | "tickets">,
  sendable = true,
): {
  words: string;
  button: string | null;
  version: string | null;
  connect: boolean;
} {
  const [ticket] = page.tickets;
  if (page.state !== "exploring" && ticket)
    return {
      words: t("explore:send.went", {
        version: ticket.version,
        issue: ticket.issue,
      }),
      button: null,
      version: null,
      connect: false,
    };
  if (page.lead && !sendable)
    return {
      words: t("explore:send.noBoard", { version: page.lead.key }),
      button: null,
      version: null,
      connect: true,
    };
  if (page.lead)
    return {
      words: t("explore:send.lead", { version: page.lead.key }),
      button: t("explore:send.button", { version: page.lead.key }),
      version: page.lead.key,
      connect: false,
    };
  return {
    words: waitingWords(page),
    button: t("explore:send.buttonNone"),
    version: null,
    connect: false,
  };
}

// Why nothing can be sent yet: versions tied for the most votes, or none.
function waitingWords(page: Pick<IdeaPage, "tie" | "versions">): string {
  if (!page.tie) return t("explore:send.noVotes");
  const most = Math.max(0, ...page.versions.map((v) => v.picks.length));
  const tied = page.versions
    .filter((v) => most > 0 && v.picks.length === most)
    .map((v) => v.key);
  return t("explore:send.tie", { versions: listOf(tied) });
}

export function runWords(run: Pick<VersionRun, "state">): string {
  return t(`explore:run.${run.state}`);
}

// The run of a version, from what runs now; stopped when not known.
export function runOf(
  runs: VersionRun[],
  idea: string,
  version: string,
): VersionRun {
  return (
    runs.find((r) => r.idea === idea && r.version === version) ?? {
      idea,
      version,
      state: "stopped",
      url: null,
      activity: null,
      problem: null,
    }
  );
}

// "Version B · Basket keeps it for later", or Main.
export function versionTitle(
  version: { key: string; name: string } | null,
): string {
  return version
    ? t("explore:version.title", { version: version.key, name: version.name })
    : t("explore:version.main");
}

// Who made a version: "Made by the kobold and Luca".
export function madeWords(madeBy: string[]): string {
  const who = madeBy.map((one) =>
    one === "kobold" ? t("explore:version.kobold") : one,
  );
  return t("explore:version.madeBy", { who: listOf(who) });
}

// What prototype mode shows for Main: the first product that runs, or why
// there is none.
export function mainOf(parts: PartView[]): {
  url: string | null;
  words: string;
} {
  const products = parts.filter((p) => p.area === "products");
  const running = products.find((p) => p.light === "running" && p.link);
  if (running?.link)
    return {
      url: running.link,
      words: t("explore:main.running", { name: running.name }),
    };
  return {
    url: null,
    words: t(
      products.length === 0 ? "explore:main.none" : "explore:main.stopped",
    ),
  };
}

// What prototype mode shows for a version that has no address to show.
export function stillWords(
  page: Pick<PrototypePage, "canRun">,
  run: VersionRun,
): string {
  if (!page.canRun) return t("explore:still.cannotRun");
  if (run.state === "making")
    return run.activity
      ? t("explore:still.makingDoing", { doing: run.activity })
      : t("explore:still.making");
  if (run.state === "starting") return t("explore:still.starting");
  if (run.problem) return run.problem;
  return t("explore:still.stopped");
}
