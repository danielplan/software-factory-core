// What the Explore page and prototype mode say, worked out from what the
// server sends: where an idea stands, its versions in a line, the line
// above "Send to Build", a version's picks and what it is doing, and which
// address prototype mode shows. Kept apart from the components so it is
// checked on its own.

import type { IdeaPage, PartView, PrototypePage, VersionRun } from "../api.ts";
import { closedWords } from "../lib/stages.ts";
import { listWords } from "../understand/view.ts";

function count(n: number, one: string, many: string): string {
  return n === 1 ? `1 ${one}` : `${String(n)} ${many}`;
}

// Beside an idea's stage in the list: "3 versions".
export function versionsWords(versions: number): string {
  return versions === 0
    ? "no versions yet"
    : count(versions, "version", "versions");
}

type WhyOf = Pick<IdeaPage, "lead" | "tie" | "tickets" | "answer">;
const issueOf = (page: WhyOf) =>
  listWords(page.tickets.map((t) => `#${String(t.issue)}`));
const WHY: Record<IdeaPage["stage"], (page: WhyOf) => string> = {
  idea: () => "No versions yet: make them in prototype mode.",
  versions: (page) =>
    page.tie
      ? "Two or more versions share the most picks."
      : "Nobody has picked a version yet.",
  picked: (page) => `${page.lead?.key ?? "One"} has the most picks`,
  building: (page) => `In Build as ${issueOf(page)}`,
  inApp: (page) => `In the app as ${issueOf(page)}: did it work?`,
  worked: (page) => closedWords(page.answer, "it worked"),
  didntWork: (page) => closedWords(page.answer, "it didn't work"),
};

// Why an idea is at its stage, in one plain line.
export function ideaWhy(page: WhyOf & Pick<IdeaPage, "stage">): string {
  return WHY[page.stage](page);
}

// Beside a version: how many picked it.
export function pickWords(picks: string[]): string {
  return picks.length === 0 ? "" : count(picks.length, "pick", "picks");
}

// The line above the one action, and the action: send the version with the
// most picks to Build, or pick one first.
export function sendLine(
  page: Pick<IdeaPage, "lead" | "tie" | "versions" | "state" | "tickets">,
): { words: string; button: string | null; version: string | null } {
  const [ticket] = page.tickets;
  if (page.state !== "exploring" && ticket)
    return {
      words: `Version ${ticket.version} went to Build as issue #${String(ticket.issue)}.`,
      button: null,
      version: null,
    };
  if (page.lead)
    return {
      words: `Most picks: ${page.lead.key}, ${page.lead.name.toLowerCase()}.`,
      button: `Send ${page.lead.key} to Build`,
      version: page.lead.key,
    };
  const most = Math.max(0, ...page.versions.map((v) => v.picks.length));
  const tied = page.versions
    .filter((v) => most > 0 && v.picks.length === most)
    .map((v) => v.key);
  return {
    words: page.tie
      ? `${listWords(tied)} have the same picks: pick one.`
      : "Nobody picked one yet: try them, then pick.",
    button: "Pick one to send",
    version: null,
  };
}

const RUNS: Record<VersionRun["state"], string> = {
  stopped: "Stopped",
  making: "The kobold is making it",
  starting: "Starting",
  running: "Running",
  failed: "It stopped",
};

export function runWords(run: Pick<VersionRun, "state">): string {
  return RUNS[run.state];
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
  return version ? `Version ${version.key} · ${version.name}` : "Main";
}

// Who made a version: "made by the kobold, Luca".
export function madeWords(madeBy: string[]): string {
  return `made by ${listWords(madeBy.map((who) => (who === "kobold" ? "the kobold" : who)))}`;
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
    return { url: running.link, words: `${running.name} as it runs now` };
  return {
    url: null,
    words:
      products.length === 0
        ? "This project has no product to run here."
        : "The product is not running: start it on Workshop to see it here.",
  };
}

// What prototype mode shows for a version that has no address to show.
export function stillWords(
  page: Pick<PrototypePage, "canRun">,
  run: VersionRun,
): string {
  if (!page.canRun)
    return 'This project cannot run versions yet: its factory.json names no prototype command ("prototype": { "start": "…" }). The prototype skill says what the command does.';
  if (run.state === "making")
    return run.activity
      ? `The kobold is making it: ${run.activity}`
      : "The kobold is making it.";
  if (run.state === "starting") return "Starting it…";
  if (run.problem) return run.problem;
  return "It is not running. Start it to try it.";
}
