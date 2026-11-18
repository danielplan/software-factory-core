import NetInfo from '@react-native-community/netinfo';
import {
  focusManager,
  onlineManager,
  QueryClient,
} from '@tanstack/react-query';
import { AppState } from 'react-native';

// TanStack Query on a phone, as its React Native guide describes: requests
// pause without a network and resume when it returns (NetInfo), and screens
// refresh when the app comes back to the front.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(state.isConnected !== false);
  }),
);

focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener('change', (state) => {
    setFocused(state === 'active');
  });
  return () => {
    subscription.remove();
  };
});

export function createQueryClient() {
  // In tests nothing is kept after a screen closes, so Jest can stop.
  const gcTime = process.env.NODE_ENV === 'test' ? 0 : 300_000;
  return new QueryClient({
    defaultOptions: {
      // A refusal or a missing network is shown at once, with a retry.
      queries: { retry: false, gcTime },
      mutations: { retry: false, gcTime },
    },
  });
}
