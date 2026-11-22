// Sprocket's plug. Extensions are installed and removed, so they never call
// one another: they meet only at plugs the core defines (docs: Plugs). This
// one is where an extension lets Sprocket hand work on to its kobold: its
// hand-offs (tools Sprocket may use) and a paragraph of what Sprocket should
// know about it. Sprocket hears a plug only while its extension is
// installed; removing the extension takes its hand-offs and its words away,
// and nothing else breaks.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z, type ZodRawShape } from "zod";

import { toolAnswer } from "../mcp.ts";

// What a hand-off did, and where it takes the person (an address in the
// page, #explore/X-3), if anywhere.
export type Done = { said: string; to?: string };

export type HandOff = {
  name: string;
  description: string;
  input: ZodRawShape;
  run: (args: unknown) => Done | Promise<Done>;
};

export type SupportPlug = {
  // The extension it comes with, by id: heard only while that one is on.
  extension: string;
  // The pages of it Sprocket may take the person to.
  pages: string[];
  // What Sprocket knows about it: its page, its kobold, when to hand on.
  guide: string;
  handOffs: HandOff[];
};

// A hand-off with its input checked and typed.
export function handOff<Shape extends ZodRawShape>(made: {
  name: string;
  description: string;
  input?: Shape;
  run: (args: z.infer<z.ZodObject<Shape>>) => Done | Promise<Done>;
}): HandOff {
  const input = made.input ?? ({} as Shape);
  return {
    name: made.name,
    description: made.description,
    input,
    run: (args) => made.run(z.object(input).parse(args)),
  };
}

// The installed extensions' hand-offs, as Sprocket's tools; each that takes
// the person somewhere moves the page there.
export function plugInto(
  server: McpServer,
  plugs: SupportPlug[],
  go: (to: string) => void,
): void {
  for (const hand of plugs.flatMap((plug) => plug.handOffs))
    server.registerTool(
      hand.name,
      { description: hand.description, inputSchema: hand.input },
      (args: unknown) =>
        toolAnswer(async () => {
          const done = await hand.run(args);
          if (!done.to) return done.said;
          go(done.to);
          return `${done.said} They are now at ${done.to}.`;
        }),
    );
}

// What the installed extensions let Sprocket do, for its instructions.
export function plugsGuide(plugs: SupportPlug[]): string {
  if (plugs.length === 0)
    return "## What the installed extensions let you do\n\nNothing beyond Kobble's own pages: no extension that hands work on is installed.";
  return `## What the installed extensions let you do\n\n${plugs.map((plug) => plug.guide.trim()).join("\n\n")}`;
}
