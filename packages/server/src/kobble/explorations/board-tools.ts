// The kobold's tools in an exploration's conversation, served over MCP (the
// standard way to give Claude new actions): it looks at the board, adds
// notes, diagrams and choices, changes and removes things, links and
// unlinks them with a short label, points at a thing (the person's view
// moves there), marks a thing agreed or a sketch, and starts making an
// option's prototype. Each answers with
// what it did and the whole board. Beside them, the made-up world's tools
// (world-tools.ts). Only the conversation's own Claude Code
// has the token.

import type { IncomingMessage, ServerResponse } from "node:http";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { COACH_HEADER } from "../../coach/setup-tools.ts";
import { answerMcp, toolAnswer } from "../../mcp.ts";
import type { Act } from "./board-acts.ts";
import type { Option } from "./board-things.ts";
import { addWorldTools } from "./world-tools.ts";
import type { ExplorationWorlds } from "./worlds.ts";
import { addDeeperTool, type Way } from "./deeper.ts";

export type BoardTools = {
  token: string;
  act: (act: Act) => string;
  look: () => string;
  point: (id: string) => string;
  rename: (change: { title?: string; problem?: string }) => string;
  // Starts making the prototype of a choice's option, or changing one.
  make: (choice: string, options: string[], opens?: string) => string;
  change: (prototype: string, change: string) => string;
  another: (
    prototype: string,
    way: { name: string; difference: string },
  ) => string;
  handOff: () => Promise<string>;
  deeper: (prototype: string, keep: string, ways: Way[]) => string[];
  // The made-up world its prototypes share, and the exploration's id.
  world: { worlds: ExplorationWorlds; id: string };
};

const option = z.object({
  key: z
    .string()
    .optional()
    .describe("An option to change (A, B…); none: a new one."),
  name: z.string().optional().describe("A few words."),
  difference: z.string().optional().describe("How it differs, in one line."),
});

// The arrow a new thing comes with: from the thing it follows on the board.
const FROM = {
  from: z
    .string()
    .optional()
    .describe("The thing this one follows: its arrow comes in the same step."),
  label: z.string().optional().describe("The arrow's label, a word or two."),
};
const fromOf = (a: Record<string, unknown>) => ({
  ...(typeof a.from === "string" ? { from: a.from } : {}),
  ...(typeof a.label === "string" ? { label: a.label } : {}),
});

const TOOLS: {
  name: string;
  description: string;
  input: z.ZodRawShape;
  act: (args: Record<string, unknown>) => Act;
}[] = [
  {
    name: "add_note",
    description:
      "A short note: something the team said or decided, a line or two.",
    input: { text: z.string().min(1), ...FROM },
    act: (a) => ({ act: "note", text: String(a.text), ...fromOf(a) }),
  },
  {
    name: "add_diagram",
    description:
      "A simple Mermaid flowchart in plain words (the steps of a journey, who talks to whom, the stages something goes through); at most a dozen boxes, no developer words.",
    input: { title: z.string().min(1), diagram: z.string().min(1), ...FROM },
    act: (a) => ({
      act: "diagram",
      title: String(a.title),
      diagram: String(a.diagram),
      ...fromOf(a),
    }),
  },
  {
    name: "add_choice",
    description:
      "A real choice: the question that has to be decided and its options (A, B, C), each a few words with a one-line difference, and the one you recommend (its letter), which the board marks.",
    input: {
      title: z.string().min(1),
      options: z.array(option),
      recommended: z
        .string()
        .optional()
        .describe("The option you recommend (A, B …)."),
      ...FROM,
    },
    act: (a) => ({
      act: "choice",
      title: String(a.title),
      options: a.options as Partial<Option>[],
      ...(typeof a.recommended === "string"
        ? { recommended: a.recommended }
        : {}),
      ...fromOf(a),
    }),
  },
  {
    name: "change_thing",
    description:
      "Change a thing by its id: a note's text, a title, a diagram, a choice's options (change by letter, add without one, removeOptions by letter) or the option you recommend.",
    input: {
      id: z.string(),
      text: z.string().optional(),
      title: z.string().optional(),
      diagram: z.string().optional(),
      options: z.array(option).optional(),
      removeOptions: z.array(z.string()).optional(),
      recommended: z.string().optional(),
    },
    act: (a) => ({ act: "change", ...(a as { id: string }) }),
  },
  {
    name: "remove_thing",
    description: "Take a thing off the board, with its arrows.",
    input: { id: z.string() },
    act: (a) => ({ act: "remove", id: String(a.id) }),
  },
  {
    name: "link",
    description:
      "An arrow from one thing to another, with a short label (a word or two). For a new thing, give `from` when you add it instead: it comes with its arrow.",
    input: { from: z.string(), to: z.string(), label: z.string().optional() },
    act: (a) => ({
      act: "link",
      from: String(a.from),
      to: String(a.to),
      label: typeof a.label === "string" ? a.label : "",
    }),
  },
  {
    name: "unlink",
    description: "Take an arrow off.",
    input: { from: z.string(), to: z.string() },
    act: (a) => ({ act: "unlink", from: String(a.from), to: String(a.to) }),
  },
  {
    name: "choose_option",
    description:
      "Mark the option the team picked on a choice (its letter), or none to take it back. Use it when they decide; never write the decision into the choice's title.",
    input: { id: z.string(), option: z.string().nullable() },
    act: (a) => ({
      act: "choose",
      id: String(a.id),
      option: typeof a.option === "string" ? a.option.toUpperCase() : null,
    }),
  },
  {
    name: "agree",
    description:
      "Mark a thing agreed (talked through and agreed with the team) or a sketch again. One prototype at most is agreed.",
    input: { id: z.string(), agreed: z.boolean() },
    act: (a) => ({ act: "agree", id: String(a.id), agreed: a.agreed === true }),
  },
];

