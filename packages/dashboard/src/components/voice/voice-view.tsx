import { PhoneOff, RotateCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { CallState } from "@/lib/voice/call";
import { HeardWords } from "./heard-words";
import { LanguageSwitch } from "./language-switch";
import { statusLine } from "@/lib/voice/status-line";
import { useSpokenLanguage } from "@/hooks/voice/use-spoken-language";
import { useVoiceCall } from "@/hooks/voice/use-voice-call";
import type { VoiceCall } from "@/lib/voice/voice-call";
import { VoiceStatus } from "./voice-status";
import { type OrbMode, VoiceOrb } from "./voice-orb";
import { useT } from "@/i18n/use-t";

// During a call, in place of the box to type: the glow that shows what is
// happening (voice-orb.tsx), a line saying it in words (with a thin bar
// while a speech model is on its way), the owner's words while they speak,
// the language spoken, and End call (the microphone and the coach's voice
// turn off; what was said is still answered). After a problem that ended
// the call, it stays to say why, with Try again when a second try may help.
export function VoiceView({
  call,
  coachProblem,
  onEnd,
}: Readonly<{
  call: VoiceCall;
  coachProblem: string | null;
  onEnd: () => void;
}>) {
  const t = useT();
  const state = useVoiceCall(call);
  const mode = modeOf(state);
  const [language, chooseLanguage] = useSpokenLanguage(call);
  const status = statusLine(state, coachProblem, t.voice);
  const ended = state.phase === "off";
  return (
    <div className="grid justify-items-center gap-4 rounded-xl bg-surface px-3 pt-6 pb-3">
      {!ended && <VoiceOrb call={call} mode={mode} />}
      <VoiceStatus status={status} moment={ended ? "" : t.voice.orb[mode]} />
      <HeardWords call={call} />
      {state.quietly && (
        <p className="text-[11px] text-muted-foreground">{t.voice.quietly}</p>
      )}
      <div className="flex w-full flex-wrap items-center gap-2">
        <LanguageSwitch language={language} onChoose={chooseLanguage} />
        {status.retry && (
          <Button
            type="button"
            variant="outline"
            className="ml-auto h-9 rounded-full px-3.5 text-[13px]"
            onClick={() => {
              call.start();
            }}
          >
            <RotateCcw aria-hidden />
            {t.voice.tryAgain}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          className={
            status.retry
              ? "h-9 rounded-full px-3.5 text-[13px]"
              : "ml-auto h-9 rounded-full px-3.5 text-[13px]"
          }
          onClick={onEnd}
        >
          {ended ? <X aria-hidden /> : <PhoneOff aria-hidden />}
          {ended ? t.voice.close : t.voice.endCall}
        </Button>
      </div>
    </div>
  );
}

function modeOf(state: CallState): OrbMode {
  switch (state.phase) {
    case "listening":
      return state.writing ? "writing" : "listening";
    case "thinking":
      return "thinking";
    case "speaking":
      return "speaking";
    default:
      return "preparing";
  }
}
