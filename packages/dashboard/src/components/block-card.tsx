// A block on Home, as an extension brings it: its name and the extension it
// comes from, over a card; and the line a block shows when it has nothing.

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { AddOnView } from "@/api/client";
import { Card } from "@/components/ui/card";

import { ownersOf } from "@/lib/home-layout";
import { nameOf } from "@/lib/market-view";
import { blockName } from "@/lib/screens";

// A block an extension brings: its name and where it comes from, over a card.
export function BlockCard({
  id,
  addOns,
  children,
}: Readonly<{ id: string; addOns: AddOnView[]; children: ReactNode }>) {
  const t = useTranslation().t;
  const owner = ownersOf(addOns).get(id);
  return (
    <div className="grid gap-1.5">
      <span
        data-block-title
        className="flex items-center gap-2 text-[13px] font-medium"
      >
        {blockName(t("market.blocks", { returnObjects: true }), addOns, id)}
        {owner && (
          <span className="text-xs font-normal text-muted-foreground">
            {nameOf(t, owner)}
          </span>
        )}
      </span>
      <Card className="gap-0 py-0 shadow-soft">{children}</Card>
    </div>
  );
}

export function BlockEmpty({ line }: Readonly<{ line: string }>) {
  return (
    <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
      {line}
    </p>
  );
}
