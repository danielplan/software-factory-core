// A running prototype on the board, at a desktop's size (1280 × 800) shrunk
// to fit its card, so a page for a computer shows its real layout and can
// be used there. Bigger opens it over the board at full size.

import { Maximize2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useT } from "@/i18n/use-t";
import { cn } from "@/lib/utils";

const DESKTOP = { width: 1280, height: 800 };
// The card's inside width (nodes.ts: 520, less its padding and border).
const SHOWN = 492;
const SCALE = SHOWN / DESKTOP.width;

// The screen's size on the card: the same whether the prototype runs, is
// being made or waits, so the card does not jump.
export const SCREEN = {
  width: SHOWN,
  height: Math.round(DESKTOP.height * SCALE),
};

export function LiveScreen({
  url,
  title,
  making = false,
}: Readonly<{ url: string; title: string; making?: boolean }>) {
  const t = useT();
  return (
    <Dialog>
      <div
        className={cn(
          "nodrag nowheel group relative overflow-hidden rounded-[9px] shadow-[0_0_0_1px_var(--line-soft)]",
          // Still being made: usable, with a ring and a note that it changes.
          making && "shadow-[0_0_0_2px_var(--blue)]",
        )}
        style={SCREEN}
      >
        <iframe
          title={t.explore.board.running(title)}
          src={url}
          className="origin-top-left border-0"
          style={{
            width: DESKTOP.width,
            height: DESKTOP.height,
            transform: `scale(${String(SCALE)})`,
          }}
        />
        <DialogTrigger asChild>
          <button
            type="button"
            className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-xs font-medium shadow-card transition-opacity group-hover:opacity-100 focus-visible:opacity-100 md:opacity-0"
          >
            <Maximize2 aria-hidden className="size-3" /> {t.explore.bigger}
          </button>
        </DialogTrigger>
      </div>
      <DialogContent className="h-[90dvh] w-[94vw] max-w-[94vw] grid-rows-[auto_1fr] gap-2 p-3 sm:max-w-[94vw]">
        <DialogTitle className="flex items-center gap-3 pr-8 text-[13px]">
          {title}
          {making && (
            <span className="text-xs font-normal text-blue">
              {t.explore.board.stillMade}
            </span>
          )}
        </DialogTitle>
        <iframe
          title={title}
          src={url}
          className="size-full rounded-lg border-0"
        />
      </DialogContent>
    </Dialog>
  );
}
