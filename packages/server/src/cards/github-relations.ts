// How cards on GitHub relate, through its own issue dependencies: a card
// "blocked by" another depends on it and waits for it; the other is
// "blocking" it, so it is needed by it.

import { answer } from "../add-ons/github/board-setup.ts";
import type { Cli } from "../add-ons/github/github.ts";
import type { CardDetail, Related } from "./cards.ts";

const RELATED = "nodes { number title state }";

type RelatedNode = { number: number; title: string; state: string };
type RelatedAnswer = {
  data?: {
    repository?: {
      issue?: {
        blockedBy?: { nodes: RelatedNode[] };
        blocking?: { nodes: RelatedNode[] };
      } | null;
    } | null;
  };
};

// The card waits for the other one (GitHub's "blocked by").
export async function blockedBy(
  cli: Cli,
  repository: string,
  number: number,
  on: number,
): Promise<void> {
  const id = answer(
    await cli.run([
      "api",
      `repos/${repository}/issues/${String(on)}`,
      "--jq",
      ".id",
    ]),
  ).trim();
  answer(
    await cli.run([
      "api",
      "-X",
      "POST",
      `repos/${repository}/issues/${String(number)}/dependencies/blocked_by`,
      "-F",
      `issue_id=${id}`,
    ]),
  );
}

// The cards a card depends on, and those that depend on it.
export async function relationsOf(
  cli: Cli,
  repository: string,
  number: number,
): Promise<Pick<CardDetail, "dependsOn" | "neededBy">> {
  const [owner, name] = repository.split("/");
  const read = JSON.parse(
    answer(
      await cli.run([
        "api",
        "graphql",
        "-f",
        `query={ repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) { issue(number: ${String(number)}) { blockedBy(first: 50) { ${RELATED} } blocking(first: 50) { ${RELATED} } } } }`,
      ]),
    ),
  ) as RelatedAnswer;
  const issue = read.data?.repository?.issue;
  return {
    dependsOn: (issue?.blockedBy?.nodes ?? []).map(relatedOf),
    neededBy: (issue?.blocking?.nodes ?? []).map(relatedOf),
  };
}

function relatedOf(node: RelatedNode): Related {
  return {
    number: node.number,
    title: node.title,
    closed: node.state === "CLOSED",
  };
}
