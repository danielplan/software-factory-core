// Sprocket at the bottom of every page, while Kobble is set up and after:
// the "Ask Sprocket anything" bar, floating over the page, which grows into
// Sprocket's window. What the window holds is the support kobold's
// conversation (features/support) or, while Kobble is set up, the setup
// coach's (features/setup).

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { KoboldHead } from "@/components/kobold-face";
import { Face } from "@/components/meet/face";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The bar and the window it grows into: as tall as what it shows, up to a
// maximum, then what it shows scrolls inside.
export function SprocketDock({
  open,
  children,
}: Readonly<{ open: boolean; children: ReactNode }>) {
  const roomy = Math.min(window.innerHeight * 0.8, 620);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center px-4 md:left-56">
      <section
        aria-label="Sprocket"
        className={cn(
          "pointer-events-auto flex max-w-full flex-col overflow-hidden border [interpolate-size:allow-keywords] border-border bg-card/95 backdrop-blur transition-[width,height,border-radius,box-shadow] duration-500 ease-[cubic-bezier(0.2,0.9,0.3,1)]",
          open
            ? "w-[27rem] rounded-2xl bg-card shadow-[0_24px_60px_-20px_rgb(20_24_36/0.35)]"
            : "w-[24rem] rounded-xl shadow-[0_8px_24px_-12px_rgb(20_24_36/0.25)] hover:border-[#d4d4da]",
        )}
        style={{ height: open ? "auto" : 54, maxHeight: roomy }}
      >
        {children}
      </section>
    </div>
  );
}

// The closed window: Sprocket's face, breathing while it works, and one
// line: what it does now, or "Ask Sprocket anything".
export function SprocketBar({
  working,
  line,
  onOpen,
}: Readonly<{ working: boolean; line: string; onOpen: () => void }>) {
  const t = useTranslation().t;
  return (
    <div className="flex h-full w-full flex-none items-center gap-1 pl-2">
      <Face id="support" className="flex-none">
        <KoboldHead size={34} className={cn(working && "animate-breathe")} />
      </Face>
      <button
        type="button"
        onClick={onOpen}
        className="flex h-full min-w-0 flex-1 items-center gap-2.5 pr-2 pl-1 text-left"
      >
        <span className="grid min-w-0 flex-1">
          <span className="truncate text-[13px] font-semibold text-foreground">
            Sprocket{" "}
            <span className="font-normal text-muted-foreground">
              · {t("meet.roles.support")}
            </span>
          </span>
          <span className="truncate text-xs text-muted-foreground">{line}</span>
        </span>
        <kbd className="rounded-md border border-border px-1.5 py-0.5 font-sans text-[11px] text-faint">
          ⌘J
        </kbd>
      </button>
    </div>
  );
}

// The open window's top: Sprocket's face and name, what the window adds
// there (such as Start over), and Close.
export function SprocketHead({
  onClose,
  children,
}: Readonly<{ onClose: () => void; children?: ReactNode }>) {
  const t = useTranslation().t;
  return (
    <header className="flex flex-none items-center gap-2 py-3 pr-2.5 pl-4">
      <Face id="support" className="flex-none">
        <KoboldHead size={30} />
      </Face>
      <span className="grid min-w-0">
        <span className="truncate text-[13px] font-semibold text-foreground">
          Sprocket{" "}
          <span className="font-normal text-muted-foreground">
            · {t("meet.roles.support")}
          </span>
        </span>
      </span>
      <span className="flex-1" />
      {children}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("feedback.close")}
        onClick={onClose}
      >
        <X aria-hidden className="size-4" />
      </Button>
    </header>
  );
}
