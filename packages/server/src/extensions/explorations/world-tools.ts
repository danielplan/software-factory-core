// The kobold's world tools, next to its board tools on the same MCP server:
// look at the made-up world the exploration's prototypes share, read a
// table's rows, change rows, and start again from a situation. Instant:
// every prototype shows the change the next time it asks (within a few
// seconds), and nothing has to be made again. When to use them is in the
// exploration coach's guide ("The made-up world").

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  KobbleRefused,
  worldChangeSchema,
  WorldRefused,
  worldText,
} from "@software-factory/core";
import { z } from "zod";

import type { ExplorationWorlds } from "./worlds.ts";

const MOST_ROWS = 200;

export function addWorldTools(
  server: McpServer,
  worlds: ExplorationWorlds,
  id: string,
): void {
  server.registerTool(
    "look_at_world",
    {
      description:
        "The made-up world the prototypes share: who is signed in, the product's own tables (by their own names) and how many rows each has, and the situations it can start from.",
    },
    () => said(() => lookAt(worlds, id)),
  );
  server.registerTool(
    "world_rows",
    {
      description: `The rows of one table of the made-up world, as JSON (at most ${String(MOST_ROWS)}).`,
      inputSchema: { table: z.string() },
    },
    ({ table }) =>
      said(() => {
        const rows = worlds.world(id).tables[table];
        if (!rows) return `There is no table ${table}.`;
        return JSON.stringify(rows.slice(0, MOST_ROWS), null, 1);
      }),
  );
  server.registerTool(
    "change_world",
    {
      description:
        "Change rows of the made-up world, all at once or none: `add` a row, `change` a row by its id (only the columns given change), `remove` a row by its id. Use the tables' own column names and keep the rows consistent with each other (what a row points at exists).",
      inputSchema: { changes: z.array(worldChangeSchema).min(1) },
    },
    ({ changes }) =>
      said(() => {
        const world = worlds.change(id, null, changes);
        const tables = [...new Set(changes.map((one) => one.table))];
        return `Changed ${tables.join(", ")}: the world is at version ${String(world.version)}. Every prototype shows it within a few seconds.`;
      }),
  );
  server.registerTool(
    "use_situation",
    {
      description:
        "Start the made-up world again from a situation (look_at_world lists them); every prototype shows it. Without one, start again from the situation it is in.",
      inputSchema: { situation: z.string().optional() },
    },
    ({ situation }) =>
      said(() => {
        const world = situation
          ? worlds.start(id, situation)
          : worlds.reset(id);
        return `The world starts again from ${world.situation}.`;
      }),
  );
}

function lookAt(worlds: ExplorationWorlds, id: string): string {
  const world = worlds.world(id);
  const names = worlds.names();
  const name =
    names.find((one) => one.key === world.situation)?.name ?? world.situation;
  const situations = names
    .map((one) => `- ${one.key}: ${one.name}. ${one.about}`)
    .join("\n");
  return `${worldText(world, name)}\nSituations:\n${situations}`;
}

// The tool's answer, or why the world refused, in plain words.
function said(act: () => string) {
  try {
    return { content: [{ type: "text" as const, text: act() }] };
  } catch (error) {
    if (!(error instanceof WorldRefused || error instanceof KobbleRefused))
      throw error;
    return {
      content: [{ type: "text" as const, text: error.message }],
      isError: true,
    };
  }
}
