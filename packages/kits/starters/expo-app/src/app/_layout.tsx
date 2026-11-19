// The prototype switch comes first, so a prototype's pretend backend starts
// before anything else can ask the backend.
import { prototypeStarted } from '@/lib/prototype-mode';
import { Stack } from 'expo-router';
import { use } from 'react';
import { AppProviders } from '@/providers/app-providers';

export default function RootLayout() {
  // A prototype shows nothing until its pretend backend answers.
  if (prototypeStarted) use(prototypeStarted);
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }} />
    </AppProviders>
  );
}
