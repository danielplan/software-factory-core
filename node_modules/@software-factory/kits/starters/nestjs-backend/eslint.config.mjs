import js from "@eslint/js";
import comments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import nestjsTyped from "@darraghor/eslint-plugin-nestjs-typed";
import sonarjs from "eslint-plugin-sonarjs";
import tseslint from "typescript-eslint";

// This backend's checks, part of its promises (BLUEPRINT.md): tighten them
// freely, loosen them only with the owner's agreement. Inline `eslint-disable`
// comments are refused, so a rule cannot be switched off quietly in one file.

const banned = [
  {
    selector: "MemberExpression[object.name='process'][property.name='env']",
    message:
      "Read settings through ConfigService; src/common/environment.ts lists and checks them.",
  },
  {
    selector:
      "CallExpression[callee.object.name='sql'][callee.property.name='raw']",
    message:
      "sql.raw puts text straight into SQL. Use the query builder or the sql`` template with schema columns.",
  },
];

export default tseslint.config(
  {
    ignores: ["node_modules/**", "dist/**", "coverage/**", "drizzle/**"],
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
    files: ["src/**/*.ts", "test/**/*.ts", "scripts/**/*.ts", "*.config.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@eslint-community/eslint-comments/no-use": "error",
      // A typed Promise may be forwarded without an artificial await, including in test doubles.
      "@typescript-eslint/require-await": "off",
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
      // Nest modules and DTOs are classes by design.
      "@typescript-eslint/no-extraneous-class": "off",
      "sonarjs/todo-tag": "error",
      "sonarjs/fixme-tag": "error",
      eqeqeq: "error",
    },
  },
  {
    files: ["src/**/*.ts"],
    plugins: { "@darraghor/nestjs-typed": nestjsTyped },
    rules: {
      ...nestjsTyped.configs.flatNoSwagger.rules,
      "@darraghor/nestjs-typed/injectable-should-be-provided": [
        "error",
        { src: ["src/**/*.ts"], filterFromPaths: ["node_modules", ".spec.ts"] },
      ],
      // The global ValidationPipe strips unknown fields (whitelist) instead.
      "@darraghor/nestjs-typed/validation-pipe-should-use-forbid-unknown":
        "off",
      "no-restricted-syntax": ["error", ...banned],
      // Nest's Logger writes the server's messages.
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
    },
  },
  {
    files: ["test/**/*.ts"],
    rules: {
      "max-lines": [
        "error",
        { max: 600, skipBlankLines: true, skipComments: true },
      ],
      "sonarjs/no-hardcoded-passwords": "off",
      "sonarjs/no-hardcoded-ip": "off",
      "sonarjs/no-clear-text-protocols": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  { files: ["*.mjs", "*.cjs"], ...tseslint.configs.disableTypeChecked },
);
