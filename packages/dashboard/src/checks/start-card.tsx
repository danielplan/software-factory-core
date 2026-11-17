// The check-up's two moments before results: the start, a card that says
// in one line what the kobold does, one button (and one per product when
// there are several), and a small note: how long, nothing changed, here;
// and while it runs, the kobold at work on a product, what it looks at,
// how much it found so far, and Stop.

import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { KoboldCharacter } from "@/components/kobold-character";

import type { CheckView } from "./view";

export function StartCard({
  products,
  onStart,
}: Readonly<{
  products: { id: string; name: string }[];
  onStart: (product?: string) => void;
}>) {
  const { t } = useTranslation("checks");
  return (
    <section
      aria-label={t("start.title")}
      className="grid animate-enter justify-items-center gap-4 rounded-[18px] bg-card px-5 py-8 text-center shadow-soft"
    >
      <KoboldCharacter size={112} mood="idle" arrive />
      <div className="grid gap-1">
        <h2 className="text-section">{t("start.title")}</h2>
        <p className="max-w-md text-body text-muted-foreground">
          {t("start.lead")}
        </p>
      </div>
      <Button
        size="lg"
        onClick={() => {
          onStart();
        }}
      >
        <Sparkles aria-hidden />
        {t("start.button")}
      </Button>
      <p className="text-note text-muted-foreground">
        {[t("start.time"), t("start.safe"), t("start.local")].join(" · ")}
      </p>
      {products.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2">
          {products.map((one) => (
            <Button
              key={one.id}
              size="sm"
              variant="outline"
              onClick={() => {
                onStart(one.id);
              }}
            >
              {t("start.one", { name: one.name })}
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}

export function RunningCard({
  check,
  name,
  onStop,
}: Readonly<{ check: CheckView; name: string; onStop: () => void }>) {
  const { t } = useTranslation("checks");
  return (
    <section
      aria-label={t("running.title", { name })}
      className="flex animate-enter flex-wrap items-center gap-4 rounded-[18px] bg-tint px-5 py-4"
    >
      <KoboldCharacter size={64} mood="running" className="flex-none" />
      <div role="status" className="grid min-w-0 flex-1 gap-0.5">
        <b className="text-item">{t("running.title", { name })}</b>
        <span className="truncate text-note text-muted-foreground motion-safe:animate-breathe">
          {check.activity ?? t("running.looking")}
        </span>
        <span className="text-note text-muted-foreground">
          {t("running.found", { count: check.findings.length })}
        </span>
      </div>
      <Button variant="outline" onClick={onStop}>
        {t("running.stop")}
      </Button>
    </section>
  );
}
