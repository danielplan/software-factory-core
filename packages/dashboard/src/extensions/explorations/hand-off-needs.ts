// What a board still lacks before it can be handed off, the same rules the
// server refuses by (`prototypeToHandOff`): the button says it in words, so
// nobody is left guessing why it is off. Plain rules, so they are checked.
// A prototype never made (its copy could not be made) is left out, as the
// server leaves it out: nothing in it to build from.

import type { Thing } from "./board/nodes";

export type Missing = "prototype" | "variant" | "something";

export function handOffMissing(
  things: readonly Thing[],
  unmade: readonly string[] = [],
): Missing | null {
  const made = things.filter(
    (one): one is Extract<Thing, { kind: "prototype" }> =>
      one.kind === "prototype" && !unmade.includes(one.key),
  );
  // A prototype on the board is handed off agreed, with its variant chosen,
  // or not at all.
  if (made.length > 0) {
    const agreed = made.find((one) => one.agreed);
    if (!agreed) return "prototype";
    const several = (agreed.variants?.length ?? 0) > 1;
    return several && !agreed.variant ? "variant" : null;
  }
  // An idea that changes no screen: its agreed choices, notes or diagrams.
  return things.some((one) => one.agreed) ? null : "something";
}
