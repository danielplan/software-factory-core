import type { ReactNode } from 'react';
import { View } from 'react-native';
import { makeStyles } from '@/theme/make-styles';
import { radius, space } from '@/theme/tokens';

/** A group of related content on the screen. `raised` is a box inside a card. */
export function Card({
  children,
  tone = 'surface',
  testID,
}: Readonly<{
  children: ReactNode;
  tone?: 'surface' | 'raised';
  testID?: string;
}>) {
  const s = useStyles();
  return (
    <View testID={testID} style={tone === 'raised' ? s.raised : s.card}>
      {children}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: space.xl,
    marginBottom: space.xl,
    gap: space.s,
  },
  raised: {
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xl,
    padding: space.l,
    gap: space.s,
  },
}));
