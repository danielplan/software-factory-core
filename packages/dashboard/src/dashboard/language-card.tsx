// The dashboard's language, in Settings: changing it changes every page at
// once (the whole page is drawn again in it). Kept in this browser.

import { useTranslation } from "react-i18next";

import { keepLanguage, type Language, LANGUAGES } from "@/lib/language-choice";
import { cn } from "@/lib/utils";

import { Topic } from "./settings-card";

export function LanguageCard() {
  const { t, i18n } = useTranslation("settings");
  const choose = (language: Language) => {
    keepLanguage(language);
    void i18n.changeLanguage(language);
  };
  return (
    <Topic title={t("language.title")}>
      <div
        role="radiogroup"
        aria-label={t("language.title")}
        className="flex w-fit flex-wrap gap-1 rounded-[14px] bg-surface-2 p-1"
      >
        {LANGUAGES.map(({ id, name }) => (
          <button
            key={id}
            type="button"
            role="radio"
            lang={id}
            aria-checked={i18n.language === id}
            onClick={() => {
              choose(id);
            }}
            className={cn(
              "inline-flex h-9 items-center rounded-[10px] px-3.5 text-body font-medium text-muted-foreground transition-colors hover:text-foreground",
              i18n.language === id && "bg-card text-foreground shadow-current",
            )}
          >
            {name}
          </button>
        ))}
      </div>
    </Topic>
  );
}
