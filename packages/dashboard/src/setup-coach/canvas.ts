// The setup map's cards by name, for "(About: …)" in the owner's message:
// the cards they asked about, each with its id for the coach.

import type { Draft } from "@/api";

export function attachedNames(
  draft: Draft,
  ids: string[],
): { id: string; name: string }[] {
  const cards = new Map(draft.cards.map((card) => [card.id, card.title]));
  return ids.flatMap((id) => {
    const name = cards.get(id);
    return name ? [{ id, name }] : [];
  });
}
