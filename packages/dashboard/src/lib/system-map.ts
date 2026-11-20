// What the System map draws, worked out from the parts: a line from each
// part to each part that needs it, which parts come out when one is pointed
// at, and what each type of part means. Kept apart from the map so it is
// checked on its own.

import type { PartView } from "../api.ts";

type PartType = NonNullable<PartView["type"]>;

export type Line = { id: string; source: string; target: string };

// A line from the part needed to the part that needs it, so the map reads
// left to right from what comes first; only between parts on the map.
export function linesOf(parts: PartView[]): Line[] {
  const known = new Set(parts.map((part) => part.id));
  return parts.flatMap((part) =>
    part.dependsOn
      .filter((needed) => known.has(needed))
      .map((needed) => ({
        id: `${needed}>${part.id}`,
        source: needed,
        target: part.id,
      })),
  );
}

// The part pointed at and the parts at the other ends of its lines; null
// while none is pointed at.
export function nearOf(lines: Line[], pointed: string | null) {
  if (pointed === null) return null;
  const near = new Set([pointed]);
  for (const line of lines) {
    if (line.source === pointed) near.add(line.target);
    if (line.target === pointed) near.add(line.source);
  }
  return near;
}

// Each type's name on its tag and what it means, told when the tag is
// pointed at.
export const TYPES: Record<PartType, { label: string; means: string }> = {
  screen: { label: "Screen", means: "what people open, a web page or app" },
  backend: { label: "Backend", means: "works behind the screens" },
  data: { label: "Data", means: "where data is stored" },
  outside: {
    label: "Outside service",
    means: "run by someone else, like payments",
  },
};
