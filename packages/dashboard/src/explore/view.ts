// What the Explore page and prototype mode say, worked out from what the
// server sends: where an idea stands, its versions in a line, the line
// above "Send to Build", a version's picks and what it is doing, and which
// address prototype mode shows. Kept apart from the components so it is
// checked on its own.

import type {
  IdeaPage,
  IdeaRow,
  PartView,
  PrototypePage,
  VersionRun,
} from "../api.ts";
import { listWords } from "../understand/view.ts";

const STATES: Record<IdeaRow["state"], string> = {
  exploring: "Exploring",
  inBuild: "In Build",
  worked: "It worked",
  didntWork: "It didn't work",
};

export function stateWords(state: IdeaRow["state"]): string {
  return STATES[state];
}

function count(n: number, one: string, many: string): string {
  return n === 1 ? `1 ${one}` : `${String(n)} ${many}`;
}

// Under an idea in the list: "Exploring · 3 versions".
export function rowWords(row: Pick<IdeaRow, "state" | "versions">): string {
  const versions =
    row.versions === 0
      ? "no versions yet"
      : count(row.versions, "version", "versions");
  return `${stateWords(row.state)} · ${versions}`;
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
