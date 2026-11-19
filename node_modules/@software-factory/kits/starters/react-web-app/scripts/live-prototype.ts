import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { createServer } from "vite";

// npm run prototype:live -- --port <port>
// The app's prototype running live (Vite's development server in prototype
// mode), at http://127.0.0.1:<port>/: the factory shows it while the
// prototype maker changes the screens, and each change shows within a
// second. The pretend backend's service worker is served from
// prototype/public, so the real app never has it. With FACTORY_WORLD_URL
// set, the pretend backend uses the factory's shared world.

const { values } = parseArgs({ options: { port: { type: "string" } } });
const port = Number(values.port);
if (!Number.isInteger(port) || port <= 0) {
  process.stderr.write("Usage: npm run prototype:live -- --port <port>\n");
  process.exit(1);
}

const root = resolve(import.meta.dirname, "..");
// Vite hands VITE_ settings to the page.
process.env.VITE_FACTORY_WORLD_URL = process.env.FACTORY_WORLD_URL ?? "";
const server = await createServer({
  root,
  configLoader: "native",
  mode: "prototype",
  base: "/",
  publicDir: resolve(root, "prototype", "public"),
  server: { host: "127.0.0.1", port, strictPort: true },
});
await server.listen();
process.stdout.write(`Prototype live at http://127.0.0.1:${port}/\n`);
