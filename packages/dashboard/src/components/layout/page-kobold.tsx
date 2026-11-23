// The kobold who works on a page (lib/kobolds.ts), on the page's row in
// the sidebar: quiet while idle, breathing with a dot while it works. Its
// name and what it does now (or its job) show on hover.

import { useTranslation } from "react-i18next";

import { KoboldHead } from "@/components/kobold-face";
import { KOBOLDS, type TeamId } from "@/lib/kobolds";
import type { Page } from "@/lib/routes";

import { cn } from "@/lib/utils";

export type Doing = Partial<Record<TeamId, string>>;

export function PageKobold({
  page,
  doing,
}: Readonly<{ page: Page; doing: Doing }>) {
  const t = useTranslation().t;
  const here = KOBOLDS.filter((kobold) => kobold.page === page);
  const kobold = here.find((one) => doing[one.id]) ?? here[0];
  if (!kobold) return null;
  const now = doing[kobold.id];
  const job = now ?? t(`shell.jobs.${kobold.id}`);
  return (
    <span
      title={`${kobold.name}: ${job}`}
      className={cn(
        "relative flex-none transition-opacity",
        now ? "opacity-100" : "opacity-70 group-hover:opacity-100",
      )}
    >
      <KoboldHead
        size={20}
        hat={kobold.hat}
        color={kobold.color}
        className={cn(now && "animate-breathe")}
      />
      {now && (
        <span className="absolute -top-0.5 -right-0.5 size-[7px] rounded-full bg-success ring-2 ring-sidebar" />
      )}
      <span className="sr-only">
        {now
          ? t("shell.kobold.working", { name: kobold.name, now })
          : kobold.name}
      </span>
    </span>
  );
}
