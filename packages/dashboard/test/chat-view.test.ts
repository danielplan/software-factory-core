import assert from "node:assert/strict";
import { test } from "node:test";

import {
  busyOf,
  filesOf,
  isQuestion,
  replyTo,
  type Request,
  type Said,
  type Sent,
  steered,
} from "../src/lib/chat-view.ts";

// The chat: a question is answered; anything else becomes an idea, once
// the kobold knows who it is for; while it works, a message steers it.

const picture: Sent = {
  id: "0b9f6f2c-1111-4222-8333-444455556666.png",
  name: "screen.png",
  type: "image/png",
  preview: "blob:x",
};
const question: Request = {
  kind: "question",
  question: "Who pays at night?",
  files: [],
};
const idea: Request = {
  kind: "idea",
  text: "A wish list",
  persona: "mia",
  files: [picture],
};
const job = (id: string, more: object = {}) => ({
  id,
  kind: "idea",
  about: "mia",
  working: true,
  ...more,
});

test("a message ending with a question mark is a question", () => {
  assert.equal(isQuestion("Why do people leave at checkout?"), true);
  assert.equal(isQuestion("Why do people leave?  "), true);
  assert.equal(isQuestion("A wish list for later"), false);
  assert.equal(isQuestion("What? No, a wish list"), false);
});

test("an idea asks who it is for, unless only one person uses the product", () => {
  assert.deepEqual(replyTo("Who are they?", [{ id: "mia" }]), {
    thinking: true,
  });
  assert.deepEqual(replyTo("A wish list", [{ id: "mia" }, { id: "bruno" }]), {
    choose: "A wish list",
    chosen: null,
  });
  assert.deepEqual(replyTo("A wish list", [{ id: "mia" }]), {
    choose: "A wish list",
    chosen: "mia",
  });
  assert.deepEqual(replyTo("A wish list", []), {
    choose: "A wish list",
    chosen: null,
  });
});

test("the kobold is busy while the last thing it says is a question being answered or an idea being written", () => {
  const me: Said = { id: 1, by: "me", text: "Hi", files: [], steer: false };
  assert.equal(busyOf([], []), null);
  assert.equal(busyOf([me], []), null);
  const thinking: Said = {
    id: 2,
    by: "kobold",
    thinking: true,
    asked: question,
  };
  assert.deepEqual(busyOf([me, thinking], []), {
    at: 2,
    asked: question,
    job: null,
  });
  const answering = job("j1", { kind: "answer", about: "Who pays at night?" });
  assert.equal(busyOf([me, thinking], [answering])?.job, "j1");
  const writing: Said = { id: 3, by: "kobold", job: "j2", asked: idea };
  assert.deepEqual(busyOf([me, writing], [job("j2")]), {
    at: 3,
    asked: idea,
    job: "j2",
  });
  assert.equal(busyOf([me, writing], [job("j2", { working: false })]), null);
  const done: Said = { id: 4, by: "kobold", text: "Mia." };
  assert.equal(busyOf([me, thinking, done], []), null);
});

test("steering asks again with what was added, and files go as the server takes them", () => {
  assert.deepEqual(steered(question, " only on phones "), {
    ...question,
    question: "Who pays at night?\n\nAlso: only on phones",
  });
  assert.deepEqual(steered(idea, "for gifts too"), {
    ...idea,
    text: "A wish list\n\nAlso: for gifts too",
  });
  assert.deepEqual(filesOf([picture]), [
    { id: picture.id, name: "screen.png" },
  ]);
});
