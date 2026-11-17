import { useEffect, useState } from "react";

import { i18next } from "@/i18n/i18n";

import { browserLanguage, isLanguage, type Language } from "./languages";
import type { VoiceCall } from "./voice-call";

// The language the owner speaks, chosen beside Talk: the dashboard's
// language at first (English when the voice does not know it), then
// whatever was chosen last in this browser. The call hears and answers in
// it.
const KEPT = "software-factory.language";

function kept(): Language {
  try {
    const chosen = localStorage.getItem(KEPT);
    if (chosen && isLanguage(chosen)) return chosen;
  } catch {
    // Not kept in this browser: the dashboard's language, below.
  }
  return browserLanguage(i18next.language);
}

export function useSpokenLanguage(
  call: VoiceCall,
): [Language, (language: Language) => void] {
  const [language, setLanguage] = useState(kept);
  useEffect(() => {
    call.hearIn(language);
  }, [call, language]);
  function choose(next: Language) {
    setLanguage(next);
    try {
      localStorage.setItem(KEPT, next);
    } catch {
      // Not kept: the choice still works on this page.
    }
  }
  return [language, choose];
}
