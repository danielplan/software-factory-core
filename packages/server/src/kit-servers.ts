// The MCP servers the kits of a project's products bring (their framework's
// documentation and checks), written into the project's .mcp.json, which
// Claude Code reads in the project: added only where the project has no
// server of that name, never changing one it has. A .mcp.json that cannot
// be read is left as it is.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { Kit } from "@software-factory/core";
import { z } from "zod";

export const MCP_FILE = ".mcp.json";

// The names of the servers added.
export function addKitServers(project: string, kits: Kit[]): string[] {
  const wanted = kits.flatMap((kit) => Object.entries(kit.mcp));
  if (wanted.length === 0) return [];
  const file = join(project, MCP_FILE);
  const config = readConfig(file);
  if (!config) return [];
  const servers = config.mcpServers;
  const added = wanted.filter(([name]) => !(name in servers));
  if (added.length === 0) return [];
  for (const [name, server] of added) servers[name] = server;
  writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
  return added.map(([name]) => name);
}

// The project's MCP settings: what it has, and its servers by name.
const configSchema = z.looseObject({
  mcpServers: z.record(z.string(), z.unknown()).default({}),
});
type Config = z.infer<typeof configSchema>;

function readConfig(file: string): Config | null {
  if (!existsSync(file)) return { mcpServers: {} };
  try {
    const read = configSchema.safeParse(
      JSON.parse(readFileSync(file, "utf8")) as unknown,
    );
    return read.success ? read.data : null;
  } catch {
    return null;
  }
}
