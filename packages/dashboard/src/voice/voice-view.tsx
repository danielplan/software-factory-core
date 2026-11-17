import { PhoneOff } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

import type { CallState } from "./call";
import { LanguageSwitch } from "./language-switch";
import { statusLine } from "./status-line";
import { useSpokenLanguage } from "./use-spoken-language";
import { useVoiceCall } from "./use-voice-call";
import type { VoiceCall } from "./voice-call";
import { MOMENT, type OrbMode, VoiceOrb } from "./voice-orb";

// During a call, in place of the box to type: the glow that shows what is
// happening (voice-orb.tsx), a line saying it in words, the language
// spoken, and End call (the microphone and the coach's voice turn off;
// what was said is still answered).
export function VoiceView({
  call,
  coachProblem,
  onEnd,
}: Readonly<{
  call: VoiceCall;
  coachProblem: string | null;
  onEnd: () => void;
}>) {
  const { t } = useTranslation("setup");
  const state = useVoiceCall(call);
  const mode = modeOf(state);
  const [language, chooseLanguage] = useSpokenLanguage(call);
  const status = statusLine(state, coachProblem);
  return (
    <div className="grid justify-items-center gap-4 rounded-[18px] bg-surface px-3 pt-6 pb-3">
      <VoiceOrb call={call} mode={mode} />
      <p
        role="status"
        className={
          status.problem
            ? "text-center text-note text-destructive"
            : "text-tag font-medium text-muted-foreground"
        }
      >
        {status.text || t(MOMENT[mode])}
      </p>
      <div className="flex w-full flex-wrap items-center gap-2">
        <LanguageSwitch language={language} onChoose={chooseLanguage} />
        <Button
          type="button"
          variant="outline"
          className="ml-auto h-9 rounded-full px-3.5 text-note"
          onClick={onEnd}
        >
          <PhoneOff aria-hidden />
          {t("voice.end")}
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
