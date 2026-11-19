import { copyFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { build } from "vite";

// npm run prototype -- --base /prototype/new-web-app/ --out <folder>
// Builds the app in prototype mode (the pretend backend in MSW's service
// worker, the situations in prototype/situations.ts) as static files in
// <folder>, to be served at <base>, with index.html for unknown paths.
// The folder is emptied first. With FACTORY_WORLD_URL set, the pretend
// backend uses the factory's shared world instead (see the README).

const { values } = parseArgs({
  options: { base: { type: "string" }, out: { type: "string" } },
});
if (!values.base || !values.out) {
  process.stderr.write(
    "Usage: npm run prototype -- --base <url path> --out <folder>\n",
  );
  process.exit(1);
}

const parts = values.base.split("/").filter(Boolean);
const base = parts.length > 0 ? `/${parts.join("/")}/` : "/";
const out = resolve(values.out);
const root = resolve(import.meta.dirname, "..");
// Vite hands VITE_ settings to the page.
process.env.VITE_FACTORY_WORLD_URL = process.env.FACTORY_WORLD_URL ?? "";

await build({
  root,
  configLoader: "native",
  mode: "prototype",
  base,
  logLevel: "warn",
  build: { outDir: out, emptyOutDir: true },
});

// The worker lives outside public/, so the real build never contains it.
copyFileSync(
  join(root, "prototype", "public", "mockServiceWorker.js"),
  join(out, "mockServiceWorker.js"),
);
process.stdout.write(`Prototype for ${base} built in ${out}\n`);
