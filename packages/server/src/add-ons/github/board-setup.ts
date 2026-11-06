// Setting up the GitHub board with the owner in setup (tracker-setup.ts):
// the coach hears where the code is on GitHub and which boards are there,
// and while it builds, it connects the board the owner agreed to, or makes
// a new one, linked to the code, with the factory's stages as its columns.
// Columns the stages miss are added only when the owner agreed; the ones
// there are kept, with their cards.

import { spawnSync } from "node:child_process";

import { GIT } from "@software-factory/knowledge-base";

import { STAGES } from "../../api.ts";
import { labelOf } from "../../connect/fields.ts";
import { STAGE_COLUMNS, suggestStages } from "../../connect/stages.ts";
import type { BoardAsked, TrackerSetup } from "../../connect/tracker-setup.ts";
import { Refused } from "../../refused.ts";
import { type Cli, type Ran, realCli } from "./github.ts";

// A board as GitHub lists it.
type Listed = { number: number; title: string; items: { totalCount: number } };
// A board's Status field: its id, and its options as they are.
type Option = { id: string; name: string; color: string; description: string };
type Status = { id: string; options: Option[] };

// GitHub's colours for each stage's column.
const COLOURS: Record<(typeof STAGES)[number], string> = {
  backlog: "GRAY",
  planning: "PURPLE",
  todo: "BLUE",
  doing: "YELLOW",
  review: "PINK",
  done: "GREEN",
};

export function githubSetup(cli: Cli = realCli()): TrackerSetup {
  return {
    id: "github",
    facts: (project) => facts(cli, project),
    connect: (project, asked) => connect(cli, project, asked),
  };
}

async function facts(cli: Cli, project: string): Promise<string> {
  const repository = repositoryOf(project);
  if (!repository) return "";
  const intro = `On GitHub: the code is at ${repository}.`;
  const owner = ownerOf(repository);
  const listed = await cli.run(boardList(owner)).catch(() => null);
  if (listed?.code !== 0)
    return `${intro} The GitHub CLI here cannot read its boards yet: the owner signs in when connecting.`;
  const boards = (JSON.parse(listed.out) as { projects: Listed[] }).projects;
  if (boards.length === 0)
    return `${intro} ${owner} has no boards yet: the factory can make one.`;
  const lines = await Promise.all(
    boards.slice(0, 6).map(async (board) => {
      const status = await statusOf(cli, owner, board.number).catch(() => null);
      return `- “${board.title}” (board ${String(board.number)}): ${String(board.items.totalCount)} cards; ${columnsSaid(status)}`;
    }),
  );
  return [`${intro} The boards of ${owner}:`, ...lines].join("\n");
}

