// The app's design tokens: every colour, size, corner and type style comes
// from here. The starter's are neutral; give the app its own look by
// changing them. A test refuses hex colours anywhere else in src/. Add a
// token here when a screen needs a new one.

/** The colours of one appearance. Both palettes have the same names. */
export type Palette = {
  /** The screen behind everything. */
  background: string;
  /** Cards and bars. */
  surface: string;
  /** Rows and boxes inside a card. */
  raised: string;
  line: string;
  text: string;
  muted: string;
  accent: string;
  /** Text and icons on the accent colour. */
  onAccent: string;
  /** Links and accent text on the screen's background. */
  link: string;
  danger: string;
};

const dark: Palette = {
  background: '#111111',
  surface: '#1C1C1C',
  raised: '#262626',
  line: '#3A3A3A',
  text: '#F5F5F5',
  muted: '#A3A3A3',
  accent: '#F5F5F5',
  onAccent: '#111111',
  link: '#D4D4D4',
  danger: '#F87171',
};

const light: Palette = {
  background: '#F5F5F5',
  surface: '#FFFFFF',
  raised: '#FAFAFA',
  line: '#E5E5E5',
  text: '#171717',
  muted: '#525252',
  accent: '#171717',
  onAccent: '#FFFFFF',
  link: '#171717',
  danger: '#B91C1C',
};

export const palettes = { dark, light } as const;
export type Scheme = keyof typeof palettes;

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 22, xxl: 28 } as const;

export const radius = { s: 10, m: 14, l: 18, xl: 22, card: 26 } as const;

/** The smallest side of anything a finger presses (Apple's 44 points). */
export const touchTarget = 44;

// The phone's own system font, in a few sizes.
export const type = {
  hero: { fontSize: 30, fontWeight: '400' },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21 },
  label: { fontSize: 16, fontWeight: '600' },
  small: { fontSize: 13, lineHeight: 18 },
  eyebrow: { fontSize: 13, fontWeight: '600', letterSpacing: 1.5 },
} as const;
