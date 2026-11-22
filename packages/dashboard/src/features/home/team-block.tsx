// A block a team's own extension describes, drawn from its description.

import type { AddOnView, ShownView } from "@/api/client";
import { BlockCard } from "@/components/block-card";
import { BlockParts } from "@/components/screen-view";

export function TeamBlock({
  view,
  addOns,
}: Readonly<{ view: ShownView; addOns: AddOnView[] }>) {
  return (
    <BlockCard id={view.id} addOns={addOns}>
      <BlockParts view={view} />
    </BlockCard>
  );
}
