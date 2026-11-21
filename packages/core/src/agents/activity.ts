// Turns Claude Code's stream of events into short plain lines the owner sees.

export type ActivityEvent = {
  type?: string;
  subtype?: string;
  is_error?: boolean;
  duration_ms?: number;
  message?: {
    content?: {
      type?: string;
      name?: string;
      text?: string;
      input?: Record<string, unknown>;
    }[];
  };
};

// A command in plain words: what it is for when Claude said so, otherwise
// what kind of command it is and what it works on (the files, the tests, the
// package, git's own command); never the raw command line.
const KINDS_OF_COMMAND: [RegExp, string, (command: string) => string[]][] = [
  [
    /\b(test|vitest|jest|playwright)\b|--test\b/,
    "Running the tests",
    (command) =>
      pathsIn(command).filter((path) => /\.(test|spec)\./.test(path)),
  ],
  [/\b(eslint|lint|prettier)\b/, "Checking the code's style", pathsIn],
  [/\b(tsc|typecheck)\b/, "Checking the types", () => []],
  [/\b(npm|pnpm|yarn) (ci|install|i)\b/, "Installing packages", () => []],
  [/\brun build\b|\bvite build\b/, "Building", packagesIn],
  [/^\s*git\b/, "Working with git", gitWords],
  [
    /^\s*(ls|cat|head|tail|grep|rg|find|sed|wc|diff)\b/,
    "Looking through",
    pathsIn,
  ],
];

// "cd <folder>" in front of a command only says where it runs.
function withoutCd(command: string): string {
  let rest = command.trimStart();
  for (;;) {
    const cd = /^cd\s+[^\s;&]+\s*(?:&&|;)/.exec(rest);
    if (!cd) return rest;
    rest = rest.slice(cd[0].length).trimStart();
  }
}

// The files and folders a command names, by their last part, at most three.
function pathsIn(command: string): string[] {
  const paths = command
    .split(/[\s;|&<>()]+/)
    .map(
      (word) =>
        word.replaceAll('"', "").replaceAll("'", "").split(":")[0] ?? "",
    )
    .filter(
      (word) =>
        !word.startsWith("-") &&
        !word.includes("node_modules") &&
        !word.startsWith("/dev/") &&
        !word.includes("*") &&
        (word.includes("/") || /\.[a-z]{1,5}$/i.test(word)) &&
        /[a-z]/i.test(word),
    )
    .map((word) => word.replace(/\/$/, "").split("/").at(-1) ?? word)
    .filter((word) => word && word !== "." && word !== "..");
  return [...new Set(paths)];
}

// The packages a build names (npm run build -w @scope/name: "name").
function packagesIn(command: string): string[] {
  return [...command.matchAll(/(?:-w|--workspace)[= ]\s*(\S+)/g)].map((found) =>
    (found[1] ?? "").replace(/^@[^/]+\//, ""),
  );
}

// Git's own command and what it is on: "diff main...proto/X-5-e".
function gitWords(command: string): string[] {
  const found = /^\s*git\s+([\w-]+)((?:\s+[^-\s;&|][^\s;&|]*)?)/.exec(command);
  return found ? [`${found[1] ?? ""}${found[2] ?? ""}`] : [];
}

// A tool of an MCP server (mcp__<server>__<tool>) in words: the browser's
// as what it does there ("In the browser: click"), any other by its name.
function otherTool(name: string): string {
  if (!name.startsWith("mcp__")) return `Using ${name}`;
  const rest = name.slice(5);
  const cut = rest.lastIndexOf("__");
  if (cut <= 0) return `Using ${name}`;
  const server = rest.slice(0, cut);
  const tool = rest.slice(cut + 2);
  const words = tool.replace(/^browser_/, "").replaceAll("_", " ");
  return /playwright|browser/.test(server)
    ? `In the browser: ${words}`
    : `Using ${words} (${server.replace(/^plugin_/, "")})`;
}

function commandWords(description: string, command: string): string {
  if (description) return `Running: ${shorten(description, 120)}`;
  const plain = withoutCd(command);
  const kind = KINDS_OF_COMMAND.find(([pattern]) => pattern.test(plain));
  if (!kind) return "Running a command";
  const [, words, what] = kind;
  const on = what(plain);
  const named = on.slice(0, 3).join(", ") + (on.length > 3 ? ", …" : "");
  if (!named)
    return words === "Looking through" ? "Looking through files" : words;
  return shorten(`${words}: ${named}`, 120);
}

export function describeEvent(
  event: ActivityEvent,
  workspace: string,
): string[] {
  if (event.type === "system" && event.subtype === "init")
    return ["Getting started"];
  if (event.type === "result") return [describeResult(event)];
  if (event.type !== "assistant") return [];
  return describeMessage(event, workspace);
}

function describeMessage(event: ActivityEvent, workspace: string): string[] {
  const lines: string[] = [];
  for (const block of event.message?.content ?? []) {
    if (block.type === "text" && block.text?.trim())
      lines.push(shorten(block.text.trim().replace(/\s+/g, " "), 160));
    if (block.type === "tool_use")
      lines.push(describeTool(block.name ?? "", block.input ?? {}, workspace));
  }
  return lines;
}

function describeResult(event: ActivityEvent): string {
  const time = formatDuration(event.duration_ms ?? 0);
  return event.is_error || event.subtype !== "success"
    ? `Stopped with an error after ${time}`
    : `Finished in ${time}`;
}

type ToolInput = { text: (key: string) => string; path: string };

// One plain line per tool Claude uses; any other tool is "Using <name>".
const TOOL_LINES: Record<string, (input: ToolInput) => string> = {
  Read: ({ path }) => `Reading ${path}`,
  Edit: ({ path }) => `Editing ${path}`,
  MultiEdit: ({ path }) => `Editing ${path}`,
  NotebookEdit: ({ path }) => `Editing ${path}`,
  Write: ({ path }) => `Writing ${path}`,
  Bash: ({ text }) => commandWords(text("description"), text("command")),
  PowerShell: ({ text }) => commandWords(text("description"), text("command")),
  Grep: ({ text }) => `Searching for “${shorten(text("pattern"), 60)}”`,
  Glob: ({ text }) => `Looking for files ${shorten(text("pattern"), 60)}`,
  Skill: ({ text }) => `Using the ${text("skill")} skill`,
  Agent: ({ text }) => `Asking a helper: ${shorten(text("description"), 80)}`,
  Task: ({ text }) => `Asking a helper: ${shorten(text("description"), 80)}`,
  TodoWrite: () => "Updating its to-do list",
  WebFetch: ({ text }) =>
    `Looking up ${shorten(text("url") || text("query"), 80)}`,
  WebSearch: ({ text }) =>
    `Looking up ${shorten(text("url") || text("query"), 80)}`,
};

function describeTool(
  name: string,
  input: Record<string, unknown>,
  workspace: string,
): string {
  const text = (key: string) => {
    const value = input[key];
    return typeof value === "string" ? value : "";
  };
  const path = relative(
    text("file_path") || text("path") || text("notebook_path"),
    workspace,
  );
  const line = Object.hasOwn(TOOL_LINES, name) ? TOOL_LINES[name] : undefined;
  return line ? line({ text, path }) : otherTool(name);
}

function relative(path: string, workspace: string): string {
  const normal = (value: string) => value.replaceAll("\\", "/");
  const base = normal(workspace).replace(/\/$/, "") + "/";
  const full = normal(path);
  return full.toLowerCase().startsWith(base.toLowerCase())
    ? full.slice(base.length)
    : full;
}

function shorten(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

export function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ${seconds % 60} s`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}
