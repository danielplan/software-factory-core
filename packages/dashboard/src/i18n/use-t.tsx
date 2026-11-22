// The language the dashboard shows, for every component under it: the
// owner's choice for this computer (GET /api/language, kept in the factory's
// personal settings), or the browser's. i18next shows the words in it
// (react-i18next's useTranslation); the server is told the language shown,
// so the kobolds answer in it. useLocale() gives the language, for dates
// and numbers (format.ts).

import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { I18nextProvider } from "react-i18next";

import { post } from "@/api/client";
import { getChecked } from "@/api/query";
import { languageAnswerSchema } from "@/api/schemas/language";

import { chosenLocale, type LanguageChoice, type Locale } from "./locale";
import { i18n } from "./messages";

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
    getChecked("/api/language", languageAnswerSchema).then(
      ({ choice: saved }) => {
        setChoice(saved);
      },
      () => undefined,
    );
  }, []);
  const locale = chosenLocale(choice, navigator.languages);
  // Before the screen is painted, so it never shows in another language.
  useLayoutEffect(() => {
    void i18n.changeLanguage(locale);
  }, [locale]);
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
  return (
    <I18nextProvider i18n={i18n}>
      <LanguageContext value={value}>{children}</LanguageContext>
    </I18nextProvider>
  );
}

export function useLanguage(): Language {
  return use(LanguageContext);
}

export function useLocale(): Locale {
  return use(LanguageContext).locale;
}
