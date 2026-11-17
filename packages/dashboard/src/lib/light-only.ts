// The dashboard is light only for now. Its own styles have no dark
// colours; a company's theme (factory/theme.css) may still have rules for a
// computer set to dark, and these are switched off where they are, in the
// page's style sheets (the browser's own CSS object model).

const DARK = /prefers-color-scheme:\s*dark/;

// The parts of the CSS object model this needs, so the tests can stand in
// for the browser.
export type RuleLike = {
  cssText: string;
  media?: { mediaText: string };
  cssRules?: ArrayLike<RuleLike>;
};
export type SheetLike = { cssRules: ArrayLike<RuleLike> };

function rulesOf(holder: { cssRules?: ArrayLike<RuleLike> }): RuleLike[] {
  try {
    return Array.from(holder.cssRules ?? []);
  } catch {
    // A style sheet from elsewhere cannot be read; it has no dark rules of
    // the factory's.
    return [];
  }
}

function switchOff(rules: RuleLike[]): void {
  for (const rule of rules) {
    if (rule.media && DARK.test(rule.media.mediaText))
      rule.media.mediaText = "not all";
    switchOff(rulesOf(rule));
  }
}

// Switches off every rule for a computer set to dark.
export function lightOnly(sheets: Iterable<SheetLike>): void {
  for (const sheet of sheets) switchOff(rulesOf(sheet));
}
