// The models Claude Code uses, chosen in the factory's Settings tab instead
// of in Claude Code's own settings files, one for each kind of work: talking
// (Sprocket, the explorer, the coaches) and making prototypes. The builder's
// is in its own group (builder-settings.ts). Each person's own (settings/,
// not shared): which models one can use depends on one's Claude account.

import { readSettings } from "../parts/addresses.ts";
import type { SettingGroup } from "../settings/setting-groups.ts";
import { PERSONAL_FILE } from "../settings/team-file.ts";
import type { Claude, Effort, RunOptions } from "./claude.ts";

export const MODEL_KEY = "FACTORY_CLAUDE_MODEL";
export const MAKER_MODEL_KEY = "FACTORY_MAKER_MODEL";
export const TALK_EFFORT_KEY = "FACTORY_TALK_EFFORT";
// The kobolds who talk think a problem through before they answer: a short
// reply is only good when the thinking behind it was not.
const TALK_EFFORT_DEFAULT: Effort = "high";
const EFFORTS: Effort[] = ["low", "medium", "high", "xhigh", "max"];
// Making a prototype writes a lot of code that is thrown away or built again
// properly: a fast model is worth more there than a careful one.
const MAKER_DEFAULT = "sonnet";

// The models to pick from, by Claude Code's names for the newest of each.
export const MODEL_CHOICES = [
  { value: "opus", label: "Opus: the most careful, the slowest" },
  { value: "sonnet", label: "Sonnet: fast and good, for most work" },
  { value: "haiku", label: "Haiku: the fastest, for small things" },
];

export const modelSettings: SettingGroup = {
  id: "ai-model",
  name: "AI models",
  about:
    "Which model the factory's own Claude Code runs use, for each kind of work.",
  file: PERSONAL_FILE,
  usedBy: [],
  fields: [
    {
      key: MODEL_KEY,
      label: "Talking",
      help: "Sprocket, the explorer and the coaches: the kobolds who talk with you. Only Claude Code runs use it, not Codex.",
      kind: "choice",
      default: "",
      choices: [
        { value: "", label: "The account's default" },
        ...MODEL_CHOICES,
      ],
    },
    {
      key: TALK_EFFORT_KEY,
      label: "Thinking before talking",
      help: "How long the kobolds who talk with you think a question through before they answer. More thinking answers later but better.",
      kind: "choice",
      default: TALK_EFFORT_DEFAULT,
      choices: [
        { value: "medium", label: "Medium: quick answers" },
        { value: "high", label: "High: thinks it through" },
        { value: "xhigh", label: "Extra high: plans more deeply" },
        { value: "max", label: "Max: the deepest, the slowest" },
      ],
    },
    {
      key: MAKER_MODEL_KEY,
      label: "Making prototypes",
      help: "The maker who writes an exploration's prototypes. Sonnet makes them about twice as fast as Opus.",
      kind: "choice",
      default: MAKER_DEFAULT,
      choices: MODEL_CHOICES,
    },
  ],
};

// The model for talking; none means the account's default.
function talkingModel(root: string): string | undefined {
  return readSettings(root, modelSettings.file)[MODEL_KEY]?.trim() || undefined;
}

// The model that makes prototypes: Sonnet unless someone chose another.
export function makerModel(root: string | null): string {
  if (!root) return MAKER_DEFAULT;
  const value = readSettings(root, modelSettings.file)[MAKER_MODEL_KEY];
  return value?.trim() || MAKER_DEFAULT;
}

// How hard the kobolds who talk think: high unless someone chose another.
function talkingEffort(root: string | null): Effort {
  if (!root) return TALK_EFFORT_DEFAULT;
  const value = readSettings(root, modelSettings.file)[TALK_EFFORT_KEY]?.trim();
  return EFFORTS.find((one) => one === value) ?? TALK_EFFORT_DEFAULT;
}

// Claude Code that adds the model and the thinking for talking to every run
// that names none. The settings are read again on each run, so a change
// applies to the next turn.
export function withChosenModel(claude: Claude, root: () => string | null) {
  return {
    run(options: RunOptions) {
      const folder = root();
      const model = folder ? talkingModel(folder) : undefined;
      const effort = options.effort ?? talkingEffort(folder);
      return claude.run({
        ...options,
        ...(options.model || !model ? {} : { model }),
        effort,
      });
    },
    ...(claude.tell ? { tell: claude.tell.bind(claude) } : {}),
    ...(claude.interrupt ? { interrupt: claude.interrupt.bind(claude) } : {}),
  } satisfies Claude;
}
