// The cards on a GitHub board (a project), through the GitHub CLI: its items
// that are issues of the connected repository (and carry the factory's label,
// unless it takes in every card), each in the column of its Status field.

import { keptIn, withKept } from "@software-factory/core";

import type { Stage, StageMap } from "../../api.ts";
import { STAGES } from "../../api.ts";
import { statusOf } from "./board-setup.ts";
import { answer, ownerOf } from "../../github-cli.ts";
import type { Cli } from "../../github-cli.ts";
import { Refused } from "../../refused.ts";
import type { Card, CardDetail, Cards, CardType } from "../../cards/cards.ts";
import { blockedBy, relationsOf } from "./relations.ts";
import { type Item, type Project, readProject } from "./items.ts";
import {
  heldArgs,
  labelArgs,
  planOf,
  stuckArgs,
  typeEdit,
  withPlan,
} from "../../cards/cards.ts";

// The board as board.json keeps it.
export type GitHubBoard = {
  repository: string;
  board: number;
  label: string;
  stages: StageMap;
};

export function githubCards(cli: Cli, board: GitHubBoard): Cards {
  const cards = new GitHubCards(cli, board);
  return {
    list: () => cards.list(),
    show: (number) => cards.show(number),
    move: (number, stage) => cards.move(number, stage),
    comment: (number, text) => cards.comment(number, text),
    create: (title, body, stage) => cards.create(title, body, stage),
    writePlan: (number, plan) => cards.writePlan(number, plan),
    keepWork: (number, kept, held) => cards.keepWork(number, kept, held),
    dependOn: (number, on) => cards.dependOn(number, on),
    replace: (number, by) => cards.replace(number, by),
    setType: (number, type) => cards.setType(number, type),
    markStuck: (number, stuck) => cards.markStuck(number, stuck),
    remove: (number) => cards.remove(number),
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
      kept: keptIn(read.body),
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

  // A new card in the stage asked for (the backlog unless said): the issue,
  // added to the board, put in its column by the item GitHub answers with,
  // since a board read right after adding may not list the new item yet.
  async create(
    title: string,
    body: string,
    stage: Stage = "backlog",
  ): Promise<Card> {
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
    const added = await this.addToBoard(url);
    const number = Number(/\/issues\/(\d+)/.exec(url)?.[1]);
    const project = await this.project();
    const item = added.id ?? (await this.find(number)).item.id;
    await this.setColumn(project.id, item, stage);
    return {
      number,
      title,
      stage,
      column: this.board.stages[stage],
      url,
      labels: label.slice(1),
      closed: false,
      waitsFor: [],
    };
  }

  async writePlan(number: number, plan: string): Promise<void> {
    await this.editBody(number, (body) => withPlan(body, plan));
  }

  // The card's text, changed by `change`, written back when it differs.
  private async editBody(
    number: number,
    change: (body: string) => string,
  ): Promise<void> {
    const { body } = await this.issue<{ body: string }>(number, "body");
    const written = change(body);
    if (written !== body)
      await this.gh([
        "issue",
        "edit",
        String(number),
        ...this.repo,
        "--body",
        written,
      ]);
  }

  // The card's piece of work: what it keeps in its text, and the label of the
  // team's stage that holds it.
  async keepWork(
    number: number,
    kept: Parameters<typeof withKept>[1],
    held: string | null,
  ): Promise<void> {
    const { card } = await this.find(number);
    await this.editBody(number, (body) => withKept(body, kept));
    for (const args of heldArgs(number, card.labels, held, this.repo))
      await this.gh(args);
  }

  // The card's type as a label (made when GitHub has none of that name);
  // its other type labels come off.
  async setType(number: number, type: CardType | null): Promise<void> {
    const { card } = await this.find(number);
    if (type) await this.gh(labelArgs(type, this.repo));
    const edit = typeEdit(card.labels, type);
    if (edit.length > 0)
      await this.gh(["issue", "edit", String(number), ...this.repo, ...edit]);
  }

  // The stuck mark as a label (made when GitHub has none of that name).
  async markStuck(number: number, stuck: boolean): Promise<void> {
    const { card } = await this.find(number);
    for (const args of stuckArgs(number, card.labels, stuck, this.repo))
      await this.gh(args);
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

  // Closed as not planned and taken off the board; the issue stays on GitHub.
  async remove(number: number): Promise<void> {
    const { card, item } = await this.find(number);
    if (card.stage === "doing")
      throw new Refused(
        `The builder is on #${String(number)}: stop it before deleting the card.`,
      );
    if (!card.closed)
      await this.gh([
        "issue",
        "close",
        String(number),
        ...this.repo,
        "--reason",
        "not planned",
      ]);
    await this.gh([
      "project",
      "item-delete",
      String(this.board.board),
      "--owner",
      this.owner,
      "--id",
      item.id,
    ]);
  }

  // The card with that number, its item and the board.
  // The issue added to the board: the item GitHub answers with. A board
  // that adds new issues by itself may have it already; then it is found on
  // the board instead.
  private async addToBoard(url: string): Promise<{ id?: string }> {
    try {
      return JSON.parse(
        (await this.gh([
          "project",
          "item-add",
          String(this.board.board),
          "--owner",
          this.owner,
          "--url",
          url,
          "--format",
          "json",
        ])) || "{}",
      ) as { id?: string };
    } catch (error) {
      if (/already/i.test(String(error))) return {};
      throw error;
    }
  }

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
  private project(): Promise<Project> {
    return readProject(this.gh.bind(this), this.owner, this.board.board);
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
