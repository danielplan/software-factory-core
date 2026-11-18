import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    root: "./",
    setupFiles: ["test/setup-environment.ts"],
    include: ["test/**/*.spec.ts", "src/**/*.spec.ts"],
    // Database suites share one test database; run files one after another.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/main.ts"],
      reporter: ["text-summary"],
      // The coverage floor; raise it as tests are added, lower it only with the owner's agreement.
      thresholds: { statements: 87, branches: 73, functions: 93, lines: 89 },
    },
  },
});
