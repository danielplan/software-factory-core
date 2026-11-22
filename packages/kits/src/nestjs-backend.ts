// The NestJS backend kit: a server made with NestJS. It recognises one by
// its packages, runs it with its start command on the port it is given,
// and makes a new one from its own starter (starters/nestjs-backend): the
// kit's standards and checks, with its database as a setting. The factory
// starts a backend with `npm start` (the starter's prepares its database,
// builds and runs it); `npm run start:dev` is for a person working on it by
// hand.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { defineKit, type Product } from "@software-factory/core";

import {
  commandsOf,
  doesOf,
  readableName,
  readPackageJson,
  verifyCommand,
} from "./package-json.ts";
import { rulesOf } from "./libraries.ts";
import { installIn, starterFolder } from "./starters.ts";

const PORT = 3000;
// Building and preparing the database can take a while on a slow computer.
const START_SECONDS = 180;

export const nestjsBackend = defineKit({
  id: "nestjs-backend",
  name: "NestJS backend",
  about: "A server made with NestJS.",
  kind: "nestjs-backend",
  commands: { start: "npm start" },
  rules: rulesOf("nestjs-backend"),
  port: PORT,
  detect: (folder) => {
    const file = readPackageJson(folder);
    if (!file?.packages.has("@nestjs/core")) return null;
    return {
      name: readableName(file, folder),
      commands: commandsOf({
        start: startCommand(file.scripts),
        verify: verifyCommand(file),
        checkWorld: file.scripts.has("check:world")
          ? "npm run check:world"
          : undefined,
      }),
    };
  },
  partsFor: (product: Product) => {
    const port = product.port ?? PORT;
    const settings = join(product.folder, ".env");
    return [
      {
        id: product.id,
        name: product.name,
        area: "products",
        does: doesOf(product, "server"),
        type: product.type ?? "backend",
        dependsOn: product.dependsOn,
        folder: product.folder,
        // A backend that lists its settings in .env.example cannot start
        // without its .env.
        ...(existsSync(`${settings}.example`) && { needs: [settings] }),
        prepare: [{ label: "Installing packages", packages: true }],
        run: product.commands.start?.split(/\s+/).filter(Boolean) ?? [
          "npm",
          "start",
        ],
        env: { PORT: String(port) },
        port: { fixed: port },
        // Without a health address, the port being open counts as started.
        ...(answersHealth(product.folder) && { health: "/health" }),
        start: "auto",
        startSeconds: START_SECONDS,
        help: {
          title: `${product.name} did not start`,
          text: "Often its database is not running or not reachable: start it (its README says how), check DATABASE_URL in its .env, then press Try again.",
        },
      },
    ];
  },
  starter: starterFolder("nestjs-backend"),
  create: installIn,
});

// The factory's start: `npm start`, or the development start of a backend
// that only has that one.
function startCommand(scripts: Set<string>): string | undefined {
  if (scripts.has("start")) return "npm start";
  if (scripts.has("start:dev")) return "npm run start:dev";
  return undefined;
}

const HEALTH_ROUTE = /@Get\(\s*["'`]\/?health["'`]\s*\)/;

// Whether the backend's code has a `/health` route (the starter's answers once
// its database does), so the factory waits for it.
function answersHealth(folder: string): boolean {
  const source = join(folder, "src");
  if (!existsSync(source)) return false;
  return readdirSync(source, { recursive: true, encoding: "utf8" })
    .filter((path) => path.endsWith(".controller.ts"))
    .some((path) =>
      HEALTH_ROUTE.test(readFileSync(join(source, path), "utf8")),
    );
}
