// Digging deeper into one variant: the team picked a direction, so the
// prototype keeps that variant as its base, the other variants' code goes,
// and new variants refine the kept one (at most three), in one maker run.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { toolAnswer } from "../../mcp.ts";
import { Refused } from "../../refused.ts";
import { type Made, withVariant } from "./versions.ts";

export type Way = { name: string; difference: string };

const MOST_NEW = 3;

// The prototype with only the kept variant and the new ones, their letters,
// and what the maker is asked.
export function deeperIn(
  made: Made,
  keep: string,
  ways: Way[],
): { made: Made; keys: string[]; request: string } {
  const kept = (made.variants ?? []).find(
    (one) => one.key === keep.trim().toUpperCase(),
  );
  if (!kept) throw new Refused(`Prototype ${made.key} has no variant ${keep}.`);
  if (ways.length === 0 || ways.length > MOST_NEW)
    throw new Refused(
      `Give one to ${String(MOST_NEW)} new variants of ${kept.key}.`,
    );
  const dropped = (made.variants ?? [])
    .filter((one) => one.key !== kept.key)
    .map((one) => one.key);
  let next: Made = { ...made, variants: [kept], variant: kept.key };
  const keys: string[] = [];
  for (const way of ways) {
    const added = withVariant(next, way);
    next = added.made;
    keys.push(added.key);
  }
  const asked = ways
    .map(
      (way, at) =>
        `${keys[at] ?? ""} (“${way.name.trim()}”): ${way.difference.trim()}`,
    )
    .join("; ");
  const gone =
    dropped.length > 0
      ? ` and take out the code of the other variants (${dropped.join(", ")}), so only ${kept.key} is left`
      : "";
  return {
    made: next,
    keys,
    request: `Dig deeper into variant ${kept.key} (“${kept.name}”): make it the base${gone}. Then add these variants, each a refinement of ${kept.key} that changes only what it names: ${asked}.`,
  };
}

// The kobold's tool for it.
export function addDeeperTool(
  server: McpServer,
  deeper: (prototype: string, keep: string, ways: Way[]) => string[],
): void {
  server.registerTool(
    "dig_deeper",
    {
      description:
        "When the team has picked one variant and wants to go further in that direction: keep that variant as the base, take the others off, and add one to three new variants that each refine the kept one in a detail (wording, layout, what is shown first). One maker run. Say in one line what you started.",
      inputSchema: {
        prototype: z.string().describe("The prototype (A, A2 …)."),
        keep: z.string().describe("The variant to keep (its letter)."),
        ways: z
          .array(
            z.object({
              name: z.string().min(1).describe("A few words."),
              difference: z
                .string()
                .min(1)
                .describe(
                  "How it refines the kept variant, complete enough for the maker.",
                ),
            }),
          )
          .min(1)
          .max(MOST_NEW),
      },
    },
    (args) =>
      toolAnswer(() => {
        const keys = deeper(args.prototype, args.keep, args.ways);
        return `Digging deeper into ${args.keep.toUpperCase()}: the other variants go, and ${keys.join(", ")} are being made as refinements of it.`;
      }),
  );
}
