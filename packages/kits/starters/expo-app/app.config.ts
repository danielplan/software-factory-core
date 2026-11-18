import type { ConfigContext, ExpoConfig } from 'expo/config';

// The app's configuration is app.json. A prototype (`npm run prototype`) is
// served under a path such as /prototypes/new-phone-app/v1; the
// script passes it in PROTOTYPE_BASE_URL and Expo builds the web app for it
// (experiments.baseUrl). Every other build uses app.json as it is.
export default ({ config }: ConfigContext): ExpoConfig => {
  const app = config as ExpoConfig;
  const baseUrl = process.env.PROTOTYPE_BASE_URL;
  return baseUrl
    ? { ...app, experiments: { ...app.experiments, baseUrl } }
    : app;
};
