import { useHeardWords } from "./use-heard-words";
import type { VoiceCall } from "./voice-call";

// The owner's words while they speak, under the glow: the words already
// settled in normal text, the last ones still being heard in grey. Gone
// once the sentence is written down and sent.
export function HeardWords({ call }: Readonly<{ call: VoiceCall }>) {
  const words = useHeardWords(call);
  if (!words) return null;
  return (
    <p
      aria-label="Being heard"
      className="max-w-full text-center text-[13.5px] whitespace-pre-wrap"
    >
      {words.settled}
      {words.grey && (
        <em className="text-muted-foreground not-italic">
          {words.settled ? " " : ""}
          {words.grey}
        </em>
      )}
    </p>
  );
}
