// Add a block to Home: the installed extensions that offer blocks at the
// left, the blocks of the one picked at the right, each with a small preview
// of how it looks and a button to add it (or "On Home" when it is).

import { Check, Plus } from "lucide-react";
import { useState } from "react";

import type { AddOnView } from "@/api";
import { IconTile } from "@/add-ons/looks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/i18n/use-t";
import type { Layout } from "@/lib/home-layout";
import { blockAbout, blockName } from "@/lib/screens";
import { nameOf } from "@/lib/market-view";

import { BlockPreview } from "./block-preview";

export const smallButton =
  "inline-flex h-7 items-center gap-1 rounded-lg border border-border px-2.5 text-xs hover:bg-hover";

export function AddBlock({
  layout,
  addOns,
  offeredBy,
  open,
  onOpenChange,
  onPick,
}: Readonly<{
  layout: Layout;
  addOns: AddOnView[];
  // The installed extensions that offer blocks, with the ones Home can show.
  offeredBy: { addOn: AddOnView; blocks: string[] }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Add: the dialog closes and the block is placed by hand.
  onPick: (id: string, x: number, y: number) => void;
}>) {
  const t = useT();
  const [chosen, setChosen] = useState("");
  const first = offeredBy[0]?.addOn.id ?? "";
  const picked = offeredBy.some(({ addOn }) => addOn.id === chosen)
    ? chosen
    : first;
  const mine = offeredBy.find(({ addOn }) => addOn.id === picked)?.blocks ?? [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[85vh] gap-0 overflow-hidden p-0 sm:max-w-[760px]">
        <DialogTitle className="px-5 pt-4 pb-3 text-[15px] font-semibold">
          {t.home.arrange.addTitle}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t.home.arrange.offering}
        </DialogDescription>
        {offeredBy.length === 0 ? (
          <p className="border-t border-border-soft px-5 py-10 text-center text-[13px] text-muted-foreground">
            {t.home.arrange.nothingOffered}
          </p>
        ) : (
          <div className="grid min-h-[360px] grid-cols-[210px_minmax(0,1fr)] border-t border-border-soft">
            <nav
              aria-label={t.home.arrange.offering}
              className="grid content-start gap-0.5 border-r border-border-soft p-2"
            >
              {offeredBy.map(({ addOn }) => (
                <button
                  key={addOn.id}
                  type="button"
                  aria-current={addOn.id === picked ? "true" : undefined}
                  onClick={() => {
                    setChosen(addOn.id);
                  }}
                  className={
                    "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-hover " +
                    (addOn.id === picked ? "bg-hover font-medium" : "")
                  }
                >
                  <IconTile id={addOn.id} />
                  <span className="min-w-0 truncate">
                    {nameOf(t.market, addOn)}
                  </span>
                </button>
              ))}
            </nav>
            <div className="grid max-h-[60vh] content-start gap-3 overflow-y-auto p-4">
              {mine.map((id) => (
                <BlockOffer
                  key={id}
                  id={id}
                  addOns={addOns}
                  on={!layout.hidden.includes(id)}
                  onPick={onPick}
                />
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BlockOffer({
  id,
  addOns,
  on,
  onPick,
}: Readonly<{
  id: string;
  addOns: AddOnView[];
  on: boolean;
  onPick: (id: string, x: number, y: number) => void;
}>) {
  const t = useT();
  const name = blockName(t.market.blocks, addOns, id);
  return (
    <div className="grid gap-2.5 rounded-xl border border-border p-3">
      <div className="flex items-start gap-3">
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium">{name}</span>
          <span className="block text-xs text-muted-foreground">
            {blockAbout(t.home.blockAbout, addOns, id)}
          </span>
        </span>
        {on ? (
          <span className="inline-flex h-7 items-center gap-1 text-xs text-muted-foreground">
            <Check aria-hidden className="size-3" />
            {t.home.arrange.onHome}
          </span>
        ) : (
          <button
            type="button"
            className={smallButton}
            onClick={(e) => {
              onPick(id, e.clientX, e.clientY);
            }}
          >
            <Plus aria-hidden className="size-3" />
            {t.home.arrange.addOne}
          </button>
        )}
      </div>
      <div
        role="img"
        aria-label={t.home.arrange.preview(name)}
        className="rounded-lg bg-surface p-2.5"
      >
        <BlockPreview id={id} />
      </div>
    </div>
  );
}
