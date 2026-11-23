// The steps a coach takes between its words (a tool, reading the code),
// kept in its words where they happened, so the person sees what it did
// while it talked. A step is a comment (STEP_MARK): the page shows it as a
// small line of its own, in the person's language, from its name; Markdown
// shows nothing of it anywhere else. Reading and searching is one step,
// "read"; the same step twice in a row is kept once.

export const TOOL_PREFIX = "Using mcp__setup__";
// Claude Code reading or searching, as core's activity.ts puts it.
export const SHOWN = /^(Reading|Searching|Looking)/;
export const STEP_MARK = /<!-- step: ([a-z_]+) -->/;

// The coach's tool a line names: "Using add choice (setup)", as Claude Code's
// events are put into words (core's activity.ts), or its full name.
export function toolOf(line: string): string | null {
  if (line.startsWith(TOOL_PREFIX)) return line.slice(TOOL_PREFIX.length);
  const named = /^Using (.+) \(setup\)$/.exec(line);
  return named ? (named[1] ?? "").replaceAll(" ", "_") : null;
}

function stepOf(line: string, words: string): string | null {
  const tool = toolOf(line);
  if (tool) return tool;
  if (!SHOWN.test(line)) return null;
  // Its own words are reported too: "Looking at…" said is not a step.
  const said = words.replace(/\s+/g, " ");
  return said.includes(line.replace(/…$/, "")) ? null : "read";
}

function mark(step: string): string {
  return `<!-- step: ${step} -->`;
}

function joined(...parts: string[]): string {
  return parts.filter(Boolean).join("\n\n");
}

export class KeptSteps {
  // The turn's words and steps up to its last step; all Claude Code had
  // shown of its words at that step; and all it shows now.
  private said = "";
  private seen = "";
  private live = "";
  // What starts the next turn's words, when not the person (a prototype
  // made): shown as its first step.
  private opening = "";

  opensWith(step: string): void {
    this.opening = step;
  }

  start(): void {
    this.said = this.opening ? mark(this.opening) : "";
    this.opening = "";
    this.seen = "";
    this.live = "";
  }

  // Claude Code shows its words so far: the words and steps to show.
  wrote(reply: string): string {
    this.live = reply;
    return joined(this.said, this.fresh().trim());
  }

  // Claude Code reported what it does: the words and steps to show when
  // that was a step, null when it was not (or the same step again).
  took(line: string): string | null {
    const step = stepOf(line, this.live);
    if (!step) return null;
    const words = this.fresh().trim();
    this.seen = this.live;
    if (!words && this.said.endsWith(mark(step))) return null;
    this.said = joined(this.said, words, mark(step));
    return this.said;
  }

  // The turn's answer: with steps, what was shown (Claude Code's result
  // holds only its words after the last step); otherwise its result.
  answer(result: string): string {
    return this.said ? joined(this.said, this.fresh().trim()) : result;
  }

  // Its words after the last step (each answer between two steps starts
  // afresh).
  private fresh(): string {
    return this.live.startsWith(this.seen)
      ? this.live.slice(this.seen.length)
      : this.live;
  }
}
