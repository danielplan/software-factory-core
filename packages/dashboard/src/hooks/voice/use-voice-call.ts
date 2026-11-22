import { useSyncExternalStore } from "react";

import type { CallState } from "@/lib/voice/call";
import type { VoiceCall } from "@/lib/voice/voice-call";

// The call's state, for the coach's screen.
export function useVoiceCall(call: VoiceCall): CallState {
  return useSyncExternalStore(call.subscribe, call.current);
}
