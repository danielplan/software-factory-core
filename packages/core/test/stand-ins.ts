// Stand-in extensions and kits for the tests: shaped like the real ones,
// with nothing behind them.

import { join } from "node:path";

import {
  defineExtension,
  defineKit,
  type Available,
  type Product,
} from "../src/index.ts";

export const ACME = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "examples",
  "acme",
);

const portFrom = (product: Product) =>
  ({ env: `${product.folder}/.env`, key: "PORT", default: 3000 }) as const;

export const webKit = defineKit({
  id: "react-web-app",
  name: "React web app",
  about: "A web app made with React and Vite.",
  kind: "react-web-app",
  commands: { verify: "npm run verify", start: "npm run dev" },
  rules: ["rules/web-app.md"],
  guides: [{ agent: "builder", title: "Web apps", file: "guides/web.md" }],
  partsFor: (product) => [
    {
      id: product.id,
      name: product.name,
      area: "products",
      does: product.about,
      dependsOn: product.dependsOn,
      folder: product.folder,
      run: ["npm", "run", "dev"],
      port: portFrom(product),
      start: "auto",
    },
  ],
});

export const backendKit = defineKit({
  id: "nestjs-backend",
  name: "NestJS backend",
  about: "A server made with NestJS.",
  kind: "nestjs-backend",
  commands: { verify: "npm run verify", start: "npm start" },
  partsFor: (product) => [
    {
      id: product.id,
      name: product.name,
      area: "products",
      does: product.about,
      dependsOn: product.dependsOn,
      folder: product.folder,
      run: ["npm", "start"],
      health: "/health",
      start: "auto",
    },
  ],
});

export const systemTab = defineExtension({
  id: "system-tab",
  name: "System tab",
  about: "The parts with their lights and buttons.",
  core: true,
});

export const runner = defineExtension({
  id: "github-runner",
  name: "GitHub runner",
  about: "Plans and builds the board's cards.",
  core: true,
  parts: [
    {
      id: "runner",
      name: "Factory runner",
      area: "factory",
      does: "Works on the board's cards.",
      run: ["npm", "start"],
      port: { fixed: 4180 },
      start: "button",
      startChoice: true,
    },
  ],
  settings: [
    {
      id: "github",
      name: "GitHub",
      about: "The repository and board the factory works with.",
      file: ".factory/.env",
      usedBy: ["runner"],
      fields: [
        {
          key: "FACTORY_REPOSITORY",
          label: "GitHub repository",
          help: "As owner/name.",
          kind: "text",
          pattern: "^[\\w.-]+/[\\w.-]+$",
        },
        {
          key: "FACTORY_PROJECT",
          label: "Board number",
          help: "The number at the end of the board's address.",
          kind: "number",
          default: "1",
          min: 1,
          max: 9999,
        },
        {
          key: "FACTORY_MODEL",
          label: "Model",
          help: "Which model plans the cards.",
          kind: "choice",
          choices: [
            { value: "", label: "The account's default" },
            { value: "sonnet", label: "Sonnet" },
          ],
        },
      ],
    },
  ],
  guides: [{ agent: "builder", title: "Cards", file: "guides/cards.md" }],
});

export const voice = defineExtension({
  id: "voice",
  name: "Voice",
  about: "Talk to the coach out loud.",
});

export const available: Available = {
  extensions: [systemTab, runner, voice],
  kits: [webKit, backendKit],
};
