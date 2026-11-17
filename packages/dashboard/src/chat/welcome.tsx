// The empty chat, as when you open a chatbot: the kobold drawn with volume
// (components/kobold-character.tsx), dropping in with a bounce when the page
// opens, then at rest (it breathes and blinks); what you can do here, above
// the big field in the middle of the page. With reduced motion it is still.

import { useTranslation } from "react-i18next";

import { KoboldCharacter } from "@/components/kobold-character";

export function Welcome() {
  const { t } = useTranslation("chat");
  return (
    <div className="mx-auto grid w-full max-w-2xl justify-items-center gap-5 text-center">
      <KoboldCharacter
        size={132}
        arrive
        mood="idle"
        label={t("welcome.kobold")}
      />
      <div className="grid gap-1">
        <h1 className="text-title">{t("welcome.title")}</h1>
        <p className="text-body text-muted-foreground">{t("welcome.about")}</p>
      </div>
    </div>
  );
}
