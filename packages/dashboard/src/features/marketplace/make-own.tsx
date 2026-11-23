// The way to an extension of the team's own, at the end of the Extensions
// tab: what it takes in one line, and a button that opens Sprocket with the
// request started. A team asks for one only through Sprocket, which hands it
// to Doodle as an exploration; the builder writes it in the factory's own
// folder, and the team reviews it before it is used.

import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { askSupport } from "@/lib/ask-support";

export function MakeOwn() {
  const t = useTranslation().t;
  return (
    <section
      aria-label={t("market.makeOwn.title")}
      className="flex flex-wrap items-center gap-4 rounded-xl bg-[color-mix(in_srgb,#8b8ff0_9%,transparent)] px-5 py-4"
    >
      <span className="grid size-9 flex-none place-items-center rounded-full bg-card">
        <Sparkles aria-hidden className="size-4 text-[#5b5fd6]" />
      </span>
      <div className="min-w-[220px] flex-1">
        <h2 className="text-[15px] font-semibold">
          {t("market.makeOwn.title")}
        </h2>
        <p className="text-[13px] text-muted-foreground">
          {t("market.makeOwn.text")}
        </p>
      </div>
      <Button
        size="pill"
        onClick={() => {
          askSupport(t("market.makeOwn.ask"));
        }}
      >
        {t("market.makeOwn.button")}
      </Button>
    </section>
  );
}
