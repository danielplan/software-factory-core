import js from "@eslint/js";
import comments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import i18next from "eslint-plugin-i18next";
import sonarjs from "eslint-plugin-sonarjs";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
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
  {
    ignores: [
      "**/node_modules/**",
      "coverage/**",
      "packages/dashboard/dist/**",
      // The kits' starters are whole products with their own checks
      // (each starter's npm run verify).
      "packages/kits/starters/**",
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
    // The web interface runs in the browser, with its own TypeScript
    // settings, and follows React's rules of hooks.
    files: ["packages/dashboard/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: false,
        project: "packages/dashboard/tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ["packages/*/src/**/*.{ts,tsx}", "packages/*/bin/**/*.ts"],
    rules: limits,
  },
  {
    // Markup puts one attribute per line, so a component passes 60 lines
    // while still doing one thing: functions in .tsx files get 80.
    files: ["packages/dashboard/src/**/*.tsx"],
    ignores: ["packages/dashboard/src/components/ui/**"],
    rules: {
      "max-lines-per-function": [
        "error",
        { max: 80, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    // Every word a screen shows goes through i18next, in each language: a
    // screen's own JSX text, or a label for a screen reader, a tooltip, a
    // field's hint or a picture's text written straight in, is English
    // only. Names that are the same in every language, addresses, paths
    // and keyboard shortcuts are left out. shadcn's pieces have no words.
    files: ["packages/dashboard/src/**/*.tsx"],
    ignores: ["packages/dashboard/src/components/ui/**"],
    plugins: { i18next },
    rules: {
      "i18next/no-literal-string": [
        "error",
        {
          mode: "jsx-only",
          "jsx-attributes": {
            include: ["title", "aria-label", "placeholder", "alt", "label"],
          },
          words: {
            exclude: [
              // Only signs and digits.
              /^[^\p{L}]*$/u,
              /^(Kobble|kobble|Sprocket|GitHub|Jira|Claude Code)$/,
              // An address or a path, or a keyboard shortcut (⌘J).
              /^(https?:\/\/|\/|#|\.|⌘)/,
            ],
          },
        },
      ],
    },
  },
  {
    // Moving between pages goes through React Router: a <Link to="/page">
    // or useNavigate(), never the address written by hand, so the router
    // knows of every move. An anchor on the same page (href="#…") is
    // written as an id, not as a page.
    files: ["packages/dashboard/src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "AssignmentExpression > MemberExpression.left[property.name='hash']",
          message: "Go to a page with useNavigate() from react-router.",
        },
        {
          selector:
            "JSXAttribute[name.name='href'] > Literal[value=/^#/], JSXAttribute[name.name='href'] > JSXExpressionContainer > TemplateLiteral > TemplateElement:first-child[value.raw=/^#/]",
          message: 'Link to a page with <Link to="/page"> from react-router.',
        },
      ],
    },
  },
  {
    // shadcn's generated pieces (npx shadcn add): kept as generated, so later
    // updates stay easy to compare.
    files: ["packages/dashboard/src/components/ui/**/*.tsx"],
    rules: {
      "sonarjs/prefer-read-only-props": "off",
      "sonarjs/function-return-type": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      eqeqeq: "off",
    },
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
  { files: ["*.mjs", "**/*.cjs"], ...tseslint.configs.disableTypeChecked },
  {
    files: ["**/*.cjs"],
    languageOptions: { globals: globals.node, sourceType: "commonjs" },
  },
);
