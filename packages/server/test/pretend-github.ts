// A stand-in GitHub for the tests of the board's cards: the GitHub CLI's
// answers about one board and its issues, remembering what it was told.

import type { Cli } from "../src/github-cli.ts";

const STAGES = {
  backlog: "Backlog",
  todo: "Ready",
  doing: "In progress",
  review: "In review",
  done: "Done",
};
const OPTIONS = Object.values(STAGES).map((name, n) => ({
  id: `o${String(n)}`,
  name,
  color: "GRAY",
  description: "",
}));

// The board as board.json keeps it.
export const BOARD = {
  repository: "acme/shop",
  board: 2,
  label: "*",
  stages: STAGES,
};

// `addsNewIssues`: a board that adds new issues by itself (a GitHub
// workflow), so adding one again is refused.
export function pretendGitHub({ addsNewIssues = false } = {}) {
  const issues = new Map([
    [3, { title: "Invoices in euros", body: "As written.", column: "Backlog" }],
  ]);
  const said: string[] = [];
  // Which card waits for which (GitHub's "blocked by"), and which are closed.
  const blockedBy = new Map<number, number[]>();
  const closed = new Set<number>();
  // Items taken off the board (their issues stay).
  const removed = new Set<number>();
  // The labels of each issue, and the labels GitHub has been asked to make.
  const labels = new Map<number, string[]>();
  const made = new Set<string>();
  const says = (out: unknown) =>
    Promise.resolve({
      code: 0,
      out: typeof out === "string" ? out : JSON.stringify(out),
      err: "",
    });
  const items = () => [
    ...[...issues]
      .filter(([number]) => !removed.has(number))
      .map(([number, issue]) => ({
        id: `item-${String(number)}`,
        fieldValueByName: { name: issue.column },
        content: {
          number,
          title: issue.title,
          url: `https://github.com/acme/shop/issues/${String(number)}`,
          repository: { nameWithOwner: "acme/shop" },
          labels: {
            nodes: (labels.get(number) ?? []).map((name) => ({ name })),
          },
          state: closed.has(number) ? "CLOSED" : "OPEN",
          blockedBy: {
            nodes: (blockedBy.get(number) ?? []).map((n) => ({
              number: n,
              state: closed.has(n) ? "CLOSED" : "OPEN",
            })),
          },
        },
      })),
    // Another repository's issue and a draft are not the factory's cards.
    {
      id: "item-x",
      fieldValueByName: { name: "Backlog" },
      content: {
        number: 1,
        title: "Elsewhere",
        url: "",
        repository: { nameWithOwner: "acme/blog" },
        labels: { nodes: [] },
      },
    },
    { id: "item-d", fieldValueByName: null, content: null },
  ];
  // The board through GitHub's API: its items, its Status field, a move.
  const node = (n: number) => ({
    number: n,
    title: issues.get(n)?.title ?? "",
    state: closed.has(n) ? "CLOSED" : "OPEN",
  });
  const api = (query: string) => {
    if (query.includes("repository(owner:")) {
      const n = Number(/issue\(number: (\d+)\)/.exec(query)?.[1]);
      const blocking = [...blockedBy]
        .filter(([, on]) => on.includes(n))
        .map(([waiting]) => waiting);
      return says({
        data: {
          repository: {
            issue: {
              blockedBy: { nodes: (blockedBy.get(n) ?? []).map(node) },
              blocking: { nodes: blocking.map(node) },
            },
          },
        },
      });
    }
    if (query.includes("updateProjectV2ItemFieldValue")) {
      const item = /itemId: "item-(\d+)"/.exec(query)?.[1];
      const option = /singleSelectOptionId: "(o\d)"/.exec(query)?.[1];
      const moved = issues.get(Number(item));
      const to = OPTIONS.find((o) => o.id === option);
      if (moved && to) moved.column = to.name;
      return says({ data: {} });
    }
    const project = query.includes("items(")
      ? { id: "P1", items: { nodes: items() } }
      : { field: { id: "F1", options: OPTIONS } };
    return says({ data: { repositoryOwner: { projectV2: project } } });
  };
  // An issue: read, edited, commented on, made.
  const issue = (args: string[]) => {
    const [, verb, number] = args;
    const found = issues.get(Number(number));
    const value = (flag: string) => args[args.indexOf(flag) + 1] ?? "";
    if (verb === "view" && found)
      return says({
        body: found.body,
        comments: [{ author: { login: "ana" }, body: "Euros only?" }],
      });
    if (verb === "edit" && found) {
      if (args.includes("--body")) found.body = value("--body");
      const now = new Set(labels.get(Number(number)));
      args.forEach((arg, at) => {
        if (arg === "--add-label") now.add(args[at + 1] ?? "");
        if (arg === "--remove-label") now.delete(args[at + 1] ?? "");
      });
      labels.set(Number(number), [...now]);
    }
    if (verb === "comment") said.push(`#${String(number)}: ${value("--body")}`);
    if (verb === "close") closed.add(Number(number));
    if (verb === "create") {
      issues.set(9, {
        title: value("--title"),
        body: value("--body"),
        column: "",
      });
      return says("https://github.com/acme/shop/issues/9\n");
    }
    return says("");
  };
  const itemAdd = () =>
    addsNewIssues
      ? Promise.resolve({
          code: 1,
          out: "",
          err: "Content already exists in this project",
        })
      : says(JSON.stringify({ id: "item-9" }));
  const run = (args: string[]) => {
    const [first, second] = args;
    if (first === "api" && second === "user") return says("octo\n");
    if (first === "api" && second === "graphql") return api(args[3] ?? "");
    // An issue's id, and a new "blocked by" relation between two issues.
    const id = /issues\/(\d+)$/.exec(second ?? "");
    if (first === "api" && id) return says(`10${id[1] ?? ""}\n`);
    const blocked = /issues\/(\d+)\/dependencies\/blocked_by$/.exec(
      args[3] ?? "",
    );
    if (first === "api" && blocked) {
      const waiting = Number(blocked[1]);
      const on = Number(/issue_id=10(\d+)/.exec(args.join(" "))?.[1]);
      blockedBy.set(waiting, [...(blockedBy.get(waiting) ?? []), on]);
      return says("{}");
    }
    if (first === "issue") return issue(args);
    if (first === "label" && second === "create") {
      made.add(args[2] ?? "");
      return says("");
    }
    if (first === "project" && second === "item-delete") {
      removed.add(Number(/item-(\d+)/.exec(args.join(" "))?.[1]));
      return says("{}");
    }
    if (first === "project" && second === "item-add") return itemAdd();
    return Promise.resolve({
      code: 1,
      out: "",
      err: `not known: ${args.join(" ")}`,
    });
  };
  const cli: Cli = {
    run,
    start: () => ({ answer: () => {}, done: Promise.resolve(1) }),
  };
  return { cli, issues, said, closed, removed, labels, made };
}
