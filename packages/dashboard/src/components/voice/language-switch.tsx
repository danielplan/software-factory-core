import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import {
  LANGUAGE_CODES,
  LANGUAGES,
  type Language,
} from "@/lib/voice/languages";

// The language the owner speaks, beside End call: the speech model writes
// their words down in it instead of guessing, and the coach answers in it.
export function LanguageSwitch({
  language,
  onChoose,
}: Readonly<{ language: Language; onChoose: (language: Language) => void }>) {
  const t = useTranslation().t;
  return (
    <div
      role="radiogroup"
      aria-label={t("voice.youSpeak")}
      className="inline-flex shrink-0 rounded-full bg-surface-2 p-0.5 text-xs"
    >
      {LANGUAGE_CODES.map((code) => {
        const chosen = code === language;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={chosen}
            aria-label={LANGUAGES[code].name}
            title={LANGUAGES[code].name}
            className={cn(
              "min-h-7 rounded-full px-2 uppercase transition-colors",
              chosen
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => {
              onChoose(code);
            }}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
