// The model Claude Code uses, chosen in the factory's Settings tab instead of
// in Claude Code's own settings files. Left empty, Claude Code picks its own.

import { readSettings } from "../parts/addresses.ts";
import type { SettingGroup } from "../settings/setting-groups.ts";
import type { Claude, RunOptions } from "./claude.ts";

export const MODEL_KEY = "FACTORY_CLAUDE_MODEL";

export const modelSettings: SettingGroup = {
  id: "ai-model",
  name: "AI model",
  about: "Which model the factory's own Claude Code runs use.",
  file: "settings/factory.env",
  usedBy: [],
  fields: [
    {
      key: MODEL_KEY,
      label: "Claude model",
      help: "A name such as opus or sonnet, or a full model id. Empty means the account's default. Only the factory's Claude Code runs use it, not Codex.",
      kind: "text",
      pattern: "^[\\w.\\[\\]-]+$",
    },
  ],
};

// Claude Code that adds the chosen model to every run that names none. The
// setting is read again on each run, so a change applies to the next turn.
export function withChosenModel(claude: Claude, root: () => string | null) {
  return {
    run(options: RunOptions) {
      const folder = root();
      const model = folder
        ? readSettings(folder, modelSettings.file)[MODEL_KEY]
        : undefined;
      return claude.run(
        options.model || !model ? options : { ...options, model },
      );
    },
  } satisfies Claude;
}
