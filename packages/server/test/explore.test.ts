import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import type { Claude } from "@software-factory/core";

import type { Cli } from "../src/add-ons/github/github.ts";
import type { PrototypePage } from "../src/explore/prototype-page.ts";
import { marksIn } from "../src/explore/send.ts";
import type { ExploreList, IdeaPage } from "../src/explore/views.ts";
import { git, inGit } from "./git-project.ts";
import { pretendClaude } from "./pretend-claude.ts";
import { BOARD, pretendGitHub } from "./pretend-github.ts";
import { acmeServed } from "./acme-served.ts";
import { stage } from "./stage.ts";

// Explore and prototype mode through the server, on the example company's
// records: the ideas and one idea with its versions and picks, a new idea
// from a story or from a team member's own (the kobold writes the story it
// assumes, with a pretend Claude Code that calls its tool over MCP), a
// version tried, made and shared, and one sent to Build on a stand-in
// GitHub board.

const NO_GITHUB: Cli = {
  run: () => Promise.resolve({ code: 1, out: "", err: "" }),
  start: () => ({ answer: () => {}, done: Promise.resolve(1) }),
};

async function exploring(
  claude: Claude = pretendClaude([]).claude,
  cli: Cli = NO_GITHUB,
  company: object = {},
) {
  const staged = await stage(
    claude,
    {},
    {
      cli,
      fetcher: () => Promise.reject(new Error("offline")),
    },
  );
  const served = acmeServed(staged);
  const file = join(served.root, "factory.json");
  writeFileSync(
    file,
    JSON.stringify({ ...JSON.parse(readFileSync(file, "utf8")), ...company }),
  );
  inGit(staged.project, "Pia");
  return served;
}

test("Explore lists the ideas, and one idea with its shared versions, picks and the lead", async () => {
  const factory = await exploring();
  try {
    const list = await factory.read<ExploreList>("/api/explore");
    assert.deepEqual(list.ideas[0], {
      id: "wish",
      title: "Wish list",
      persona: { id: "mia", name: "Mia", at: 0 },
      state: "exploring",
      stage: "picked",
      versions: 3,
      unshared: 0,
    });
    const states = Object.fromEntries(list.ideas.map((i) => [i.id, i.state]));
    assert.deepEqual(
      [states.monday, states.later, states.pickup, states.remind],
      ["inBuild", "worked", "didntWork", "exploring"],
    );
    // A story holds and breaks at a problem not solved yet.
    const stories = list.stories.map((s) => s.id);
    assert.ok(stories.includes("st1"));
    assert.ok(!stories.includes("st2"), "its problem is solved");
    assert.ok(!stories.includes("st3"), "it breaks at no problem");
    assert.equal(list.personas.length, 4);

    const wish = await factory.read<IdeaPage>("/api/explore/idea?id=wish");
    assert.equal(wish.me, "Pia");
    assert.deepEqual(
      wish.versions.map((v) => [v.key, v.picks.length, v.mine]),
      [
        ["A", 1, true],
        ["B", 2, false],
        ["C", 0, false],
      ],
    );
    assert.deepEqual(
      [wish.lead, wish.tie],
      [{ key: "B", name: "Basket keeps it for later" }, false],
    );
    assert.deepEqual(wish.for, [
      {
        problem: "find",
        title: wish.for[0]?.title,
        assumed: false,
        story: { id: "st1", persona: "mia", title: wish.for[0]?.story?.title },
      },
    ]);
    const pickup = await factory.read<IdeaPage>("/api/explore/idea?id=pickup");
    assert.deepEqual(
      [pickup.persona?.name, pickup.assumed?.id],
      ["Mia", "st3"],
    );
    assert.deepEqual(pickup.tickets, [{ issue: 109, version: "A" }]);
    assert.deepEqual(
      [pickup.stage, pickup.answer],
      ["didntWork", { issue: 109, worked: "no", by: "Tobias", on: "Oct" }],
    );
    assert.deepEqual([wish.stage, wish.answer], ["picked", null]);
    const none = await factory.read<{ error: string }>(
      "/api/explore/idea?id=nope",
    );
    assert.equal(none.error, "There is no idea “nope”.");
  } finally {
    factory.close();
  }
});

