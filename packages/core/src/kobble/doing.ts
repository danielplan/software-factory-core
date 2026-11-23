// What a kobold is doing, sorted: Claude Code reports each action as a short
// English line ("Reading docs/design-system.md"); the server sorts that line
// into a kind and sends the kind, never the line. The page looks the kind up
// in its words, in each language, so the same step reads the same in the
// chat, the header and the board card. A kind is what the action touches
// ("the product's settings", "the design guide"), not how it was done.

export const DOING_KINDS = [
  // Getting going.
  "start",
  // Reading something.
  "read-settings",
  "read-design",
  "read-structure",
  "read-notes",
  "read-screen",
  "read-other",
  // Looking for something.
  "find-settings",
  "find-notes",
  "find-screens",
  "search",
  "look-around",
  "look-up",
  // Anything else it reports.
  "helper",
  "unknown",
  // Drawing on the board.
  "draw",
  "draw-note",
  "draw-choice",
  "draw-diagram",
  "draw-change",
  "draw-link",
  "draw-prototype",
  // Making a prototype.
  "edit",
  "write",
  "test",
  "check",
  "install",
  "build",
  "browser",
  "git",
  "plan",
  "run",
] as const;

export type DoingKind = (typeof DOING_KINDS)[number];

// How far a turn got: reading what it was given (0), learning how the
// product works (1), drawing on the board (2).
export type Stage = 0 | 1 | 2;

const TOOL_PREFIX = "Using mcp__setup__";

// The tools that put something on the map or board: the coach's `draw`, and
// the explorer's (explorations/board-tools.ts).
const DRAWING: Record<string, DoingKind> = {
  draw: "draw",
  add_note: "draw-note",
  add_choice: "draw-choice",
  add_diagram: "draw-diagram",
  change_thing: "draw-change",
  link: "draw-link",
  make_prototype: "draw-prototype",
};

// The tool a line names: "Using add choice (setup)", as Claude Code's events
// are put into words (activity.ts), or its full name.
function toolOf(line: string): string | null {
  if (line.startsWith(TOOL_PREFIX)) return line.slice(TOOL_PREFIX.length);
  const named = /^Using (.+) \(setup\)$/.exec(line);
  return named ? (named[1] ?? "").replaceAll(" ", "_") : null;
}

// What a line that names a file to read touches.
function readKind(path: string): DoingKind {
  if (/product\.json$/.test(path)) return "read-settings";
  if (/design-system/.test(path)) return "read-design";
  if (/architecture/.test(path)) return "read-structure";
  if (/\.md$/.test(path)) return "read-notes";
  if (/\.(tsx|jsx|css|html)$/.test(path)) return "read-screen";
  return "read-other";
}

// What a line that looks for files by name touches.
function findKind(pattern: string): DoingKind {
  if (/product\.json/.test(pattern)) return "find-settings";
  if (/\.md/.test(pattern)) return "find-notes";
  if (/\.(tsx|jsx)/.test(pattern)) return "find-screens";
  return "look-around";
}

// The lines that start with these are an action Claude Code reports; any
// other line is the kobold's own words, which say nothing of what it does.
const REPORTED =
  /^(Reading|Searching|Looking (for|through|up)|Using|Editing|Writing|Running|Asking a helper|Getting started|Starting|Working out|Updating|In the browser|Checking|Installing|Working with git|Building)/;

// How an action line starts, and its kind (from what it names, when it names
// something). The first that fits wins.
const RULES: [RegExp, (named: string) => DoingKind][] = [
  [/^Reading (.+)$/, readKind],
  [/^Looking for files (.+)$/, findKind],
  [/^Searching for/, () => "search"],
  [/^Looking through/, () => "look-around"],
  [/^Looking up/, () => "look-up"],
  [/^Asking a helper/, () => "helper"],
  [/^(Getting started|Starting|Working out)/, () => "start"],
  // What a prototype's maker does.
  [/^Editing /, () => "edit"],
  [/^Writing /, () => "write"],
  [/^Running the tests/, () => "test"],
  [/^Checking /, () => "check"],
  [/^Installing /, () => "install"],
  [/^Building/, () => "build"],
  [/^In the browser/, () => "browser"],
  [/^Working with git/, () => "git"],
  [/^Updating its to-do list/, () => "plan"],
  [/^Running/, () => "run"],
];

// The kind of an action line; null for a line that is not an action (the
// kobold's own words, "Finished in 3 s"), which changes nothing. An action
// that fits no kind is "unknown".
export function doingOf(line: string): DoingKind | null {
  const drawing = DRAWING[toolOf(line) ?? ""];
  if (drawing) return drawing;
  for (const [pattern, kind] of RULES) {
    const found = pattern.exec(line);
    if (found) return kind(found[1] ?? "");
  }
  return REPORTED.test(line) ? "unknown" : null;
}

// The stage an action moves a turn to: the first read or search to 1, the
// first drawing to 2, anything else leaves it where it is.
export function stageOf(kind: DoingKind): Stage {
  if (kind.startsWith("draw")) return 2;
  return /^(read-|find-)|^(search|look-around|look-up)$/.test(kind) ? 1 : 0;
}
