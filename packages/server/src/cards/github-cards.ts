// The cards on a GitHub board (a project), through the GitHub CLI: its items
// that are issues of the connected repository (and carry the factory's label,
// unless it takes in every card), each in the column of its Status field.

import type { Stage, StageMap } from "../api.ts";
import { STAGES } from "../api.ts";
import { answer, ownerOf, statusOf } from "../add-ons/github/board-setup.ts";
import type { Cli } from "../add-ons/github/github.ts";
import { Refused } from "../refused.ts";
import type { Card, CardDetail, Cards } from "./cards.ts";
import { blockedBy, relationsOf } from "./github-relations.ts";
import { planOf, withPlan } from "./cards.ts";

// The board as board.json keeps it.
export type GitHubBoard = {
  repository: string;
  board: number;
  label: string;
  stages: StageMap;
};

type Issue = {
  number: number;
  title: string;
  url: string;
  repository: string;
  labels: string[];
  closed: boolean;
  waitsFor: number[];
};
type Item = { id: string; status: string; issue: Issue | null };
type Project = { id: string; items: Item[] };

export function githubCards(cli: Cli, board: GitHubBoard): Cards {
  const cards = new GitHubCards(cli, board);
  return {
    list: () => cards.list(),
    show: (number) => cards.show(number),
    move: (number, stage) => cards.move(number, stage),
    comment: (number, text) => cards.comment(number, text),
    create: (title, body) => cards.create(title, body),
    writePlan: (number, plan) => cards.writePlan(number, plan),
    dependOn: (number, on) => cards.dependOn(number, on),
    replace: (number, by) => cards.replace(number, by),
  };
}

class GitHubCards {
  private readonly cli: Cli;
  private readonly board: GitHubBoard;
  private readonly owner: string;
  private readonly repo: string[];

  constructor(cli: Cli, board: GitHubBoard) {
    this.cli = cli;
    this.board = board;
    this.owner = ownerOf(board.repository);
    this.repo = ["--repo", board.repository];
  }

  async list(): Promise<Card[]> {
    return (await this.project()).items.flatMap(
      (item) => this.cardOf(item) ?? [],
    );
  }

  async show(number: number): Promise<CardDetail> {
    const { card } = await this.find(number);
    const read = await this.issue<{
      body: string;
      comments: {
        author: { login: string } | null;
        body: string;
        createdAt: string;
      }[];
    }>(number, "body,comments");
    const related = await relationsOf(this.cli, this.board.repository, number);
    return {
      ...card,
      body: read.body,
      agreed: planOf(read.body) !== null,
      ...related,
      comments: read.comments.map((c) => ({
        author: c.author?.login ?? "",
        body: c.body,
        at: c.createdAt,
      })),
    };
  }

  async move(number: number, stage: Stage): Promise<void> {
    const { project, item } = await this.find(number);
    await this.setColumn(project.id, item.id, stage);
  }

  async comment(number: number, text: string): Promise<void> {
    await this.gh([
      "issue",
      "comment",
      String(number),
      ...this.repo,
      "--body",
      text,
    ]);
  }

  async create(title: string, body: string): Promise<Card> {
    const label = this.board.label === "*" ? [] : ["--label", this.board.label];
    const url = (
      await this.gh([
        "issue",
        "create",
        ...this.repo,
        "--title",
        title,
        "--body",
        body,
        ...label,
      ])
    ).trim();
    await this.gh([
      "project",
      "item-add",
      String(this.board.board),
      "--owner",
      this.owner,
      "--url",
      url,
    ]);
    const number = Number(/\/issues\/(\d+)/.exec(url)?.[1]);
    await this.move(number, "backlog");
    return (await this.find(number)).card;
  }

  async writePlan(number: number, plan: string): Promise<void> {
    const { body } = await this.issue<{ body: string }>(number, "body");
    await this.gh([
      "issue",
      "edit",
      String(number),
      ...this.repo,
      "--body",
      withPlan(body, plan),
    ]);
  }

  // GitHub's "blocked by": the card waits for the other one.
  async dependOn(number: number, on: number): Promise<void> {
    if (number === on) throw new Refused("A card can't depend on itself.");
    await this.find(number);
    await blockedBy(this.cli, this.board.repository, number, on);
  }

  // Closed as not planned, with a note on both cards pointing to the other.
  async replace(number: number, by: number): Promise<void> {
    if (number === by) throw new Refused("A card can't replace itself.");
    await this.find(number);
    await this.find(by);
    await this.comment(
      number,
      `Replaced by #${String(by)}, which does this now.`,
    );
    await this.comment(by, `Replaces #${String(number)}.`);
    await this.gh([
      "issue",
      "close",
      String(number),
      ...this.repo,
      "--reason",
      "not planned",
    ]);
  }