test("a pick is one per person per idea; pressing it again takes it back", async () => {
  const factory = await exploring();
  try {
    const pick = (version: string) =>
      factory.send("/api/explore/pick", { idea: "wish", version });
    assert.equal((await pick("B")).body.done, "Pia picked B.");
    let wish = await factory.read<IdeaPage>("/api/explore/idea?id=wish");
    assert.deepEqual(
      wish.versions.map((v) => [v.key, v.picks]),
      [
        ["A", []],
        ["B", ["Anna", "Luca", "Pia"]],
        ["C", []],
      ],
    );
    assert.equal((await pick("B")).body.done, "Pia took the pick back.");
    wish = await factory.read<IdeaPage>("/api/explore/idea?id=wish");
    assert.deepEqual(
      wish.versions.map((v) => v.picks.length),
      [0, 2, 0],
    );
    assert.equal((await pick("Q")).status, 409);
    // Two versions with the most picks: a tie, nobody leads.
    await factory.send("/api/explore/pick", { idea: "size", version: "B" });
    await factory.send("/api/explore/pick", { idea: "size", version: "B" });
    const size = await factory.read<IdeaPage>("/api/explore/idea?id=size");
    assert.deepEqual([size.lead?.key, size.tie], ["A", false]);
  } finally {
    factory.close();
  }
});

test("a new idea starts from a story, for its problem and persona; one that cannot is refused", async () => {
  const factory = await exploring();
  try {
    const made = await factory.send("/api/explore/ideas", {
      story: "st7",
      title: "A size chart",
    });
    assert.equal(made.status, 200);
    const records = await factory.records();
    const idea = records.ideas.find((i) => i.id === made.body.idea.id);
    assert.deepEqual(
      [idea?.origin, idea?.problems, idea?.persona],
      [{ from: "problem", id: "size" }, ["size"], "noah"],
    );
    assert.match(idea?.weThink ?? "", /^It would help Noah with “/);
    const wrong = await factory.send("/api/explore/ideas", {
      story: "st3",
      title: "Again",
    });
    assert.match(wrong.body.error, /breaks at no problem/);
    const bare = await factory.send("/api/explore/ideas", { story: "st7" });
    assert.match(bare.body.error, /This idea does not fit/);
    // An idea with nothing come of it yet can be thrown away.
    await factory.send("/api/explore/discard", { idea: made.body.idea.id });
    assert.ok(
      !(await factory.records()).ideas.some((i) => i.id === made.body.idea.id),
    );
    const kept = await factory.send("/api/explore/discard", { idea: "wish" });
    assert.match(kept.body.error, /has versions already/);
  } finally {
    factory.close();
  }
});

const WRITTEN = {
  title: "Standing order",
  weThink: "If his supplies came every Monday, Bruno would never run out.",
  story: {
    title: "Sunday evening, nothing ordered",
    starts: "Sunday evening, thinking about the week",
    wants: "Flour on Monday without logging in",
    scenes: [
      { text: "He remembers he has not ordered yet", breaks: false },
      {
        text: "He forgets once, and Monday starts without flour",
        breaks: true,
      },
    ],
    instead: "Calls the shop on Monday morning",
  },
  problem: {
    title: "Remembers to order too late",
    reading: "Ordering is a chore he does by memory.",
  },
};

