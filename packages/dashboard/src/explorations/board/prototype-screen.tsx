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

const DESKTOP = { width: 1280, height: 800 };
// The card's inside width (nodes.ts: 520, less its padding and border).
const SHOWN = 492;
const SCALE = SHOWN / DESKTOP.width;

export function LiveScreen({
  url,
  title,
}: Readonly<{ url: string; title: string }>) {
  return (
    <Dialog>
      <div
        className="nodrag nowheel group relative overflow-hidden rounded-[9px] shadow-[0_0_0_1px_var(--line-soft)]"
        style={{ width: SHOWN, height: Math.round(DESKTOP.height * SCALE) }}
      >
        <iframe
          title={`${title}, running`}
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
            <Maximize2 aria-hidden className="size-3" /> Bigger
          </button>
        </DialogTrigger>
      </div>
      <DialogContent className="h-[90dvh] w-[94vw] max-w-[94vw] grid-rows-[auto_1fr] gap-2 p-3 sm:max-w-[94vw]">
        <DialogTitle className="pr-8 text-sm">{title}</DialogTitle>
        <iframe
          title={title}
          src={url}
          className="size-full rounded-lg border-0"
        />
      </DialogContent>
    </Dialog>
  );
}
