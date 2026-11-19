import { Platform } from 'react-native';

/**
 * The backend's address from .env: EXPO_PUBLIC_API_URL for
 * every phone, otherwise the address for this platform. Expo reads .env when
 * it starts, so a change needs a restart of Expo.
 */
export function apiUrlFor(
  platform: string,
  settings: {
    common?: string;
    android?: string;
    ios?: string;
  },
): string {
  const url =
    settings.common ||
    (platform === 'android' ? settings.android : settings.ios);
  if (!url)
    throw new Error(
      'Set EXPO_PUBLIC_API_URL or the platform-specific EXPO_PUBLIC_API_ANDROID_URL / EXPO_PUBLIC_API_IOS_URL in .env.',
    );
  // Without the slashes at the end, so paths can be added with one.
  let end = url.length;
  while (url.endsWith('/', end)) end -= 1;
  return url.slice(0, end);
}

/** The backend's address for this phone. */
export const apiUrl = apiUrlFor(Platform.OS, {
  // Expo replaces each EXPO_PUBLIC_ name with its value when it builds the app.
  common: process.env.EXPO_PUBLIC_API_URL,
  android: process.env.EXPO_PUBLIC_API_ANDROID_URL,
  ios: process.env.EXPO_PUBLIC_API_IOS_URL,
});
