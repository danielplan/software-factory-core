import { use, useEffect, useState } from "react";

import { type CoachView, post } from "@/api";
import { LANGUAGES } from "@/voice/languages";
import { useCoachVoice } from "@/voice/use-coach-voice";
import { VoiceCall } from "@/voice/voice-call";

import { attachedNames } from "./canvas";
import { aboutLine } from "./coach-chat";
import { CoachRouteContext } from "./route";

// The voice call with a coach: one for the page, sending what the owner
// says (with the cards they picked) and reading the coach's answers out
// loud. It ends when the page goes.
export function useCoachCall(
  coach: CoachView,
  attached: string[],
  onSent: () => void,
): VoiceCall {
  const route = use(CoachRouteContext);
  const [call] = useState(() => new VoiceCall());
  const about = aboutLine(attachedNames(coach.draft, attached));
  useEffect(() => {
    call.sendTo(async (text, language) => {
      onSent();
      await post(route.say, {
        ...route.with,
        text: text + about,
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
  useCoachVoice(call, coach);
  return call;
}
