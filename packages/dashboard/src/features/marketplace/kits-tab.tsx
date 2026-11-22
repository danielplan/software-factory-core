// The Marketplace's third tab: the product kits. All of them are
// pre-installed, so none has Install or Remove; each shows the products that
// use it.

import type { KitView, ProductView } from "@/api/client";
import { useT } from "@/i18n/use-t";
import { kitThing } from "@/lib/market-view";

import { Card } from "./card";

export function KitsTab({
  kits,
  products,
  onOpen,
}: Readonly<{
  kits: KitView[];
  products: ProductView[];
  onOpen: (key: string) => void;
}>) {
  const t = useT().market;
  return (
    <section aria-label={t.tabs.kits} className="grid gap-4">
      <p className="px-1 text-[13px] text-muted-foreground">{t.kits.about}</p>
      <div className="m-stagger grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kits.map((kit) => {
          const thing = kitThing(t, kit, products);
          return (
            <Card
              key={thing.key}
              thing={thing}
              action={null}
              onOpen={() => {
                onOpen(thing.key);
              }}
            />
          );
        })}
      </div>
    </section>
  );
}
