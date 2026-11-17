// Light or dark, in Settings: as the computer is set, or always one of
// them. Kept in this browser only; another browser or computer has its own.

import { Monitor, Moon, Sun } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  applyChoice,
  keepChoice,
  storedChoice,
  type ThemeChoice,
} from "@/lib/theme-choice";
import { cn } from "@/lib/utils";

import { Topic } from "./settings-card";

const CHOICES: { choice: ThemeChoice; icon: ReactNode }[] = [
  { choice: "system", icon: <Monitor aria-hidden /> },
  { choice: "light", icon: <Sun aria-hidden /> },
  { choice: "dark", icon: <Moon aria-hidden /> },
];

export function LookCard() {
  const { t } = useTranslation("settings");
  const [chosen, setChosen] = useState(() => storedChoice(() => localStorage));
  const [kept, setKept] = useState(true);
  const choose = (choice: ThemeChoice) => {
    setChosen(choice);
    setKept(keepChoice(() => localStorage, choice));
    applyChoice(document.styleSheets, choice);
  };
  return (
    <Topic title={t("look.title")}>
      <div
        role="radiogroup"
        aria-label={t("look.title")}
        className="flex w-fit gap-1 rounded-[14px] bg-surface-2 p-1"
      >
        {CHOICES.map(({ choice, icon }) => (
          <button
            key={choice}
            type="button"
            role="radio"
            aria-checked={chosen === choice}
            onClick={() => {
              choose(choice);
            }}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-[10px] px-3.5 text-body font-medium text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-4",
              chosen === choice && "bg-card text-foreground shadow-current",
            )}
          >
            {icon}
            {t(`look.${choice}`)}
          </button>
        ))}
      </div>
      {!kept && (
        <p className="text-body text-muted-foreground">{t("look.notKept")}</p>
      )}
    </Topic>
  );
}
