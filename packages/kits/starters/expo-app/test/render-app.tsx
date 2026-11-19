import { render, screen } from '@testing-library/react-native';
import { ExpoRoot } from 'expo-router';
import { getMockContext } from 'expo-router/testing-library';
import { setData, type Data } from './pretend-backend';

// Expo Router loads every route at once in tests.
process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';

// Renders the whole app, with its real routes in src/app, against the pretend
// backend holding `data`. Unlike Expo Router's renderRouter, the clock stays
// real, so the app's requests and timers run as on a phone.
export async function renderApp(data: Omit<Data, 'calls'>, initialUrl = '/') {
  setData(data);
  return await render(
    <ExpoRoot context={getMockContext('./src/app')} location={initialUrl} />,
  );
}

export { screen };
