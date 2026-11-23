import js from "@eslint/js";
import comments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import sonarjs from "eslint-plugin-sonarjs";
import globals from "globals";
import i18next from "eslint-plugin-i18next";
import tseslint from "typescript-eslint";

// The kit's checks for a React web app: strict type-checked rules, SonarJS,
// React's hook rules and accessibility rules. These rules are
// part of this app's promises (BLUEPRINT.md): tighten them freely, loosen them
// only with the owner's agreement. Inline `eslint-disable` comments are refused, so a rule cannot be
// switched off quietly in one file.

const limits = {
  "no-console": "error",
  complexity: ["error", 12],
  "max-depth": ["error", 3],
  "max-params": ["error", 5],
  "max-lines": [
    "error",
    { max: 300, skipBlankLines: true, skipComments: true },
  ],
  "max-lines-per-function": [
    "error",
    { max: 60, skipBlankLines: true, skipComments: true },
  ],
};

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "dist-prototype/**",
      "test-results/**",
      "playwright-report/**",
      // MSW's service worker, written by `npx msw init`.
      "prototype/public/**",
    ],
  },
  {
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: "error",
    },
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  sonarjs.configs.recommended,
  comments.recommended,
  reactHooks.configs.flat["recommended-latest"],
  jsxA11y.flatConfigs.strict,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@eslint-community/eslint-comments/no-use": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
      ],
      "sonarjs/todo-tag": "error",
      "sonarjs/fixme-tag": "error",
      eqeqeq: "error",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/**"],
    rules: limits,
  },
  {
    // Every text a person reads comes from the translation files
    // (src/i18n/locales), so no screen can show untranslated words. Text
    // written into JSX, as an element's content or an attribute, is refused.
    files: ["src/**/*.tsx"],
    plugins: { i18next },
    rules: {
      "i18next/no-literal-string": [
        "error",
        {
          mode: "jsx-only",
          "jsx-attributes": {
            exclude: [
              "className",
              "id",
              "htmlFor",
              "key",
              "to",
              "type",
              "variant",
              "size",
              "side",
              "position",
              "role",
              "step",
              "lang",
              "i18nKey",
              "value",
              "data-.*",
            ],
          },
        },
      ],
    },
  },
  {
    // Markup puts one attribute per line, so a form with four labelled inputs
    // passes 60 lines while still doing one thing. Functions in .tsx files
    // (components, and table columns with their cells) get 80; .ts files
    // keep 60.
    files: ["src/**/*.tsx"],
    ignores: ["src/components/ui/**"],
    rules: {
      "max-lines-per-function": [
        "error",
        { max: 80, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    // shadcn's generated pieces (npx shadcn add): kept as generated, so later
    // updates stay easy to compare. They get the size limits, not the rules
    // that would mean rewriting shadcn's own code.
    files: ["src/components/ui/**/*.tsx"],
    rules: {
      ...limits,
      "sonarjs/prefer-read-only-props": "off",
      "sonarjs/function-return-type": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      eqeqeq: "off",
    },
  },
  {
    files: ["test/**/*.{ts,tsx}"],
    rules: {
      "max-lines": [
        "error",
        { max: 600, skipBlankLines: true, skipComments: true },
      ],
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    // The prototype tells the factory around it which situations it has.
    // That page is served from another origin, and the message holds only
    // the situations' names, so it goes to any origin ("*").
    files: ["prototype/start.ts"],
    rules: { "sonarjs/post-message": "off" },
  },
  { files: ["*.mjs", "*.cjs"], ...tseslint.configs.disableTypeChecked },
  {
    files: ["*.cjs"],
    languageOptions: { globals: globals.node, sourceType: "commonjs" },
  },
);
