// Settings › Language: the language Kobble speaks on this computer, as
// tiles in each language's own words, and the browser's.

import { Check } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { messageOf } from "@/api/client";
import { chosenLocale, CHOICES, OWN_NAME } from "@/i18n/locale";
import { useLanguage } from "@/i18n/use-t";
import { cn } from "@/lib/utils";

import { Topic } from "@/components/settings-card";

export function LanguageCard() {
  const t = useTranslation().t;
  const { choice, choose } = useLanguage();
  const [problem, setProblem] = useState<string | null>(null);
  const browser = OWN_NAME[chosenLocale("browser", navigator.languages)];
  return (
    <Topic
      title={t("settings.sections.language")}
      about={t("settings.language.about")}
    >
      <div className="flex flex-wrap gap-2">
        {CHOICES.map((one) => {
          const picked = one === choice;
          return (
            <button
              key={one}
              type="button"
              aria-pressed={picked}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[13px]",
                picked
                  ? "border-foreground bg-card font-medium"
                  : "border-border text-foreground-2 hover:bg-hover",
              )}
              onClick={() => {
                setProblem(null);
                choose(one).catch((error: unknown) => {
                  setProblem(messageOf(error));
                });
              }}
            >
              {picked && <Check aria-hidden className="size-3.5" />}
              {one === "browser"
                ? t("settings.language.browser", { name: browser })
                : OWN_NAME[one]}
            </button>
          );
        })}
      </div>
      {problem && (
        <p role="alert" className="text-[13px] text-destructive">
          {problem}
        </p>
      )}
    </Topic>
  );
}
