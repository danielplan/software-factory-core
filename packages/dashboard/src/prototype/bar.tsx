// Prototype mode's bar, floating on the canvas like the rest of Kobble: what
// this is and the idea, the switcher (Main, the product as it runs today,
// then A, B, C…) as tabs, back to Explore and Share, which puts the version
// on Explore for the team to try and choose.

import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

import { messageOf, post, type PrototypePage as Page } from "@/api";
import { Button } from "@/components/ui/button";
import { exploreHash, prototypeHash } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { KoboldMark } from "@/understand/bits";

export function Bar({
  page,
  shown,
  shared,
  onProblem,
}: Readonly<{
  page: Page;
  shown: string | null;
  shared: boolean;
  onProblem: (problem: string | null) => void;
}>) {
  const { t } = useTranslation("explore");
  const share = async () => {
    onProblem(null);
    try {
      await post("/api/prototypes/share", {
        idea: page.idea.id,
        version: shown,
      });
    } catch (error) {
      onProblem(messageOf(error));
    }
  };
  const keys = [null, ...page.versions.map((v) => v.key)];
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[18px] bg-card px-4 py-2.5 shadow-float">
      <span className="flex min-w-0 items-center gap-2.5">
        <KoboldMark />
        <span className="grid min-w-0 gap-0.5 leading-tight">
          <span className="text-tag text-muted-foreground">
            {t("bar.title")}
          </span>
          <span className="truncate text-item">{page.idea.title}</span>
        </span>
      </span>
      <nav
        aria-label={t("bar.switch")}
        className="mx-auto flex gap-1 rounded-[14px] bg-surface-2 p-1"
      >
        {keys.map((key) => (
          <a
            key={key ?? "main"}
            href={prototypeHash(page.idea.id, key ?? undefined)}
            aria-current={key === shown ? "page" : undefined}
            className={cn(
              "rounded-[10px] px-3.5 py-1.5 text-note font-medium text-muted-foreground transition-colors hover:text-foreground",
              key === shown && "bg-card text-foreground shadow-current",
            )}
          >
            {key ?? t("version.main")}
          </a>
        ))}
      </nav>
      <span className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={exploreHash(page.idea.id)}>
            <ArrowLeft aria-hidden />
            {t("bar.back")}
          </a>
        </Button>
        {shown !== null && shared ? (
          <span className="px-2 text-note text-muted-foreground">
            {t("bar.shared")}
          </span>
        ) : (
          <Button
            size="sm"
            disabled={shown === null}
            onClick={() => void share()}
          >
            {t("bar.share")}
          </Button>
        )}
      </span>
    </header>
  );
}