  // The card with that number, its item and the board.
  private async find(number: number) {
    const project = await this.project();
    for (const item of project.items) {
      const card = this.cardOf(item);
      if (card?.number === number) return { project, item, card };
    }
    throw new Refused(`There is no card #${String(number)} on the board.`);
  }

  private cardOf(item: Item): Card | null {
    const { issue } = item;
    const { board } = this;
    if (issue?.repository !== board.repository) return null;
    if (board.label !== "*" && !issue.labels.includes(board.label)) return null;
    return {
      number: issue.number,
      title: issue.title,
      stage:
        STAGES.find((stage) => board.stages[stage] === item.status) ?? null,
      column: item.status,
      url: issue.url,
      labels: issue.labels,
      closed: issue.closed,
      waitsFor: issue.waitsFor,
    };
  }

  private async issue<T>(number: number, fields: string): Promise<T> {
    return JSON.parse(
      await this.gh([
        "issue",
        "view",
        String(number),
        ...this.repo,
        "--json",
        fields,
      ]),
    ) as T;
  }

  // The board's id and its items, each with its column and issue.
  private async project(): Promise<Project> {
    const number = String(this.board.board);
    const read = JSON.parse(
      await this.gh([
        "api",
        "graphql",
        "-f",
        `query={ repositoryOwner(login: ${JSON.stringify(this.owner)}) { ... on User { projectV2(number: ${number}) { ${ITEMS} } } ... on Organization { projectV2(number: ${number}) { ${ITEMS} } } } }`,
      ]),
    ) as ProjectAnswer;
    const found = read.data?.repositoryOwner?.projectV2;
    if (!found)
      throw new Refused(`There is no board ${number} of ${this.owner}.`);
    return { id: found.id, items: found.items.nodes.map(itemOf) };
  }

  // Puts the item in the column of the stage, as board.json matches them.
  private async setColumn(projectId: string, itemId: string, stage: Stage) {
    const column = this.board.stages[stage];
    if (!column)
      throw new Refused(
        `The board has no column for ${stage}: match one on Settings.`,
      );
    const status = await statusOf(this.cli, this.owner, this.board.board);
    const option = status.options.find((o) => o.name === column);
    if (!option)
      throw new Refused(`The board has no column “${column}” any more.`);
    const value = `{singleSelectOptionId: ${JSON.stringify(option.id)}}`;
    await this.gh([
      "api",
      "graphql",
      "-f",
      `query=mutation { updateProjectV2ItemFieldValue(input: {projectId: ${JSON.stringify(projectId)}, itemId: ${JSON.stringify(itemId)}, fieldId: ${JSON.stringify(status.id)}, value: ${value}}) { projectV2Item { id } } }`,
    ]);
  }

  private async gh(args: string[]): Promise<string> {
    return answer(await this.cli.run(args));
  }
}

const ITEMS = `id items(first: 100) { nodes { id
  fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } }
  content { ... on Issue { number title url state repository { nameWithOwner } labels(first: 20) { nodes { name } } blockedBy(first: 20) { nodes { number state } } } } } }`;

type Node = {
  id: string;
  fieldValueByName: { name?: string } | null;
  content: {
    number?: number;
    title?: string;
    url?: string;
    state?: string;
    repository?: { nameWithOwner: string };
    labels?: { nodes: { name: string }[] };
    blockedBy?: { nodes: { number: number; state: string }[] };
  } | null;
};
type ProjectAnswer = {
  data?: {
    repositoryOwner?: {
      projectV2?: { id: string; items: { nodes: Node[] } } | null;
    };
  };
};

function itemOf(node: Node): Item {
  return {
    id: node.id,
    status: node.fieldValueByName?.name ?? "",
    issue: issueOf(node.content),
  };
}

function issueOf(content: Node["content"]): Issue | null {
  if (content?.number === undefined) return null;
  return {
    number: content.number,
    title: content.title ?? "",
    url: content.url ?? "",
    repository: content.repository?.nameWithOwner ?? "",
    labels: content.labels?.nodes.map((l) => l.name) ?? [],
    closed: content.state === "CLOSED",
    waitsFor: (content.blockedBy?.nodes ?? [])
      .filter((b) => b.state !== "CLOSED")
      .map((b) => b.number),
  };
}
