import { useColorScheme } from 'react-native';
import { palettes, type Palette, type Scheme } from './tokens';

/** The appearance shown now: the phone's (light when it says none). */
export function useScheme(): Scheme {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

/** The colours of the appearance shown now. */
export function useTheme(): Palette {
  return palettes[useScheme()];
}
