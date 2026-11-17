import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import type { Claude, RunOptions } from "@software-factory/core";

import { problemOf } from "../src/coach/talk.ts";
import type { KoboldJob } from "../src/kobold/kobold.ts";
import { acmeServed } from "./acme-served.ts";
import { stage } from "./stage.ts";

// The chat: files attached to a message, kept out of git and given to the
// kobold; and a job of the kobold stopped while it works, so a person can
// steer it.

// A Claude Code that answers at once, or, for a prompt that says "(wait)",
// only when it is stopped.
function waitingClaude() {
  const seen: RunOptions[] = [];
  const claude: Claude = {
    run: async (options) => {
      seen.push(options);
      if (!options.prompt.includes("(wait)"))
        return { ok: true, text: "Mia, mostly." };
      return await new Promise((resolve) => {
        options.stop?.addEventListener("abort", () => {
          resolve({ ok: false, text: "", error: "Stopped." });
        });
      });
    },
  };
  return { claude, seen };
}

const base64 = (text: string | Buffer) => Buffer.from(text).toString("base64");
// The first bytes of a PNG picture, then anything.
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from("picture"),
]);

test("a file attached is kept out of git, under a name the factory makes, and given to the kobold", async () => {
  const pretend = waitingClaude();
  const factory = acmeServed(await stage(pretend.claude));
  try {
    const attach = (body: object) =>
      factory.send("/api/chat/attachments", body);
    const picture = await attach({
      name: "../../screen shot.png",
      type: "image/png",
      data: base64(png),
    });
    assert.equal(picture.status, 200);
    const file = (picture.body as unknown as { file: { id: string } }).file;
    assert.match(file.id, /^[0-9a-f-]{36}\.png$/);
    assert.ok(existsSync(join(factory.root, "attachments", file.id)));
    const ignored = readFileSync(join(factory.root, ".gitignore"), "utf8");
    assert.ok(ignored.split("\n").includes("attachments/"));
    const notes = await attach({
      name: "notes.txt",
      type: "text/plain",
      data: base64("Customers ask for a wish list."),
    });
    const text = (notes.body as unknown as { file: { id: string } }).file;
    // Once in the .gitignore, however many files come.
    const again = readFileSync(join(factory.root, ".gitignore"), "utf8");
    assert.equal(again.split("attachments/").length, 2);
    // Refused in plain words: what it is not, or what does not fit.
    for (const [body, why] of [
      [{ name: "a.exe", type: "application/x-msdos", data: "AA==" }, /Only/],
      [{ name: "e.txt", type: "text/plain", data: "" }, /is empty/],
      [{ name: "e.txt", type: "text/plain", data: "hi!!" }, /not be read\.$/],
      [{ name: "p.png", type: "image/png", data: base64("png") }, /type says/],
      [{ name: "d.pdf", type: "application/pdf", data: base64(png) }, /type/],
      [
        { name: "t.txt", type: "text/plain", data: base64(Buffer.of(0xff)) },
        /UTF-8/,
      ],
      [{ name: "", type: "text/plain", data: "AA==" }, /Give the file a name/],
      [{ name: "a", type: "text/plain", data: "AA==", x: 1 }, /understood/],
    ] as const) {
      const refused = await attach(body);
      assert.equal(refused.status, 409);
      assert.match(refused.body.error, why);
      assert.doesNotMatch(refused.body.error, /✖/);
    }
    for (const [data, type] of [
      [Buffer.from("%PDF-1.7"), "application/pdf"],
      [Buffer.from("GIF89a"), "image/gif"],
      [Buffer.of(0xff, 0xd8, 0xff, 0xe0), "image/jpeg"],
      [Buffer.from("RIFF0000WEBPVP8 "), "image/webp"],
      [Buffer.from("Caffè, perché"), "text/csv"],
    ] as const) {
      const fine = await attach({ name: "f", type, data: base64(data) });
      assert.equal(fine.status, 200, type);
    }
    const asked = await factory.send("/api/chat/question", {
      question: "Who wants this?",
      files: [
        { id: file.id, name: "screen.png" },
        { id: text.id, name: "notes.txt" },
      ],
    });
    assert.equal(asked.status, 200);
    const prompt = pretend.seen.at(-1)?.prompt ?? "";
    assert.match(prompt, new RegExp(`factory/attachments/${file.id}`));
    assert.match(prompt, /Customers ask for a wish list\./);
    // In the dashboard's language, when it says one.
    assert.doesNotMatch(prompt, /Answer in/);
    const italian = await factory.send("/api/chat/question", {
      question: "Chi lo vuole?",
      files: [],
      language: "it",
    });
    assert.equal(italian.status, 200);
    assert.match(pretend.seen.at(-1)?.prompt ?? "", /Answer in Italian\.$/);
    const klingon = await factory.send("/api/chat/question", {
      question: "Who?",
      files: [],
      language: "tlh",
    });
    assert.equal(klingon.status, 409);
    assert.equal(
      klingon.body.error,
      "That language is not one the factory speaks.",
    );
    for (const [id, why] of [
      ["../x.png", /^Send at most five files, each attached here first\.$/],
      ["0".repeat(36) + ".png", /is not there any more/],
    ] as const) {
      const refused = await factory.send("/api/chat/question", {
        question: "Who?",
        files: [{ id, name: "x" }],
      });
      assert.equal(refused.status, 409);
      assert.match(refused.body.error, why);
    }
    const blank = await factory.send("/api/chat/question", { question: " " });
    assert.equal(blank.body.error, "Write a question first.");
  } finally {
    factory.close();
  }
});

test("a job of the kobold is stopped while it works, so a person can steer it", async () => {
  const pretend = waitingClaude();
  const factory = acmeServed(await stage(pretend.claude));
  const jobs = async () =>
    (await factory.read<{ jobs: KoboldJob[] }>("/api/understand/kobold")).jobs;
  try {
    const started = await factory.send("/api/chat/idea", {
      text: "A wish list (wait)",
      persona: "mia",
    });
    const job = started.body.job;
    while (pretend.seen.length === 0)
      await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(
      (await factory.send("/api/chat/stop", { job: job.id })).status,
      200,
    );
    const [stopped] = await factory.settled();
    assert.equal(stopped?.problem, "Stopped, to go another way.");
    const late = await factory.send("/api/chat/stop", { job: job.id });
    assert.equal(late.status, 409);
    // A question while it is being answered.
    const answering = factory.send("/api/chat/question", {
      question: "Who pays at night? (wait)",
    });
    let working: KoboldJob | undefined;
    while (!working) {
      working = (await jobs()).find((one) => one.working);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    await factory.send("/api/chat/stop", { job: working.id });
    // Its own reason, not why Claude Code ended.
    const answer = await answering;
    assert.equal(answer.status, 409);
    assert.equal(answer.body.error, "Stopped, to go another way.");
    const steered = await factory.send("/api/chat/question", {
      question: "Who pays at night? Only on phones.",
    });
    assert.equal(steered.status, 200);
  } finally {
    factory.close();
  }
});

test("why Claude Code stopped ends with one full stop", () => {
  assert.equal(
    problemOf("The conversation was closed.", "The kobold"),
    "The kobold stopped: The conversation was closed. Try again.",
  );
  assert.equal(
    problemOf("", "The kobold"),
    "The kobold stopped: no reason given. Try again.",
  );
});