function serverFor(on: BoardTools): McpServer {
  const server = new McpServer({ name: "board", version: "1.0.0" });
  for (const tool of TOOLS)
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.input },
      (args) => toolAnswer(() => on.act(tool.act(args))),
    );
  server.registerTool(
    "look_at_board",
    {
      description:
        "The whole board: its things with their ids, and the arrows.",
    },
    () => toolAnswer(() => on.look()),
  );
  server.registerTool(
    "point_at",
    {
      description:
        "Point at a thing while you talk about it: the person's view moves there.",
      inputSchema: { id: z.string() },
    },
    (args) => toolAnswer(() => on.point(args.id)),
  );
  server.registerTool(
    "name_exploration",
    {
      description:
        "The exploration's title (a few words) or its problem (two or three sentences).",
      inputSchema: {
        title: z.string().optional(),
        problem: z.string().optional(),
      },
    },
    (args) => toolAnswer(() => on.rename(args)),
  );
  addPrototypeTools(server, on);
  addDeeperTool(server, on.deeper);
  server.registerTool(
    "hand_off",
    {
      description:
        "Hand the exploration off to the factory, as the Hand off button does: the agreed prototype (and its variant) becomes a card in To do, the go-ahead to build it, and the exploration closes. Only after the team said yes to handing it off. With a prototype on the board, it must be agreed first (agree, with the variant chosen, in an earlier step): the builder builds from its code and look, and a prototype that is not agreed is refused. An idea that changes no screen (how something works, a rule) and has no prototype is handed off from the board's agreed choices, notes and diagrams.",
    },
    () => toolAnswer(() => on.handOff()),
  );
  addWorldTools(server, on.world.worlds, on.world.id);
  return server;
}

// Making a choice's option's prototype, and changing one.
function addPrototypeTools(server: McpServer, on: BoardTools): void {
  server.registerTool(
    "make_prototype",
    {
      description:
        "Start making a choice's prototype: one prototype with its options as variants (all of them unless you name some), made at once in one copy of the code in a few minutes. It appears on the board at once; the team switches between the variants on the board. Calling it again for options not made yet adds them as variants. An exploration has one prototype: for a new choice, its options replace the variants, on top of the variant shown so far. Say in one line what you started.",
      inputSchema: {
        choice: z.string().describe("The choice's id (choice-1)."),
        options: z
          .array(z.string())
          .optional()
          .describe("The options' letters (A, B …); none: all of them."),
        opens: z
          .string()
          .regex(/^[/#?]/)
          .optional()
          .describe(
            "The page the change is on, where the prototype opens: a path (/orders) or a page of an app that keeps its pages after # (#build).",
          ),
      },
    },
    (args) =>
      toolAnswer(() => on.make(args.choice, args.options ?? [], args.opens)),
  );
  server.registerTool(
    "change_prototype",
    {
      description:
        "Change a prototype that is already on the board, as the team asks (what it shows, where a button leads, what a page says; name the variant when it is one variant's): the maker changes it in its copy in a few minutes; the board shows it being made, then running again. Use it whenever the team wants a prototype different; a note does not change it. Say in one line what you started.",
      inputSchema: {
        prototype: z.string().describe("The prototype's letter (A, A2 …)."),
        change: z
          .string()
          .min(1)
          .describe("What to change, in the team's words, complete."),
      },
    },
    (args) => toolAnswer(() => on.change(args.prototype, args.change)),
  );
  addAnotherWay(server, on);
}

// Another way: a variant added to a prototype.
function addAnotherWay(server: McpServer, on: BoardTools): void {
  server.registerTool(
    "another_way",
    {
      description:
        "Another way to do what a prototype does: a variant added to it, made in its copy beside the others, so the team switches between them on the board and compares. Use it when the team is unsure how a screen should look or work, or asks to see it done differently; four variants at most. Say in one line how it differs.",
      inputSchema: {
        prototype: z
          .string()
          .describe("The prototype it is a variant of (A, A2 …)."),
        name: z.string().min(1).describe("A few words."),
        difference: z
          .string()
          .min(1)
          .describe("How it differs, complete enough for the maker."),
      },
    },
    (args) =>
      toolAnswer(() =>
        on.another(args.prototype, {
          name: args.name,
          difference: args.difference,
        }),
      ),
  );
}

export async function answerBoardTools(
  incoming: IncomingMessage,
  response: ServerResponse,
  on: BoardTools,
  body: unknown,
): Promise<void> {
  if (incoming.headers[COACH_HEADER] !== on.token) {
    response.writeHead(403, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Only this exploration's kobold." }));
    return;
  }
  await answerMcp(incoming, response, serverFor(on), body);
}
