// Each persona's little kobold (components/persona-monster.tsx): the
// kobold's own body and face, with its own hat (one of a few close shapes
// of the kobold's wizard hat, in its own colour) and maybe a small thing it
// wears, all chosen from the persona's name, so the same persona is the
// same one everywhere. The colour follows the persona's tint when it has
// one (so personas side by side differ), else the name too. Kept apart
// from the component so it is checked on its own.

export const HATS = ["tall", "short", "bobble", "star", "floppy"] as const;
export const WEARS = ["none", "scarf", "bow", "glasses"] as const;
// The persona tints' families first (persona-1 … persona-5, in order),
// then two more for a name without a tint; none is the kobold's own blue.
export const HUES = [
  "cyan",
  "amber",
  "violet",
  "green",
  "rose",
  "coral",
  "teal",
] as const;

export type Monster = {
  hat: (typeof HATS)[number];
  wears: (typeof WEARS)[number];
  hue: (typeof HUES)[number];
};

// FNV-1a: a small, stable hash of the name.
export function hashOf(seed: string): number {
  let hash = 0x811c9dc5;
  for (const char of seed.trim().toLowerCase()) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

const pick = <T>(list: readonly T[], at: number): T =>
  list[at % list.length] as T;

// The little kobold for this name; `tint` is the persona's tint index (0
// for persona-1), when it has one.
export function monsterOf(seed: string, tint: number | null = null): Monster {
  const hash = hashOf(seed);
  return {
    hat: pick(HATS, hash >>> 8),
    wears: pick(WEARS, hash >>> 3),
    hue: tint === null ? pick(HUES, hash >>> 10) : pick(HUES, tint % 5),
  };
}

// The tint index in a tint class ("bg-persona-3" is 2), or null.
export function tintIndexOf(tint: string): number | null {
  const found = /persona-(\d+)/.exec(tint);
  return found ? Number(found[1]) - 1 : null;
}
