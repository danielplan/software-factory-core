// "Send B to Build": a version of an idea becomes a GitHub issue on the
// connected board (through the cards, cards/cards.ts), and the records keep
// a ticket link to it, so the idea is in Build. The issue's text says what
// the idea is, who it is for and where the version's branch is, and carries
// the ids in a hidden mark, the way the factory marks its own words on the
// board: <!-- factory:kobble idea=<id> version=<key> problems=<id>,<id> -->.
// Whether it worked is asked once the issue is closed (later).

import {
  derive,
  RecordsRefused,
  type RecordStore,
  versionKey,
} from "@software-factory/core";

import type { Cards } from "../cards/cards.ts";
import { Refused } from "../refused.ts";

const MARK = /<!-- factory:kobble idea=(\S+) version=(\S+) problems=(\S*) -->/;

export type TicketMarks = { idea: string; version: string; problems: string[] };

export function markOf(marks: TicketMarks): string {
  return `<!-- factory:kobble idea=${marks.idea} version=${marks.version} problems=${marks.problems.join(",")} -->`;
}

// The ids an issue's text carries; none when it has no mark.
export function marksIn(body: string): TicketMarks | null {
  const found = MARK.exec(body);
  if (!found) return null;
  const [, idea = "", version = "", problems = ""] = found;
  return { idea, version, problems: problems.split(",").filter(Boolean) };
}

// The version as a new issue, and the ticket link to it; its number and
// address.
export async function sendToBuild(
  store: RecordStore,
  cards: () => Cards,
  asked: { idea: string; version: string; by: string },
): Promise<{ issue: number; url: string }> {
  const idea = store.get("ideas", asked.idea);
  const version = store.get("versions", versionKey(asked.idea, asked.version));
  if (!idea || !version)
    throw new Refused(
      `There is no version ${asked.version} of “${asked.idea}”.`,
    );
  if (derive(store.all()).ideas[idea.id] === "inBuild")
    throw new Refused(`“${idea.title}” is in Build already.`);
  const problems = store
    .list("problems")
    .filter((p) => idea.problems.includes(p.id));
  const body = [
    `**We think:** ${idea.weThink}`,
    "",
    ...(problems.length > 0
      ? [`**For:** ${problems.map((p) => p.title).join("; ")}`, ""]
      : []),
    `**The version:** ${version.key} · ${version.name}, on the branch \`${version.branch}\` (try it in Kobble's prototype mode).`,
    "",
    `Sent to Build by ${asked.by}.`,
    "",
    markOf({ idea: idea.id, version: version.key, problems: idea.problems }),
  ].join("\n");
  const card = await cards().create(idea.title, body);
  try {
    store.put("ticketLinks", {
      issue: card.number,
      kind: "idea",
      from: { idea: idea.id, version: version.key },
      problems: idea.problems,
    });
  } catch (error) {
    if (error instanceof RecordsRefused)
      throw new Refused(
        `The issue #${String(card.number)} is made, but the records refused it: ${error.message}`,
      );
    throw error;
  }
  return { issue: card.number, url: card.url };
}
