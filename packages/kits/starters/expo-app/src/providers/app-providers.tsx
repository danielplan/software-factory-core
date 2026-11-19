import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import {
  initialWindowMetrics,
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import '@/i18n/i18n';
import { whenPrototypeDataChanges } from '@/lib/prototype-mode';
import { useScheme, useTheme } from '@/theme/use-theme';
import { createQueryClient } from './query-client';

/**
 * Everything the screens rely on, above the router: saved answers (TanStack
 * Query), the safe area, the translations, and the navigation's colours in
 * the appearance shown now. In a prototype, the saved answers are read
 * again when the made-up data changes under the app.
 */
export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  const [client] = useState(createQueryClient);
  useEffect(
    () =>
      whenPrototypeDataChanges(() => {
        void client.invalidateQueries();
      }),
    [client],
  );
  const scheme = useScheme();
  const colors = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <QueryClientProvider client={client}>
        <ThemeProvider
          value={{
            ...base,
            colors: {
              ...base.colors,
              background: colors.background,
              card: colors.surface,
              text: colors.text,
              border: colors.line,
              primary: colors.accent,
            },
          }}
        >
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
