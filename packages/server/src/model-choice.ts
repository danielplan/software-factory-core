// The session's options with every Claude Code run using the model chosen in
// the Settings tab (read from the factory's folder, once there is one).

import { type Claude, withChosenModel } from "@software-factory/core";

export function withModelChoice<T extends { coach: { claude: Claude } }>(
  options: T,
  root: () => string | null,
): T {
  const claude = withChosenModel(options.coach.claude, root);
  return { ...options, coach: { ...options.coach, claude } };
}
