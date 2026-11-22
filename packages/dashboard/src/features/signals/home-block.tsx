// Signals' block on Home: what the live app reported. The app hands it to
// Home (app/home-blocks.tsx).

import type { AddOnView } from "@/api/client";
import { BlockCard, BlockEmpty } from "@/components/block-card";
import { useT } from "@/i18n/use-t";
import type { HomeInput } from "@/lib/home-view";

export function SignalsBlock({
  input,
  addOns,
}: Readonly<{ input: HomeInput; addOns: AddOnView[] }>) {
  const t = useT();
  return (
    <BlockCard id="signals" addOns={addOns}>
      {input.signals.length === 0 ? (
        <BlockEmpty line={t.home.blockEmpty.signals} />
      ) : (
        input.signals.slice(0, 3).map((signal) => (
          <a
            key={signal.text}
            href="#signals"
            className="block truncate border-t border-line-soft px-4 py-2.5 text-[13px] first:border-t-0 hover:bg-surface"
          >
            {signal.text}
          </a>
        ))
      )}
    </BlockCard>
  );
}