// A board's columns, and the factory's stages they are (from their names).
function columnsSaid(status: Status | null): string {
  if (!status) return "its columns could not be read";
  const names = status.options.map((o) => o.name);
  const stages = suggestStages(names);
  const matched = STAGES.filter((stage) => stages[stage]).map(
    (stage) => `${STAGE_COLUMNS[stage].title} = ${stages[stage]}`,
  );
  const missing = STAGES.filter((stage) => !stages[stage]).map(
    (stage) => STAGE_COLUMNS[stage].title,
  );
  return [
    `columns ${names.join(", ")}`,
    matched.length > 0 ? `the factory's stages: ${matched.join(", ")}` : "",
    missing.length > 0 ? `no column for ${missing.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("; ");
}

async function connect(cli: Cli, project: string, asked: BoardAsked) {
  const repository = repositoryOf(project);
  if (!repository)
    throw new Refused("The project's code is not on GitHub (no remote).");
  const owner = ownerOf(repository);
  const label = labelOf({ label: asked.label ?? "" });
  const made = asked.create?.trim();
  let board = asked.board;
  if (made) board = await makeBoard(cli, owner, repository, made);
  if (board === undefined || !Number.isInteger(board))
    throw new Refused("Name the board: its number, or create with a title.");
  const status = await statusOf(cli, owner, board);
  const added =
    made || asked.addColumns ? await addColumns(cli, status) : status;
  const columns = added.options.map((o) => o.name);
  const stages = suggestStages(columns);
  const missing = STAGES.filter((stage) => !stages[stage]).map(
    (stage) => STAGE_COLUMNS[stage].title,
  );
  const said = [
    `${made ? "Made and connected" : "Connected"} board ${String(board)} of ${owner}, linked to ${repository}: columns ${columns.join(", ")}.`,
    missing.length > 0
      ? `No column for ${missing.join(", ")}: that work is not shown on the board.`
      : "",
  ].join(" ");
  return { entry: { repository, board, label, stages }, said: said.trim() };
}

// A new board with the title, linked to the code's repository.
async function makeBoard(
  cli: Cli,
  owner: string,
  repository: string,
  title: string,
): Promise<number> {
  const created = await cli.run([
    "project",
    "create",
    "--owner",
    owner,
    "--title",
    title,
    "--format",
    "json",
  ]);
  const { number } = JSON.parse(answer(created)) as { number: number };
  answer(
    await cli.run([
      "project",
      "link",
      String(number),
      "--owner",
      owner,
      "--repo",
      repository,
    ]),
  );
  return number;
}

// The board's Status field, with its options as they are.
async function statusOf(
  cli: Cli,
  owner: string,
  board: number,
): Promise<Status> {
  const ran = await cli.run([
    "api",
    "graphql",
    "-f",
    `query={ repositoryOwner(login: ${JSON.stringify(owner)}) { ... on User { projectV2(number: ${String(board)}) { ${STATUS} } } ... on Organization { projectV2(number: ${String(board)}) { ${STATUS} } } } }`,
  ]);
  const read = JSON.parse(answer(ran)) as {
    data?: {
      repositoryOwner?: { projectV2?: { field?: Partial<Status> | null } };
    };
  };
  const field = read.data?.repositoryOwner?.projectV2?.field;
  if (!field?.id || !field.options)
    throw new Refused(
      `Board ${String(board)} of ${owner} has no Status field.`,
    );
  return { id: field.id, options: field.options };
}

const OPTION = "id name color description";
const STATUS = `field(name: "Status") { ... on ProjectV2SingleSelectField { id options { ${OPTION} } } }`;

// The stages' columns added after the ones there (kept as they are, by
// their ids, so their cards keep their place); nothing when none is missing.
async function addColumns(cli: Cli, status: Status): Promise<Status> {
  const have = suggestStages(status.options.map((o) => o.name));
  const missing = STAGES.filter((stage) => !have[stage]);
  if (missing.length === 0) return status;
  const options = inOrder(status.options, have, missing)
    .map(optionInput)
    .join(", ");
  const ran = await cli.run([
    "api",
    "graphql",
    "-f",
    `query=mutation { updateProjectV2Field(input: {fieldId: ${JSON.stringify(status.id)}, singleSelectOptions: [${options}]}) { projectV2Field { ... on ProjectV2SingleSelectField { id options { ${OPTION} } } } } }`,
  ]);
  const updated = JSON.parse(answer(ran)) as {
    data?: { updateProjectV2Field?: { projectV2Field?: Partial<Status> } };
  };
  const field = updated.data?.updateProjectV2Field?.projectV2Field;
  return { id: status.id, options: field?.options ?? status.options };
}

// The columns there, with each missing stage's column put before the column
// of the first later stage that has one (at the end when none has).
function inOrder(
  options: Option[],
  have: Record<(typeof STAGES)[number], string>,
  missing: (typeof STAGES)[number][],
): (Omit<Option, "id"> & { id?: string })[] {
  const ordered: (Omit<Option, "id"> & { id?: string })[] = [...options];
  for (const stage of missing) {
    const later = STAGES.slice(STAGES.indexOf(stage) + 1)
      .map((next) => have[next])
      .find(Boolean);
    const at = ordered.findIndex((o) => o.name === later);
    ordered.splice(at < 0 ? ordered.length : at, 0, {
      name: STAGE_COLUMNS[stage].title,
      color: COLOURS[stage],
      description: STAGE_COLUMNS[stage].about,
    });
  }
  return ordered;
}

// One option as GitHub's API takes it; one that is there keeps its id.
function optionInput(option: Omit<Option, "id"> & { id?: string }): string {
  const id = option.id ? "id: " + JSON.stringify(option.id) + ", " : "";
  const name = JSON.stringify(option.name);
  const about = JSON.stringify(option.description);
  return `{${id}name: ${name}, color: ${option.color}, description: ${about}}`;
}

function answer(ran: Ran): string {
  if (ran.code !== 0)
    throw new Refused(ran.err.trim() || "GitHub did not answer.");
  return ran.out;
}

function boardList(owner: string): string[] {
  return ["project", "list", "--owner", owner, "--format", "json"];
}

function ownerOf(repository: string): string {
  return repository.split("/")[0] ?? "";
}

// owner/name of the project's GitHub remote; none when it is elsewhere.
function repositoryOf(project: string): string | null {
  const ran = spawnSync(GIT, ["-C", project, "remote", "get-url", "origin"], {
    encoding: "utf8",
  });
  if (ran.status !== 0) return null;
  const match = /github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/.exec(
    ran.stdout.trim(),
  );
  return match?.[1] ?? null;
}
