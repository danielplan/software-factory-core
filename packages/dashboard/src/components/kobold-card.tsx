// The bottom of the sidebar: the kobold, a press away from the chat, with a
// dot for whether it is working; and the red "Something needs you" used in
// the phone's top bar.

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { KoboldStatus } from "@/lib/shell-view";
import { cn } from "@/lib/utils";
import { KoboldMark } from "@/understand/bits";

// One row: the kobold, with a dot for whether it is working, and "Your
// kobold", a press away from the chat (what it is doing is in the tooltip
// and for screen readers); beside it, small links (Product, Settings).
export function KoboldCard({
  kobold,
  here,
  onGo,
  children,
}: Readonly<{
  kobold: KoboldStatus;
  here: boolean;
  onGo?: () => void;
  children?: ReactNode;
}>) {
  const { t } = useTranslation();
  const status = kobold.busy ? kobold.detail : t("status.idle");
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-xl bg-card py-1.5 pr-1.5 pl-2 shadow-panel transition-shadow",
        here && "ring-2 ring-primary/40",
      )}
    >
      <a
        href="#chat"
        onClick={onGo}
        title={status}
        aria-current={here ? "page" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="relative flex-none">
          <KoboldMark
            className={cn(
              "size-7",
              kobold.busy ? "animate-breathe" : "opacity-70 grayscale",
            )}
          />
          <span
            aria-hidden
            className={cn(
              "absolute right-0 bottom-0 size-2 rounded-full ring-2 ring-card",
              kobold.busy ? "bg-success" : "bg-faint",
            )}
          />
        </span>
        <span className="truncate text-item">{t("nav.kobold")}</span>
        <span role="status" className="sr-only">
          {t("nav.chatWithKobold")}: {status}
        </span>
      </a>
      {children}
    </div>
  );
}

// "Something needs you", with a red dot, leading to Product, where what
// could not start says why.
export function Trouble({
  short = false,
  onGo,
}: Readonly<{ short?: boolean; onGo?: () => void }>) {
  const { t } = useTranslation();
  return (
    <a
      href="#products"
      onClick={onGo}
      className="flex items-center gap-2 rounded-md text-note font-medium text-destructive transition-colors outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        aria-hidden
        className="size-2 flex-none rounded-full bg-destructive"
      />
      <span className={cn(short && "max-sm:sr-only")}>
        {t("status.needsYou")}
      </span>
    </a>
  );
}