test("the kobold writes an own idea with the story it assumes, every scene guessed", async () => {
  const twice = {
    ...WRITTEN,
    story: {
      ...WRITTEN.story,
      scenes: WRITTEN.story.scenes.map((s) => ({ ...s, breaks: true })),
    },
  };
  const pretend = pretendClaude([
    {
      calls: [
        ["write_idea", twice],
        ["write_idea", WRITTEN],
      ],
      reply: "Written.",
    },
  ]);
  const factory = await exploring(pretend.claude);
  try {
    const sent = await factory.send("/api/explore/own", {
      text: "Supplies that come every Monday on their own",
      persona: "bruno",
    });
    assert.equal(sent.body.job.kind, "idea");
    const [job] = await factory.settled();
    assert.equal(job?.done, "Wrote the idea and the story it assumes.");
    assert.ok(job.made);
    assert.match(pretend.answers[0]?.[0] ?? "", /breaks 2 times/);
    const page = await factory.read<IdeaPage>(
      `/api/explore/idea?id=${job.made}`,
    );
    assert.deepEqual(
      [page.idea.origin, page.persona?.id, page.for[0]?.assumed, page.state],
      [{ from: "person", name: "Pia" }, "bruno", true, "exploring"],
    );
    assert.ok(page.assumed?.scenes.every((s) => s.evidence.length === 0));
    assert.deepEqual(page.assumed?.from, { idea: job.made });
    const [run] = pretend.seen;
    assert.match(
      run?.instructions ?? "",
      /## Writing the story behind an own idea/,
    );
    assert.match(run?.prompt ?? "", /Pia has an idea for bruno/);
    // Thrown away, it goes with its story and its assumed problem.
    await factory.send("/api/explore/discard", { idea: job.made });
    const records = await factory.records();
    assert.ok(
      !records.stories.some(
        (s) => "idea" in s.from && s.from.idea === job.made,
      ),
    );
    const assumed = page.for[0]?.problem;
    assert.ok(!records.problems.some((p) => p.id === assumed));
    const nobody = await factory.send("/api/explore/own", {
      text: "x",
      persona: "zed",
    });
    assert.equal(nobody.body.error, "There is no persona “zed”.");
  } finally {
    factory.close();
  }
});

test("an own idea the kobold did not write, or could not, says why", async () => {
  const pretend = pretendClaude([{ calls: [], reply: "I would rather not." }]);
  const factory = await exploring(pretend.claude);
  try {
    await factory.send("/api/explore/own", { text: "A bell", persona: "mia" });
    await factory.send("/api/explore/own", { text: "Another", persona: "mia" });
    // Newest first: the second could not run, the first wrote nothing.
    const jobs = await factory.settled();
    assert.equal(
      jobs[1]?.problem,
      "The kobold wrote no idea. I would rather not.",
    );
    assert.ok(jobs[0]?.problem);
    assert.equal(jobs[0].made, null);
  } finally {
    factory.close();
  }
});

