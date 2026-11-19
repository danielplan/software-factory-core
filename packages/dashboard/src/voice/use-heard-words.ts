import { useSyncExternalStore } from "react";

import type { Shown } from "./live-words";
import type { VoiceCall } from "./voice-call";

// The owner's words while they speak, for the voice's view.
export function useHeardWords(call: VoiceCall): Shown | null {
  return useSyncExternalStore(call.subscribeWords, call.currentWords);
}
