// The app's checks: Expo's own rules, the type-checked TypeScript
// rules, SonarJS, React's hook rules, accessibility rules for React Native,
// no text written into screens, and size and complexity limits. These rules
// are part of the app's promises (BLUEPRINT.md): tighten them freely, loosen
// them only with the owner's agreement. Inline `eslint-disable` comments are
// refused, so a rule cannot be switched off quietly in one file.
const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const sonarjs = require('eslint-plugin-sonarjs');
const reactHooks = require('eslint-plugin-react-hooks');
const comments = require('@eslint-community/eslint-plugin-eslint-comments/configs');
const a11y = require('eslint-plugin-react-native-a11y');
const i18next = require('eslint-plugin-i18next');
const globals = require('globals');

const limits = {
  'no-console': 'error',
  complexity: ['error', 12],
  'max-depth': ['error', 3],
  'max-params': ['error', 5],
  'max-lines': [
    'error',
    { max: 300, skipBlankLines: true, skipComments: true },
  ],
  'max-lines-per-function': [
    'error',
    { max: 60, skipBlankLines: true, skipComments: true },
  ],
};

// eslint-plugin-react-native-a11y (accessibility rules for React Native)
// still describes itself for ESLint 8. Its rules run under ESLint 9 and are
// listed here one by one, except:
// - has-valid-accessibility-state crashes on a spread of props (a bug in the
//   plugin); TypeScript already checks the shape of accessibilityState.
// - has-accessibility-hint asks for a hint beside every label, and
//   has-valid-accessibility-ignores-invert-colors for an iOS-only flag on
//   every image: style choices rather than problems.
const accessibility = Object.fromEntries(
  [
    'has-accessibility-props',
    'has-valid-accessibility-actions',
    'has-valid-accessibility-component-type',
    'has-valid-accessibility-descriptors',
    'has-valid-accessibility-live-region',
    'has-valid-accessibility-role',
    'has-valid-accessibility-states',
    'has-valid-accessibility-traits',
    'has-valid-accessibility-value',
    'has-valid-important-for-accessibility',
    'no-nested-touchables',
  ].map((name) => [`react-native-a11y/${name}`, 'error']),
);

module.exports = defineConfig([
  {
    ignores: [
      'dist-*/**',
      '.expo/**',
      '.expo-export*/**',
      'coverage/**',
      'node_modules/**',
      'expo-env.d.ts',
      // MSW's service worker for the prototype, written by `msw init`.
      'public/mockServiceWorker.js',
    ],
  },
  {
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: 'error',
    },
  },
  expo,
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  sonarjs.configs.recommended,
  comments.recommended,
  reactHooks.configs.flat['recommended-latest'],
  prettier,
  {
    settings: {
      // Expo's import rules resolve paths the way TypeScript does ("@/…"),
      // with the resolver made for it, so ESLint never stops on an import.
      'import/resolver': {
        typescript: { project: `${__dirname}/tsconfig.json` },
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@eslint-community/eslint-comments/no-use': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true },
      ],
      'sonarjs/todo-tag': 'error',
      'sonarjs/fixme-tag': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
  {
    files: ['src/**/*.tsx'],
    plugins: { 'react-native-a11y': a11y },
    rules: accessibility,
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: limits,
  },
  {
    // Markup puts one attribute per line, so a form with four labelled inputs
    // passes 60 lines while still doing one thing. Functions in .tsx files
    // get 80; .ts files keep 60.
    files: ['src/**/*.tsx'],
    rules: {
      'max-lines-per-function': [
        'error',
        { max: 80, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    // Every text a person reads comes from the translation files
    // (src/i18n/locales), so no screen shows untranslated words. Text written
    // into JSX, as an element's content or an attribute, is refused.
    files: ['src/**/*.tsx'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-only',
          'jsx-attributes': {
            exclude: [
              'testID',
              'name',
              'icon',
              'variant',
              'tone',
              'role',
              'size',
              'behavior',
              'resizeMode',
              'autoComplete',
              'autoCapitalize',
              'keyboardType',
              'textContentType',
              'returnKeyType',
              'submitBehavior',
              'mode',
              'display',
              'animationType',
              'accessibilityRole',
              'accessibilityLiveRegion',
              'importantForAccessibility',
              'pointerEvents',
              'style',
              'href',
              'rulesType',
            ],
          },
        },
      ],
    },
  },
  {
    files: ['test/**/*.{ts,tsx}', 'jest.setup.ts'],
    languageOptions: { globals: globals.jest },
    rules: {
      'max-lines': [
        'error',
        { max: 600, skipBlankLines: true, skipComments: true },
      ],
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    // The prototype tells the frame around it (the factory's page,
    // wherever it is served) which situations it has: the message holds only
    // their names, so any origin may read it, as the factory's contract says.
    files: ['prototype/platform.web.ts'],
    rules: { 'sonarjs/post-message': 'off' },
  },
  {
    files: ['**/*.cjs', '**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { globals: globals.node, sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
]);
