// Light or dark: as the computer is set (System, the first choice), or
// always light, or always dark, chosen in Settings and kept in this
// browser. The dark colours are written once, in rules for a computer set
// to dark (index.css, and a company's theme.css the same way); a choice
// turns those rules on or off where they are, in the page's style sheets
// (the browser's own CSS object model), so nothing is written twice.

export const THEME_CHOICES = ["system", "light", "dark"] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];

const KEY = "kobble-theme";
const DARK = /prefers-color-scheme:\s*dark/;

export function choiceOf(stored: string | null | undefined): ThemeChoice {
  return THEME_CHOICES.find((one) => one === stored) ?? "system";
}

// What a rule for a computer set to dark applies to, for a choice.
export function mediaFor(choice: ThemeChoice, original: string): string {
  if (choice === "dark") return "all";
  if (choice === "light") return "not all";
  return original;
}

// The parts of the CSS object model this needs, so the tests can stand in
// for the browser.
export type RuleLike = {
  cssText: string;
  media?: { mediaText: string };
  cssRules?: ArrayLike<RuleLike>;
};
export type SheetLike = { cssRules: ArrayLike<RuleLike> };

// Each rule's own condition, kept the first time it is changed.
const originals = new WeakMap<RuleLike, string>();

function rulesOf(holder: { cssRules?: ArrayLike<RuleLike> }): RuleLike[] {
  try {
    return Array.from(holder.cssRules ?? []);
  } catch {
    // A style sheet from elsewhere cannot be read; it has no dark rules
    // of the factory's.
    return [];
  }
}

function applyTo(rules: RuleLike[], choice: ThemeChoice): void {
  for (const rule of rules) {
    const { media } = rule;
    if (media) {
      const original = originals.get(rule) ?? media.mediaText;
      if (DARK.test(original)) {
        originals.set(rule, original);
        media.mediaText = mediaFor(choice, original);
      }
    }
    applyTo(rulesOf(rule), choice);
  }
}

// Turns the dark rules of every style sheet on, off, or back to following
// the computer.
export function applyChoice(
  sheets: Iterable<SheetLike>,
  choice: ThemeChoice,
): void {
  for (const sheet of sheets) applyTo(rulesOf(sheet), choice);
}

// The choice kept in this browser; System when there is none or the
// browser keeps nothing (a private window, blocked storage).
export function storedChoice(
  storage: () => Pick<Storage, "getItem">,
): ThemeChoice {
  try {
    return choiceOf(storage().getItem(KEY));
  } catch {
    return "system";
  }
}

// Keeps the choice in this browser; false when it cannot.
export function keepChoice(
  storage: () => Pick<Storage, "setItem">,
  choice: ThemeChoice,
): boolean {
  try {
    storage().setItem(KEY, choice);
    return true;
  } catch {
    return false;
  }
}
