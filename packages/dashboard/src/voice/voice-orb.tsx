import { cn } from "@/lib/utils";

import { useVoiceLevel } from "./use-voice-level";
import type { VoiceCall } from "./voice-call";

export type OrbMode =
  "preparing" | "listening" | "writing" | "thinking" | "speaking";

// How the glow moves in each moment of a call, so the owner sees what is
// happening without reading: getting ready it fades in and out; listening it
// swells with their voice; writing down their words, rings ripple out;
// thinking, its light turns; speaking, it pulses.
const MOTION: Record<OrbMode, string> = {
  preparing: "animate-orb-wait",
  listening: "",
  writing: "animate-orb-ripple",
  thinking: "",
  speaking: "animate-orb-talk",
};

// Each moment's short label, under the orb.
export const MOMENT: Record<OrbMode, string> = {
  preparing: "Getting ready…",
  listening: "Listening",
  writing: "Writing it down…",
  thinking: "Thinking…",
  speaking: "Speaking",
};

// The voice, as the coach's orb (the same as in the chat), moving with the
// moment. Its meter says how loud the microphone hears the owner (zero
// unless listening).
export function VoiceOrb({
  call,
  mode,
}: Readonly<{ call: VoiceCall; mode: OrbMode }>) {
  const level = useVoiceLevel(call);
  const percent = mode === "listening" ? Math.round(level * 100) : 0;
  return (
    <div
      role="meter"
      aria-label="Your voice"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      data-mode={mode}
      className={cn(
        "relative size-20 rounded-full motion-reduce:animate-none",
        MOTION[mode],
      )}
      style={
        mode === "listening"
          ? {
              transform: `scale(${String(1 + percent / 110)})`,
              transition: "transform 90ms ease-out",
            }
          : {}
      }
    >
      <div
        className={cn(
          "orb absolute inset-0",
          mode === "thinking" && "animate-swirl motion-reduce:animate-none",
        )}
      />
    </div>
  );
}
