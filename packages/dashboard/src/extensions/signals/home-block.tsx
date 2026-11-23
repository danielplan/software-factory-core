// Signals' block on Home: what the live app reported. The app hands it to
// Home (app/home-blocks.tsx).

import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import type { AddOnView } from "@/api/client";
import { BlockCard, BlockEmpty } from "@/components/block-card";
import { Markdown } from "@/components/markdown";

import type { HomeInput } from "@/lib/home-view";

export function SignalsBlock({
  input,
  addOns,
}: Readonly<{ input: HomeInput; addOns: AddOnView[] }>) {
  const t = useTranslation().t;
  return (
    <BlockCard id="signals" addOns={addOns}>
      {input.signals.length === 0 ? (
        <BlockEmpty line={t("home.blockEmpty.signals")} />
      ) : (
        input.signals.slice(0, 3).map((signal) => (
          <Link
            key={signal.text}
            to="/signals"
            className="block truncate border-t border-line-soft px-4 py-2.5 text-[13px] first:border-t-0 hover:bg-surface"
          >
            <Markdown text={signal.text} inline />
          </Link>
        ))
      )}
    </BlockCard>
  );
}
