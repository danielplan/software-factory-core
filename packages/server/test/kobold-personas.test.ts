import assert from "node:assert/strict";
import { test } from "node:test";

import type { Claude } from "@software-factory/core";

import type { KoboldJob } from "../src/kobold/kobold.ts";
import { acmeServed } from "./acme-served.ts";
import { pretendClaude } from "./pretend-claude.ts";
import { stage } from "./stage.ts";

// Personas from what people said: the kobold makes one when no persona fits
// a signal, a person makes one by hand, and either is confirmed; and the
// kobold's line of jobs: a job waiting its turn says so, a person's choice
// made while it waited stays, and no job's token ever leaves the server.

async function koboldFactory(claude: Claude) {
  return acmeServed(await stage(claude));
}

const sara = {
  name: "Sara",
  role: "Salon owner who takes bookings online",
  description: "Runs a small salon and takes bookings from her website.",
  wants: ["Fewer people who book and do not come"],
};

const newStory = {
  to: "newStory",
  story: {
    title: "A booking from the website",
    starts: "A client books online at night",
    wants: "To know the client will come",
    scenes: [
      { text: "A client books online.", shows: false, breaks: false },
      { text: "No reminder goes out.", shows: true, breaks: true },
    ],
    problem: {
      title: "Clients forget their booking",
      reading: "Nothing reminds them the day before.",
    },
  },
};

test("a signal no persona fits makes a new persona, which a person confirms with Looks good", async () => {
  const pretend = pretendClaude([
    {
      calls: [
        [
          "sort_signal",
          {
            sortedAs: "need",
            soundsLike: "mia",
            why: "Both.",
            newPersona: sara,
            place: newStory,
          },
        ],
        [
          "sort_signal",
          {
            sortedAs: "need",
            soundsLike: null,
            why: "Shops on her phone.",
            newPersona: { ...sara, role: "commuter shopper" },
            place: newStory,
          },
        ],
        [
          "sort_signal",
          {
            sortedAs: "need",
            soundsLike: null,
            why: "Takes bookings for her salon online.",
            newPersona: sara,
            place: newStory,
          },
        ],
      ],
      reply: "Sorted.",
    },
  ]);
  const factory = await koboldFactory(pretend.claude);
  try {
    await factory.send("/api/signals", {
      source: "sup",
      id: "s30",
      text: "Two clients booked on the website and never came: no reminder.",
    });
    const [job] = await factory.settled();
    assert.deepEqual(pretend.answers[0]?.slice(0, 2), [
      "Give either soundsLike or newPersona: a signal sounds like one persona.",
      "There is a persona like that already: mia (Mia, Commuter shopper).",
    ]);
    assert.equal(
      job?.done,
      "New persona: Sara, Salon owner who takes bookings online, for a person to confirm. It starts a new story: “A booking from the website”.",
    );
    const records = await factory.records();
    const persona = records.personas.find((p) => p.id === "sara");
    assert.deepEqual(
      [persona?.by, persona?.wants, persona?.basedOn],
      ["kobold", sara.wants, []],
    );
    const story = records.stories.find(
      (s) => "signals" in s.from && s.from.signals[0] === "s30",
    );
    assert.ok(story);
    assert.equal(story.persona, "sara");
    const problem = records.problems.find((p) => p.id === story.problem);
    assert.deepEqual([problem?.persona, problem?.by], ["sara", "kobold"]);
    assert.equal(
      records.signals.find((s) => s.id === "s30")?.soundsLike,
      "sara",
    );

    // Looks good: the persona the kobold made is the team's now.
    await factory.send("/api/understand/looks-good", { signal: "s30" });
    const confirmed = (await factory.records()).personas.find(
      (p) => p.id === "sara",
    );
    assert.notEqual(confirmed?.by, "kobold");
    assert.equal(
      (await factory.send("/api/personas/confirm", { persona: "sara" })).body
        .error,
      "Sara is the team's already.",
    );
  } finally {
    factory.close();
  }
});

test("a persona run never makes a persona", async () => {
  const pretend = pretendClaude([
    {
      calls: [
        [
          "sort_signal",
          {
            sortedAs: "unsure",
            soundsLike: null,
            why: "A run.",
            newPersona: sara,
            place: { to: "unsure" },
          },
        ],
      ],
      reply: "Done.",
    },
  ]);
  const factory = await koboldFactory(pretend.claude);
  try {
    const runs = await factory.send("/api/sources", {
      name: "Runs",
      kind: "personaRuns",
    });
    await factory.send("/api/signals", {
      source: runs.body.source.id,
      text: "Sara could not find the bookings page.",
    });
    const [job] = await factory.settled();
    assert.deepEqual(pretend.answers[0], [
      "A persona run never makes a persona: it is a check, not a real person.",
    ]);
    assert.match(job?.problem ?? "", /^The kobold did not sort it\./);
    assert.equal(
      (await factory.records()).personas.some((p) => p.id === "sara"),
      false,
    );
  } finally {
    factory.close();
  }
});

