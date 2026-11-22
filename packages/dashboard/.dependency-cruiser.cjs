// The page's import rules, as the React web app kit sets them
// (packages/kits/rules/react-web-app/conventions.md, and its starter's
// .dependency-cruiser.cjs), after Bulletproof React's one-way flow:
// shared folders -> features -> app. `npm run check:borders:dashboard` at
// the top of the repository runs it, and `npm run verify` with it.

const SRC = "^packages/dashboard/src/";

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
        "The shared folders (api, components, hooks, lib, i18n) serve every area, so they know no feature and not the app.",
      severity: "error",
      from: { path: `${SRC}(api|components|hooks|lib|i18n)/` },
      to: { path: `${SRC}(features|app)/` },
    },
    {
      name: "ui-stays-generic",
      comment:
        "components/ui holds shadcn's pieces as generated: they use each other, the class helper (lib) and shadcn's own hooks (hooks), nothing of the app.",
      severity: "error",
      from: { path: `${SRC}components/ui/` },
      to: {
        path: SRC,
        pathNot: [`${SRC}components/ui/`, `${SRC}lib/`, `${SRC}hooks/`],
      },
    },
    {
      name: "lib-has-no-screens",
      comment:
        "lib is general logic without screens: it imports no component (.tsx) and nothing from components or hooks.",
      severity: "error",
      from: { path: `${SRC}lib/` },
      to: { path: ["\\.tsx$", `${SRC}(components|hooks)/`] },
    },
    {
      name: "hooks-have-no-screens",
      comment: "A shared hook knows no component; components use hooks.",
      severity: "error",
      from: { path: `${SRC}hooks/` },
      to: { path: `${SRC}components/` },
    },
    {
      name: "api-knows-no-screen",
      comment:
        "api talks to the server; how its answers are shown lives in components, hooks and lib.",
      severity: "error",
      from: { path: `${SRC}api/` },
      to: { path: `${SRC}(components|hooks|lib)/` },
    },
    {
      name: "features-do-not-meet",
      comment:
        "A feature never imports another feature: they share only through the shared folders, and app/ puts them together.",
      severity: "error",
      from: { path: `${SRC}features/([^/]+)/` },
      to: {
        path: `${SRC}features/`,
        pathNot: `${SRC}features/$1/`,
      },
    },
    {
      name: "app-only-composes",
      comment:
        "app/ puts the areas together and may import everything; nothing but main.tsx depends on it.",
      severity: "error",
      from: { path: SRC, pathNot: [`${SRC}app/`, `${SRC}main\\.tsx$`] },
      to: { path: `${SRC}app/` },
    },
    {
      name: "no-orphans",
      comment: "Every file in src is used; a file nobody imports is dead code.",
      severity: "error",
      from: {
        orphan: true,
        pathNot: [`${SRC}main\\.tsx$`, "\\.d\\.ts$", "\\.css$"],
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
  ],
  options: {
    // Only the page's own files; its type-only imports from the server
    // (../../server/src) are left to TypeScript.
    includeOnly: SRC,
    doNotFollow: { path: "node_modules" },
    // Type-only imports count too: they tie the code together the same way.
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "packages/dashboard/tsconfig.json" },
  },
};