test("prototype mode shows an idea's versions, starts one, makes another and shares it", async () => {
  const claude: Claude = {
    async run(options) {
      writeFileSync(join(options.cwd, "bell.txt"), "A bell at nine\n");
      return { ok: true, text: "Done." };
    },
  };
  const factory = await exploring(claude, NO_GITHUB, {
    prototype: {
      start: "echo FACTORY_URL=http://127.0.0.1:5998/$FACTORY_VERSION",
    },
  });
  try {
    const page = await factory.read<PrototypePage>("/api/prototypes?idea=wish");
    assert.equal(page.canRun, true);
    assert.deepEqual(
      page.versions.map((v) => [v.key, v.run.state]),
      [
        ["A", "stopped"],
        ["B", "stopped"],
        ["C", "stopped"],
      ],
    );
    const started = await factory.send("/api/prototypes/start", {
      idea: "wish",
      version: "A",
    });
    assert.ok(["starting", "running"].includes(started.body.run.state));
    const made = await factory.send("/api/prototypes/make", {
      idea: "remind",
      text: "a bell at nine",
    });
    assert.equal(made.body.version.key, "A");
    for (let tries = 0; tries < 500; tries++) {
      const runs = (
        await factory.read<PrototypePage>("/api/prototypes?idea=remind")
      ).versions;
      if (runs[0]?.run.state === "stopped") break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    let remind = await factory.read<IdeaPage>("/api/explore/idea?id=remind");
    assert.deepEqual([remind.versions.length, remind.unshared], [0, 1]);
    // The list says so too, so the idea does not look untouched.
    const listed = (await factory.read<ExploreList>("/api/explore")).ideas;
    assert.equal(listed.find((i) => i.id === "remind")?.unshared, 1);
    const shared = await factory.send("/api/prototypes/share", {
      idea: "remind",
      version: "A",
    });
    assert.equal(shared.body.done, "Version A is shared: it shows on Explore.");
    remind = await factory.read<IdeaPage>("/api/explore/idea?id=remind");
    assert.deepEqual([remind.versions.length, remind.unshared], [1, 0]);
    const copy = join(factory.home, "project-prototypes", "remind", "a");
    assert.match(
      git(copy, "log", "-1", "--format=%s"),
      /^Version A of the idea remind/,
    );
    await factory.send("/api/prototypes/stop", { idea: "wish", version: "A" });
    const stopped = await factory.read<PrototypePage>(
      "/api/prototypes?idea=wish",
    );
    assert.equal(stopped.versions[0]?.run.state, "stopped");
    const missing = await factory.send("/api/prototypes/share", {
      idea: "remind",
      version: "Q",
    });
    assert.match(missing.body.error, /no version Q/);
  } finally {
    factory.close();
  }
});

test("a version sent to Build becomes an issue with the ids in a hidden mark, and the idea is in Build", async () => {
  const github = pretendGitHub();
  const factory = await exploring(pretendClaude([]).claude, github.cli);
  try {
    const none = await factory.send("/api/explore/send", {
      idea: "wish",
      version: "B",
    });
    assert.match(none.body.error, /connect a GitHub board/);
    const file = join(factory.root, "factory.json");
    writeFileSync(
      file,
      JSON.stringify({
        ...JSON.parse(readFileSync(file, "utf8")),
        tracker: "github",
      }),
    );
    writeFileSync(
      join(factory.root, "board.json"),
      JSON.stringify({ github: BOARD }),
    );
    const sent = await factory.send("/api/explore/send", {
      idea: "wish",
      version: "B",
    });
    assert.deepEqual(sent.body, {
      issue: 9,
      url: "https://github.com/acme/shop/issues/9",
    });
    const issue = github.issues.get(9);
    assert.equal(issue?.title, "Wish list");
    assert.match(
      issue.body,
      /\*\*The version:\*\* B · Basket keeps it for later, on the branch `factory\/wish\/b`/,
    );
    assert.match(issue.body, /Sent to Build by Pia\./);
    assert.deepEqual(marksIn(issue.body), {
      idea: "wish",
      version: "B",
      problems: ["find"],
    });
    assert.equal(marksIn("No mark here."), null);
    const records = await factory.records();
    assert.deepEqual(
      records.ticketLinks.find((t) => t.issue === 9),
      {
        issue: 9,
        kind: "idea",
        from: { idea: "wish", version: "B" },
        problems: ["find"],
        on: new Date().toISOString().slice(0, 10),
      },
    );
    const wish = await factory.read<IdeaPage>("/api/explore/idea?id=wish");
    assert.deepEqual(
      [wish.state, wish.tickets],
      ["inBuild", [{ issue: 9, version: "B" }]],
    );
    const again = await factory.send("/api/explore/send", {
      idea: "wish",
      version: "A",
    });
    assert.match(again.body.error, /is in Build already/);
    const nothing = await factory.send("/api/explore/send", {
      idea: "wish",
      version: "Q",
    });
    assert.match(nothing.body.error, /There is no version Q/);
  } finally {
    factory.close();
  }
});
