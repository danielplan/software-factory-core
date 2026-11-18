// Import rules for the app's folders (see BLUEPRINT.md and the kit's
// conventions), after Bulletproof React's one-way flow:
// shared folders -> features -> app. A new area is one more name in `areas`. Run with
// `npx depcruise src prototype` (part of `npm run lint`).
const areas = "(home)";

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      comment: "Files must not import each other in a circle.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "shared-knows-no-feature",
      comment:
        "The shared folders (api, components, hooks, lib, i18n) serve every area, so they know no feature and no page.",
      severity: "error",
      from: { path: "^src/(api|components|hooks|lib|i18n)/" },
      to: { path: "^src/(features|app)/" },
    },
    {
      name: "ui-stays-generic",
      comment:
        "components/ui holds shadcn's pieces as generated: they use each other, the class helper (lib) and shadcn's own hook (hooks), nothing of the app.",
      severity: "error",
      from: { path: "^src/components/ui/" },
      to: {
        path: "^src/",
        pathNot: ["^src/components/ui/", "^src/lib/", "^src/hooks/"],
      },
    },
    {
      name: "lib-has-no-screens",
      comment:
        "lib is general logic without screens: it imports no component (.tsx) and nothing from components or hooks.",
      severity: "error",
      from: { path: "^src/lib/" },
      to: { path: ["\\.tsx$", "^src/(components|hooks)/"] },
    },
    {
      name: "hooks-have-no-screens",
      comment: "A shared hook knows no component; components use hooks.",
      severity: "error",
      from: { path: "^src/hooks/" },
      to: { path: "^src/components/" },
    },
    {
      name: "api-knows-no-screen",
      comment:
        "api loads and checks the data; how it is shown lives in components, hooks and lib.",
      severity: "error",
      from: { path: "^src/api/" },
      to: { path: "^src/(components|hooks|lib)/" },
    },
    {
      name: "features-do-not-meet",
      comment:
        "A feature never imports another feature; areas share only through the shared folders and are put together in app/.",
      severity: "error",
      from: { path: `^src/features/${areas}/` },
      to: {
        path: "^src/features/",
        pathNot: "^src/features/$1/",
      },
    },
    {
      name: "app-only-composes",
      comment:
        "app/ puts the areas together and may import everything; nothing but main.tsx depends on it.",
      severity: "error",
      from: { path: "^src/", pathNot: ["^src/app/", "^src/main\\.tsx$"] },
      to: { path: "^src/app/" },
    },
    {
      name: "prototype-only-through-main",
      comment:
        "The prototype (prototype/) is reached from src only by the one switch in main.tsx, so the real build leaves it out.",
      severity: "error",
      from: { path: "^src/", pathNot: "^src/main\\.tsx$" },
      to: { path: "^prototype/" },
    },
    {
      name: "prototype-is-not-imported-statically",
      comment:
        "main.tsx loads the prototype with a dynamic import() behind import.meta.env.MODE, never a static import.",
      severity: "error",
      from: { path: "^src/main\\.tsx$" },
      to: { path: "^prototype/", dependencyTypesNot: ["dynamic-import"] },
    },
    {
      name: "no-orphans",
      comment: "Every file in src is used; a file nobody imports is dead code.",
      severity: "error",
      from: {
        orphan: true,
        pathNot: ["^src/main\\.tsx$", "\\.d\\.ts$", "\\.css$"],
      },
      to: {},
    },
    {
      name: "not-to-unresolvable",
      comment: "Every import resolves to a file or an installed package.",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: "no-undeclared-packages",
      comment:
        "src imports only packages listed in package.json dependencies (not devDependencies). vite-env.d.ts only names Vite's types; the prototype, left out of the real build, uses MSW.",
      severity: "error",
      from: { pathNot: ["^src/vite-env\\.d\\.ts$", "^prototype/"] },
      to: {
        dependencyTypes: [
          "npm-no-pkg",
          "npm-unknown",
          "npm-dev",
          "npm-optional",
          "npm-peer",
        ],
        dependencyTypesNot: ["type-only"],
      },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      extensions: [".ts", ".tsx", ".js", ".mjs", ".json"],
    },
    exclude: { path: ["^dist/", "^prototype/public/"] },
  },
};
