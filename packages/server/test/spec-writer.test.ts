import assert from "node:assert/strict";
import { test } from "node:test";

import type { Claude } from "@software-factory/core";

import { specWriter } from "../src/kobble/explorations/spec-writer.ts";
import { explorationsFactory } from "./explorations-factory.ts";

// The spec written at hand-off: a short card from what was planned, without
// reading the code.

test("the spec writer gets the files the branch changed and the conversation, reads no code, and gives up on a short answer", async () => {
  const factory = await explorationsFactory();
  try {
    const prompts: string[] = [];
    const answers = [
      "Too short.",
      `## The agreed plan\n\n${"Built so. ".repeat(60)}`,
    ];
    const claude = {
      run: (options: {
        prompt: string;
        readOnly?: boolean;
        tools?: string[];
      }) => {
        prompts.push(options.prompt);
        assert.equal(options.readOnly, true);
        assert.deepEqual(options.tools, []);
        return Promise.resolve({ ok: true, text: answers.shift() ?? "" });
      },
    } as unknown as Claude;
    const write = specWriter({
      claude,
      project: factory.project,
      root: factory.root,
      store: () => factory.store,
    });
    const exploration = factory.store.get("explorations", "X-1");
    assert.ok(exploration);
    const input = { exploration, summary: "In short.", branch: "proto/X-1-b" };
    assert.equal(await write(input), null);
    assert.match((await write(input)) ?? "", /^## The agreed plan/);
    assert.match(
      prompts[0] ?? "",
      /## The files the prototype's branch `proto\/X-1-b` changes/,
    );
    assert.match(prompts[0] ?? "", /## The conversation/);
    assert.match(prompts[0] ?? "", /In short\./);
  } finally {
    factory.close();
  }
});
