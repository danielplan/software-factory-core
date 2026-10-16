import { useSyncExternalStore } from "react";

import type { VoiceCall } from "./voice-call";

// How loud the microphone hears the owner, for the voice bar.
export function useVoiceLevel(call: VoiceCall): number {
  return useSyncExternalStore(call.subscribeLevel, call.currentLevel);
}
