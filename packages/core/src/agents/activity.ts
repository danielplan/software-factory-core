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

export function describeEvent(
  event: ActivityEvent,
  workspace: string,
): string[] {
  if (event.type === "system" && event.subtype === "init")
    return ["Claude started"];
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
  Bash: ({ text }) =>
    `Running: ${shorten(text("description") || text("command"), 120)}`,
  PowerShell: ({ text }) =>
    `Running: ${shorten(text("description") || text("command"), 120)}`,
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
  return line ? line({ text, path }) : `Using ${name}`;
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
