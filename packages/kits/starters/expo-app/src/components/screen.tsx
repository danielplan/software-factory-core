import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { makeStyles } from '@/theme/make-styles';
import { space } from '@/theme/tokens';

/** A whole screen: the safe area and scrolling content. */
export function Screen({ children }: Readonly<{ children: ReactNode }>) {
  const s = useStyles();
  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={s.content}>{children}</ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: 20,
    paddingTop: space.xxl,
    paddingBottom: 36,
  },
}));
