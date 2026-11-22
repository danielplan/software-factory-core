// The items of a GitHub board as its GraphQL API answers them: each with
// its Status column and, when it is an issue, the issue.

import { Refused } from "../refused.ts";

type Issue = {
  number: number;
  title: string;
  url: string;
  repository: string;
  labels: string[];
  closed: boolean;
  waitsFor: number[];
};
export type Item = { id: string; status: string; issue: Issue | null };

export const ITEMS = `id items(first: 100) { nodes { id
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
export type ProjectAnswer = {
  data?: {
    repositoryOwner?: {
      projectV2?: { id: string; items: { nodes: Node[] } } | null;
    };
  };
};

export function itemOf(node: Node): Item {
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

export type Project = { id: string; items: Item[] };

// The board's id and its items, each with its column and issue.
export async function readProject(
  gh: (args: string[]) => Promise<string>,
  owner: string,
  board: number,
): Promise<Project> {
  const number = String(board);
  const read = JSON.parse(
    await gh([
      "api",
      "graphql",
      "-f",
      `query={ repositoryOwner(login: ${JSON.stringify(owner)}) { ... on User { projectV2(number: ${number}) { ${ITEMS} } } ... on Organization { projectV2(number: ${number}) { ${ITEMS} } } } }`,
    ]),
  ) as ProjectAnswer;
  const found = read.data?.repositoryOwner?.projectV2;
  if (!found) throw new Refused(`There is no board ${number} of ${owner}.`);
  return { id: found.id, items: found.items.nodes.map(itemOf) };
}
