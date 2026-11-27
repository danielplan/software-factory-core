import assert from "node:assert/strict";
import { test } from "node:test";

import { readProject } from "../src/extensions/github/items.ts";

// A board shows its items 100 at a time: the whole board is read page by
// page, so a card past the hundredth (a new one on a big board) is found.

const node = (n: number) => ({
  id: `item-${String(n)}`,
  fieldValueByName: { name: "To do" },
  content: {
    number: n,
    title: `Card ${String(n)}`,
    url: `https://github.com/acme/shop/issues/${String(n)}`,
    state: "OPEN",
    repository: { nameWithOwner: "acme/shop" },
    labels: { nodes: [] },
    blockedBy: { nodes: [] },
  },
});

test("a board of more than 100 items is read page by page", async () => {
  const asked: string[] = [];
  const all = Array.from({ length: 230 }, (_, at) => node(at + 1));
  const gh = (args: string[]) => {
    const query = args[3] ?? "";
    asked.push(query);
    const after = Number(/after: "(\d+)"/.exec(query)?.[1] ?? 0);
    const page = all.slice(after, after + 100);
    const more = after + 100 < all.length;
    return Promise.resolve(
      JSON.stringify({
        data: {
          repositoryOwner: {
            projectV2: {
              id: "P1",
              items: {
                nodes: page,
                pageInfo: {
                  hasNextPage: more,
                  endCursor: more ? String(after + 100) : null,
                },
              },
            },
          },
        },
      }),
    );
  };
  const project = await readProject(gh, "acme", 2);
  assert.equal(project.id, "P1");
  assert.equal(project.items.length, 230);
  assert.equal(project.items.at(-1)?.issue?.number, 230);
  assert.equal(asked.length, 3);
  assert.doesNotMatch(asked[0] ?? "", /after:/);
  assert.match(asked[2] ?? "", /items\(first: 100, after: "200"\)/);
});
