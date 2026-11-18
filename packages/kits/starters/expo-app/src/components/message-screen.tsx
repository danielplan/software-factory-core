import type { ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { makeStyles } from '@/theme/make-styles';
import { space, type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/**
 * A whole screen with one message: loading (with a spinner) or a problem
 * with what the person can do about it (`children`, usually buttons).
 */
export function MessageScreen({
  message,
  loading = false,
  children,
}: Readonly<{
  message: string;
  loading?: boolean;
  children?: ReactNode;
}>) {
  const s = useStyles();
  const colors = useTheme();
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.content}>
        {loading ? <ActivityIndicator color={colors.link} /> : null}
        <Text
          style={s.message}
          accessibilityRole={loading ? 'progressbar' : 'alert'}
        >
          {message}
        </Text>
        {children}
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    padding: 24,
    gap: space.l,
  },
  message: {
    ...type.label,
    fontWeight: '400',
    color: colors.text,
    textAlign: 'center',
  },
}));
