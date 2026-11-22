import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { defineKit } from "@software-factory/core";
import { templateFolder } from "@software-factory/knowledge-base";
import { templatesFolder } from "@software-factory/skills";

import type { Configuration } from "../src/coach/configure.ts";
import { Session } from "../src/session.ts";

// The whole way a new factory gets its apps, as the setup coach builds it:
// `configure` with the project, then its new products, then the tracker.
// Each product is made from its kit's starter, then described next to its
// code with the commands its kit finds there and what its starter brings.

function starterKit(kind: string, starter: string) {
  return defineKit({
    id: kind,
    name: `The ${kind} kit`,
    about: "A stand-in kit with a starter.",
    kind,
    commands: { start: "npm start" },
    port: kind === "web" ? 5173 : 3000,
    starter,
    detect: (folder) =>
      existsSync(join(folder, "src", "main.ts"))
        ? { name: "Found", commands: { verify: "npm run verify" } }
        : null,
    // Finishes the copy, as installing its packages would.
    create: (folder) => [
      [
        process.execPath,
        "-e",
        `require("fs").writeFileSync(${JSON.stringify(join(folder, "installed"))}, "")`,
      ],
    ],
  });
}

function starter(name: string, more: Record<string, string> = {}): string {
  const folder = mkdtempSync(join(tmpdir(), "starter-"));
  mkdirSync(join(folder, "src"));
  for (const [file, text] of Object.entries(more)) {
    mkdirSync(join(folder, file, ".."), { recursive: true });
    writeFileSync(join(folder, file), text);
  }
  writeFileSync(join(folder, "package.json"), JSON.stringify({ name }));
  writeFileSync(
    join(folder, "src", "main.ts"),
    `export const app = "${name}";\n`,
  );
  return folder;
}

test("configure makes each new product from its kit's starter, then describes it", async () => {
  const project = mkdtempSync(join(tmpdir(), "fresh-"));
  // The owner pressed "Set up Kobble": the coach builds.
  mkdirSync(join(project, "factory"));
  writeFileSync(
    join(project, "factory", "setup.json"),
    JSON.stringify({
      conversation: "",
      phase: "build",
      messages: [],
      map: { cards: [], links: [] },
    }),
  );
  const session = new Session({
    project,
    available: {
      extensions: [],
      kits: [
        starterKit("web", starter("new-web")),
        // A backend's starter with its settings and a made-up world.
        starterKit(
          "server",
          starter("new-server", {
            ".env.example":
              "DATABASE_URL=postgres://here/new-server\nDATABASE_NAME=\n",
            "prototype-world/start.json": "{}",
          }),
        ),
      ],
    },
    templates: {
      knowledgeBase: templateFolder,
      agents: join(templatesFolder, "AGENTS.md"),
    },
    onChange: () => {},
    coach: {
      claude: { run: () => Promise.resolve({ ok: true, text: "" }) },
      guide: "Help set up.",
      ideaGuide: "Shape the idea.",
    },
    tools: [],
  });
  try {
    const tools = session.coachTools();
    const configure = (asked: Configuration) => {
      assert.ok(tools.configure);
      return tools.configure(asked);
    };
    await configure({ project: { name: "Bike shop", about: "Repairs." } });
    const said = await configure({
      products: [
        {
          name: "Booking app",
          kind: "web",
          about: "Where customers book.",
          dependsOn: ["Booking server"],
        },
        { name: "Booking server", kind: "server", about: "The bookings." },
      ],
    });
    assert.match(said, /^Added Booking app, Booking server\.\n/);
    await configure({ tracker: "none" });

    for (const [id, from] of [
      ["booking-app", "new-web"],
      ["booking-server", "new-server"],
    ] as const) {
      const folder = join(project, id);
      // The starter's code, named after the product, finished by the kit.
      const pkg = JSON.parse(
        readFileSync(join(folder, "package.json"), "utf8"),
      ) as { name: string };
      assert.equal(pkg.name, id);
      assert.match(readFileSync(join(folder, "src", "main.ts"), "utf8"), /app/);
      assert.ok(
        !readFileSync(join(folder, "src", "main.ts"), "utf8").includes(from),
      );
      assert.ok(existsSync(join(folder, "installed")));
      // Its description, with the check its kit found, and its blueprint.
      const described = JSON.parse(
        readFileSync(join(folder, "product.json"), "utf8"),
      ) as { commands: Record<string, string>; dependsOn: string[] };
      assert.deepEqual(described.commands, { verify: "npm run verify" });
      assert.ok(existsSync(join(folder, "BLUEPRINT.md")));
    }
    const app = JSON.parse(
      readFileSync(join(project, "booking-app", "product.json"), "utf8"),
    ) as { dependsOn: string[]; copyEnv: object; world?: string };
    assert.deepEqual(app.dependsOn, ["booking-server"]);
    assert.deepEqual([app.copyEnv, app.world], [{}, undefined]);
    assert.ok(!existsSync(join(project, "booking-app", ".env")));
    // What the backend's starter brings: its settings file, its world, and
    // a database of its own in each working copy.
    const server = join(project, "booking-server");
    const backend = JSON.parse(
      readFileSync(join(server, "product.json"), "utf8"),
    ) as { copyEnv: object; world?: string };
    assert.equal(backend.world, "prototype-world");
    assert.deepEqual(backend.copyEnv, {
      DATABASE_NAME: "booking-server-{port:booking-server}",
    });
    assert.equal(
      readFileSync(join(server, ".env"), "utf8"),
      readFileSync(join(server, ".env.example"), "utf8"),
    );
    const state = session.state();
    assert.deepEqual(
      state.jobs.map((job) => [job.id, job.state]),
      [
        ["booking-app", "done"],
        ["booking-server", "done"],
      ],
    );
  } finally {
    session.close();
  }
});
