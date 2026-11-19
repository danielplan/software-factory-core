// Jest with Expo's preset (jest-expo): every test of the app runs here.
const expo = require('jest-expo/jest-preset');

// Packages published as modern JavaScript modules, which Jest must translate
// like the app's own code: Expo's and React Native's, and those of the pretend
// backend (MSW).
const translated = [
  '.pnpm',
  'react-native',
  '@react-native',
  '@react-native-community',
  'expo',
  '@expo',
  '@expo-google-fonts',
  'react-navigation',
  '@react-navigation',
  '@sentry/react-native',
  'native-base',
  'standard-navigation',
  'msw',
  '@mswjs',
  'rettime',
  'until-async',
  '@open-draft',
];

const javascript = Object.entries(expo.transform).find(([pattern]) =>
  pattern.includes('jt'),
);

/** @type {import('jest').Config} */
module.exports = {
  ...expo,
  transform: { ...expo.transform, '\\.mjs$': javascript[1] },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'mjs'],
  transformIgnorePatterns: [
    `/node_modules/(?!(${translated.join('|')}))`,
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  // Matched below the project, so a parent folder starting with a dot
  // (.factory-workspaces) does not hide the tests.
  testMatch: ['**/test/**/*.test.{ts,tsx}'],
  setupFiles: [...(expo.setupFiles ?? []), '<rootDir>/test/setup-env.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Whole-app journeys run many screens; under a busy computer they need time.
  testTimeout: 20000,
  // Browser files (name.web.ts) run only in the prototype, never in Jest.
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.web.{ts,tsx}'],
  coverageReporters: ['text-summary'],
  // The coverage floor. Raise it when tests are added; lowering it needs
  // the owner's agreement.
  coverageThreshold: {
    global: { statements: 90, branches: 72, functions: 88, lines: 91 },
  },
  // MSW's Node server is closed to React Native by its package exports; the
  // tests run in Node, so they load it directly.
  moduleNameMapper: {
    ...expo.moduleNameMapper,
    '^msw/node$': '<rootDir>/node_modules/msw/lib/node/index.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
