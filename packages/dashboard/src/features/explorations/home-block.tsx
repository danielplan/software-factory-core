// Explorations' block on Home: the ideas being explored. The app hands it
// to Home (app/home-blocks.tsx).

import type { AddOnView } from "@/api/client";
import { BlockCard, BlockEmpty } from "@/components/block-card";
import { useT } from "@/i18n/use-t";
import type { HomeInput } from "@/lib/home-view";

export function ExploringBlock({
  input,
  addOns,
}: Readonly<{ input: HomeInput; addOns: AddOnView[] }>) {
  const t = useT();
  return (
    <BlockCard id="exploring" addOns={addOns}>
      {input.exploring.length === 0 ? (
        <BlockEmpty line={t.home.blockEmpty.exploring} />
      ) : (
        input.exploring.slice(0, 4).map((row) => (
          <a
            key={row.id}
            href={`#explore/${encodeURIComponent(row.id)}`}
            className="grid gap-0.5 border-t border-line-soft px-4 py-2.5 first:border-t-0 hover:bg-surface"
          >
            <span className="truncate text-[13px]">{row.title}</span>
            {row.line && (
              <span className="truncate text-xs text-muted-foreground">
                {row.line}
              </span>
            )}
          </a>
        ))
      )}
    </BlockCard>
  );
}
