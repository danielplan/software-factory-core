import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

// npm run check:prototypes, after `npm run build` (part of npm run verify):
// the real build holds no prototype code (nothing that names the
// prototype's message or the shared world) and no MSW worker.

const dist = resolve(import.meta.dirname, "..", "dist");
if (!existsSync(dist)) {
  process.stderr.write("No dist/ to check: run npm run build first.\n");
  process.exit(1);
}

// Words only the prototype has: its message to the factory and the shared
// world's setting.
const markers = ["factory-prototype", "FACTORY_WORLD_URL"];

const files = readdirSync(dist, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => join(entry.parentPath, entry.name));

const found = files.filter(
  (file) =>
    file.endsWith("mockServiceWorker.js") ||
    markers.some((marker) => readFileSync(file, "latin1").includes(marker)),
);

if (found.length > 0) {
  process.stderr.write(
    `The real build contains prototype code:\n${found.join("\n")}\n`,
  );
  process.exit(1);
}
process.stdout.write(
  `The real build has no prototype code (${files.length} files).\n`,
);
