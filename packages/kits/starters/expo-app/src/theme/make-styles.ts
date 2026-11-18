import { StyleSheet } from 'react-native';
import { palettes, type Palette, type Scheme } from './tokens';
import { useScheme } from './use-theme';

/**
 * Styles that follow the appearance: `makeStyles((colors) => ({ ... }))` gives
 * a hook that returns the StyleSheet for the light or the dark palette. Each
 * sheet is built once per appearance.
 *
 * React Native has no theme for an app's own colours, and React Navigation's
 * theme holds only six of them; a styling library (Restyle, NativeWind) would
 * mean rewriting every style in its own language, so this small helper sits on
 * React Native's own StyleSheet and useColorScheme.
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(
  build: (colors: Palette) => T,
): () => T {
  const built = new Map<Scheme, T>();
  const sheetFor = (scheme: Scheme) => {
    const existing = built.get(scheme);
    if (existing) return existing;
    const sheet = StyleSheet.create(build(palettes[scheme]));
    built.set(scheme, sheet);
    return sheet;
  };
  return function useStyles() {
    return sheetFor(useScheme());
  };
}
