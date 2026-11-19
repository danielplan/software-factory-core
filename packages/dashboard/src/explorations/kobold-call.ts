// The voice call with the kobold in an exploration: one for the page,
// sending what the person says (with the things they attached from the
// board) and reading the kobold's answers out loud. It ends when the page
// goes.

import { useEffect, useState } from "react";

import { type ExplorationPage, post } from "@/api";
import { LANGUAGES } from "@/voice/languages";
import { useCoachVoice } from "@/voice/use-coach-voice";
import { VoiceCall } from "@/voice/voice-call";

export function useKoboldCall(
  page: ExplorationPage,
  attached: string[],
  onSent: () => void,
): VoiceCall {
  const [call] = useState(() => new VoiceCall());
  const { id } = page.exploration;
  useEffect(() => {
    call.sendTo(async (text, language) => {
      onSent();
      await post("/api/kobble/explorations/say", {
        id,
        text,
        attached,
        spokenIn: LANGUAGES[language].name,
      });
    });
  });
  useEffect(
    () => () => {
      call.end();
    },
    [call],
  );
  useCoachVoice(call, {
    ...page.talk,
    working: page.talk.writing !== null,
  });
  return call;
}
