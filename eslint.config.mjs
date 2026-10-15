import js from "@eslint/js";
import comments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import sonarjs from "eslint-plugin-sonarjs";
import globals from "globals";
import tseslint from "typescript-eslint";

// One set of checks for every package. Tighten them freely; loosen them only
// with the maintainer's agreement. Inline `eslint-disable` comments are
// refused, so a rule cannot be switched off quietly in one file.

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
  { ignores: ["**/node_modules/**", "coverage/**"] },
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
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@eslint-community/eslint-comments/no-use": "error",
      // As in the backend: a typed Promise may be forwarded without an
      // artificial await, including in test doubles.
      "@typescript-eslint/require-await": "off",
      // node:test's test() and describe() are awaited by the test runner
      // itself (typescript-eslint's documented setting for node:test).
      "@typescript-eslint/no-floating-promises": [
        "error",
        {
          allowForKnownSafeCalls: [
            {
              from: "package",
              name: ["test", "it", "describe", "suite"],
              package: "node:test",
            },
          ],
        },
      ],
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
    files: ["packages/*/src/**/*.ts", "packages/*/bin/**/*.ts"],
    rules: limits,
  },
  {
    // Command-line programs tell the person in the terminal what happens.
    files: ["packages/*/bin/**/*.ts"],
    rules: { "no-console": "off" },
  },
  {
    files: ["packages/*/test/**/*.ts"],
    rules: {
      "max-lines": [
        "error",
        { max: 600, skipBlankLines: true, skipComments: true },
      ],
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  { files: ["*.mjs", "*.cjs"], ...tseslint.configs.disableTypeChecked },
  {
    files: ["*.cjs"],
    languageOptions: { globals: globals.node, sourceType: "commonjs" },
  },
);
