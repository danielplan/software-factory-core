// Sprocket as the guide: it finds what the person means (the explorations,
// the new signals), takes them to the right place, and hands work on to the
// kobold whose job it is, moving them there: Doodle for an idea or a word
// on an exploration, the tester for a persona's mission, the builder or
// Doodle for a signal. It does nothing alone.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { toolAnswer } from "../mcp.ts";
import { explorationsText, placeOf, signalsText } from "./support-hands.ts";
import type { SupportTools } from "./support-tools.ts";

export function guideTools(server: McpServer, on: SupportTools): void {
  const went = (to: string, said: string) => {
    on.go(to);
    return `${said} They are now at ${to}.`;
  };
  findTools(server, on, went);
  doodleTools(server, on, went);
  otherHands(server, on, went);
}

type Went = (to: string, said: string) => string;

// Where things are: a place to take the person, the explorations, the new
// signals.
function findTools(server: McpServer, on: SupportTools, went: Went): void {
  server.registerTool(
    "go_to",
    {
      description:
        "Takes the person to a place in Kobble: a page (#home, #signals, #explore, #build, #releases, #personas, #system, #extensions, #settings) or something in it (#explore/X-3, #personas/ana, #personas/ana/tests).",
      inputSchema: { place: z.string().describe("The address, with its #.") },
    },
    (args) => toolAnswer(() => went(placeOf(args.place), "Moved.")),
  );
  server.registerTool(
    "list_explorations",
    { description: "The explorations there are: id, title, where they are." },
    () => toolAnswer(() => explorationsText(on.store())),
  );
  server.registerTool(
    "list_new_signals",
    { description: "The signals not sorted on yet: id, kind, what it says." },
    () => toolAnswer(() => signalsText(on.store())),
  );
}

// Doodle: a new idea, or a word on an exploration there is.
function doodleTools(server: McpServer, on: SupportTools, went: Went): void {
  server.registerTool(
    "explore_with_doodle",
    {
      description:
        "Hands a new idea to Doodle: a new exploration, started, where Doodle opens the conversation; takes the person there. Only once they agreed to the title and the problem.",
      inputSchema: {
        title: z.string().min(1).describe("A few words."),
        problem: z
          .string()
          .describe(
            "The problem it solves and for whom, two or three sentences.",
          ),
        persona: z
          .string()
          .optional()
          .describe("A persona's id from list_personas, when one fits."),
      },
    },
    (args) => toolAnswer(() => went(on.hands.idea(args), "Handed to Doodle.")),
  );
  server.registerTool(
    "tell_doodle",
    {
      description:
        "Passes the person's words to Doodle on an exploration there is, and takes them there to carry on with Doodle.",
      inputSchema: {
        exploration: z.string().describe("Its id, from list_explorations."),
        words: z.string().min(1).describe("What they want Doodle to hear."),
      },
    },
    (args) =>
      toolAnswer(() =>
        went(on.hands.tellDoodle(args.exploration, args.words), "Told Doodle."),
      ),
  );
}

// The tester (a persona's mission) and a signal to the builder or Doodle.
function otherHands(server: McpServer, on: SupportTools, went: Went): void {
  server.registerTool(
    "send_on_mission",
    {
      description:
        "Hands a persona's mission to the tester, who uses the app as that persona; takes the person to the persona's tests. Only once they agreed to the mission.",
      inputSchema: {
        persona: z.string().describe("A persona's id from list_personas."),
        task: z
          .string()
          .min(1)
          .describe("What the persona tries, in a sentence or two."),
      },
    },
    (args) =>
      toolAnswer(() =>
        went(
          on.hands.mission(args.persona, args.task),
          "Handed to the tester.",
        ),
      ),
  );
  server.registerTool(
    "send_signal",
    {
      description:
        "Hands a new signal on: to the builder (a card on the Factory board, to fix) or to Doodle (an exploration, to think through); takes the person there. Only once they agreed.",
      inputSchema: {
        id: z.string().describe("The signal's id, from list_new_signals."),
        to: z.enum(["builder", "doodle"]),
      },
    },
    (args) =>
      toolAnswer(async () =>
        went(
          await on.hands.signal(args.id, args.to),
          `Handed to ${args.to === "builder" ? "the builder" : "Doodle"}.`,
        ),
      ),
  );
}
