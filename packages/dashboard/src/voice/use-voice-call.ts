import { useSyncExternalStore } from "react";

import type { CallState } from "./call";
import type { VoiceCall } from "./voice-call";

// The call's state, for the coach's screen.
export function useVoiceCall(call: VoiceCall): CallState {
  return useSyncExternalStore(call.subscribe, call.current);
}