test("a person adds a persona, and confirms one the kobold made", async () => {
  const factory = await koboldFactory(pretendClaude([]).claude);
  try {
    const made = await factory.send("/api/personas", {
      name: " Ana ",
      role: "Clinic receptionist",
    });
    assert.equal(made.status, 200);
    const persona = (await factory.records()).personas.find(
      (p) => p.id === "ana",
    );
    assert.deepEqual(
      [persona?.name, persona?.description, persona?.wants],
      ["Ana", "", []],
    );
    assert.notEqual(persona?.by, "kobold");
    for (const [body, error] of [
      [{ name: "ana", role: "Someone else" }, /^There is a persona like that/],
      [{ name: "Bo", role: "BAKERY OWNER" }, /: bruno \(Bruno, Bakery owner\)/],
      [{ name: "", role: "Nobody" }, /^This persona does not fit: /],
      [{ name: "Cy", role: "X", age: 3 }, /^This persona does not fit: /],
    ] as const)
      assert.match(
        (await factory.send("/api/personas", body)).body.error,
        error,
      );
    assert.equal(
      (await factory.send("/api/personas/confirm", { persona: "zed" })).body
        .error,
      "There is no persona “zed”.",
    );
    // A new story for a persona that is not there is refused at once.
    assert.equal(
      (
        await factory.send("/api/understand/move", {
          signal: "s1",
          to: { to: "newStory", persona: "nobody" },
        })
      ).body.error,
      "There is no persona “nobody”.",
    );
  } finally {
    factory.close();
  }
});

test("a job waiting its turn says so, a person's choice made meanwhile stays, and no token leaves the server", async () => {
  const pretend = pretendClaude([
    {
      calls: [
        [
          "sort_signal",
          {
            sortedAs: "bug",
            soundsLike: null,
            why: "Something does not work.",
            place: { to: "build" },
          },
        ],
      ],
      reply: "Sorted.",
    },
    { calls: [], reply: "Not sure where it goes." },
    { calls: [], reply: "Mia said her basket was empty (s40)." },
  ]);
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tokens: string[] = [];
  const claude: Claude = {
    async run(options) {
      const token = options.mcp?.headers["x-kobold"];
      if (token) tokens.push(token);
      if (tokens.length === 1 && token) await gate;
      return await pretend.claude.run(options);
    },
  };
  const factory = await koboldFactory(claude);
  try {
    await factory.send("/api/signals", {
      source: "fb",
      id: "s40",
      text: "My basket was empty when I came back.",
    });
    while (tokens.length === 0)
      await new Promise((resolve) => setTimeout(resolve, 5));
    await factory.send("/api/signals", {
      source: "fb",
      id: "s41",
      text: "The pay button does nothing.",
    });
    const jobs = await factory.read<{ jobs: KoboldJob[] }>(
      "/api/understand/kobold",
    );
    assert.deepEqual(
      jobs.jobs.map((job) => [job.about, job.working, job.waiting]),
      [
        ["s41", true, true],
        ["s40", true, false],
      ],
    );
    const asked = await factory.send("/api/understand/move", {
      signal: "s1",
      to: { to: "newStory" },
    });
    assert.deepEqual(
      [asked.body.job.waiting, "token" in asked.body.job],
      [true, false],
    );
    const shown = JSON.stringify([jobs, asked.body]);
    assert.ok(!shown.includes(tokens[0] ?? "?"));
    assert.ok(!shown.includes("token"));

    // A person sends s41 to Build while its sort waits: their choice stays.
    await factory.send("/api/understand/move", {
      signal: "s41",
      to: { to: "build" },
    });
    release();
    const ended = await factory.settled();
    const s41 = ended.find((job) => job.about === "s41");
    assert.match(s41?.done ?? "", /^Already placed by .+\.$/);
    assert.equal(s41?.waiting, false);
    const signal = (await factory.records()).signals.find(
      (s) => s.id === "s41",
    );
    assert.notEqual(signal?.by, "kobold");
    assert.equal(tokens.length, 2);

    // The kobold answers questions with what people said, sorted or not.
    await factory.send("/api/understand/question", {
      question: "What did people say about the basket?",
    });
    const prompt = pretend.seen.at(-1)?.prompt ?? "";
    assert.match(prompt, /What people said, the latest signals:/);
    assert.match(
      prompt,
      /- s41 \(Feedback button, went to build\): The pay button does nothing\./,
    );
    assert.match(prompt, /- s40 \(Feedback button, went to build\): My basket/);
  } finally {
    factory.close();
  }
});
