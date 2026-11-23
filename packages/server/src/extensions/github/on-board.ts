// Putting an issue on the board: asked of GitHub and accepted when a board
// that adds new issues by itself did it first, then found there; and an item
// in a column.

import { statusOf } from "./board-setup.ts";
import { answer } from "../../github-cli.ts";
import type { Cli } from "../../github-cli.ts";
import { Refused } from "../../refused.ts";

// How GitHub is given time to add a card to the board by itself: it is
// looked for `looks` times, `every` milliseconds apart. A card is there in a
// few seconds when it is going to be; half a minute is long enough to say it
// is not coming.
export type Waiting = { looks: number; every: number };
export const WAITING: Waiting = { looks: 15, every: 2000 };

// What GitHub answers when the issue is on the board already, which a board
// that adds new issues by itself does a moment before the factory does.
const ON_BOARD_ALREADY = /Content already exists in this project/i;

// The board as read once: its id and the item of the issue, when it lists it.
export type Look = { projectId: string; itemId: string | null };

// Adds the issue to the board and finds its item. GitHub answering that the
// content exists is what was wanted: the item is then looked for on the
// board, a few times since GitHub may take a moment to add it. Looking first
// instead would clash with that moment. The item GitHub answers with when it
// adds is not looked for: a board read right after may not list it yet.
export async function addToBoard(
  cli: Cli,
  on: { owner: string; board: number; waiting: Waiting },
  issue: { number: number; url: string },
  look: () => Promise<Look>,
): Promise<{ projectId: string; itemId: string }> {
  const ran = await cli.run([
    "project",
    "item-add",
    String(on.board),
    "--owner",
    on.owner,
    "--url",
    issue.url,
    "--format",
    "json",
  ]);
  const exists = ran.code !== 0 && ON_BOARD_ALREADY.test(ran.err);
  if (!exists) answer(ran);
  const added = exists
    ? undefined
    : (JSON.parse(ran.out || "{}") as { id?: string }).id;
  for (let looked = 1; ; looked++) {
    const seen = await look();
    const itemId = added ?? seen.itemId;
    if (itemId) return { projectId: seen.projectId, itemId };
    if (looked >= on.waiting.looks) break;
    await new Promise((resolve) => setTimeout(resolve, on.waiting.every));
  }
  throw new Refused(
    `Issue #${String(issue.number)} was made, but it is not on the board after waiting for GitHub to add it. Add it to the board by hand, or hand off again: it carries on with that issue.`,
  );
}

// Puts the item in the column the board matches to the stage (board.json).
export async function putInColumn(
  cli: Cli,
  on: {
    owner: string;
    board: number;
    column: string | undefined;
    stage: string;
  },
  at: { projectId: string; itemId: string },
): Promise<void> {
  const { column } = on;
  if (!column)
    throw new Refused(
      `The board has no column for ${on.stage}: match one on Settings.`,
    );
  const status = await statusOf(cli, on.owner, on.board);
  const option = status.options.find((o) => o.name === column);
  if (!option)
    throw new Refused(`The board has no column “${column}” any more.`);
  const value = `{singleSelectOptionId: ${JSON.stringify(option.id)}}`;
  answer(
    await cli.run([
      "api",
      "graphql",
      "-f",
      `query=mutation { updateProjectV2ItemFieldValue(input: {projectId: ${JSON.stringify(at.projectId)}, itemId: ${JSON.stringify(at.itemId)}, fieldId: ${JSON.stringify(status.id)}, value: ${value}}) { projectV2Item { id } } }`,
    ]),
  );
}
