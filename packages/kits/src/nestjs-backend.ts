// The NestJS backend kit: a server made with NestJS. It recognises one by
// its packages, runs it with its own start script on the port it is given,
// and makes a new one from its own starter (starters/nestjs-backend): the
// kit's standards and checks, with its database as a setting.

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
        start: file.scripts.has("start:dev")
          ? "npm run start:dev"
          : "npm start",
        verify: verifyCommand(file),
      }),
    };
  },
  partsFor: (product: Product) => {
    const port = product.port ?? PORT;
    return [
      {
        id: product.id,
        name: product.name,
        area: "products",
        does: doesOf(product, "server"),
        type: product.type ?? "backend",
        dependsOn: product.dependsOn,
        folder: product.folder,
        prepare: [{ label: "Installing packages", packages: true }],
        // Without a health address, the port being open counts as started.
        run: startScript(product),
        env: { PORT: String(port) },
        port: { fixed: port },
        start: "auto",
      },
    ];
  },
  starter: starterFolder("nestjs-backend"),
  create: installIn,
});

// The product's start command as a program to run: "npm run start:dev" or
// "npm start".
function startScript(product: Product): string[] {
  return product.commands.start === "npm run start:dev"
    ? ["npm", "run", "start:dev"]
    : ["npm", "start"];
}
