// The language the dashboard shows, for every component under it: the
// owner's choice for this computer (GET /api/language, kept in the factory's
// personal settings), or the browser's. The server is told the language
// shown, so the kobolds answer in it. useT() gives the words in it;
// useLocale() the language, for dates and numbers (format.ts).

import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { get, post } from "@/api/client";

import {
  chosenLocale,
  isChoice,
  type LanguageChoice,
  type Locale,
} from "./locale";
import { type Messages, messagesIn } from "./messages";

type Language = {
  locale: Locale;
  choice: LanguageChoice;
  choose: (choice: LanguageChoice) => Promise<void>;
};

const LanguageContext = createContext<Language>({
  locale: "en",
  choice: "browser",
  choose: () => Promise.resolve(),
});

export function LanguageProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [choice, setChoice] = useState<LanguageChoice>("browser");
  useEffect(() => {
    get<{ choice: unknown }>("/api/language").then(
      ({ choice: saved }) => {
        if (isChoice(saved)) setChoice(saved);
      },
      () => undefined,
    );
  }, []);
  const locale = chosenLocale(choice, navigator.languages);
  useEffect(() => {
    document.documentElement.lang = locale;
    post("/api/language", { spoken: locale }).catch(() => undefined);
  }, [locale]);
  const choose = useCallback(async (next: LanguageChoice) => {
    setChoice(next);
    await post("/api/language", { choice: next });
  }, []);
  const value = useMemo(
    () => ({ locale, choice, choose }),
    [locale, choice, choose],
  );
  return <LanguageContext value={value}>{children}</LanguageContext>;
}

export function useLanguage(): Language {
  return use(LanguageContext);
}

export function useLocale(): Locale {
  return use(LanguageContext).locale;
}

export function useT(): Messages {
  return messagesIn(use(LanguageContext).locale);
}
