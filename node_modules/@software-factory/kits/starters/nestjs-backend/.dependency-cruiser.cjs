// Import rules Nest cannot check by itself (see the NestJS kit's conventions).
// A feature is any folder in src/ besides the shared ones. Run with
// `npx depcruise src` (part of `npm run lint`).
const shared = "(common|database)";

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
      name: "shared-never-imports-features",
      comment: "common/ and database/ serve every feature, so they know none.",
      severity: "error",
      from: { path: `^src/${shared}/` },
      to: { path: `^src/(?!${shared}/)[^/]+/` },
    },
    {
      name: "features-meet-through-module-service-or-rules",
      comment:
        "A feature uses another only through its module, its service or its pure rules; never its repository, controller or schemas.",
      severity: "error",
      from: { path: `^src/(?!${shared}/)([^/]+)/` },
      to: {
        path: `^src/(?!${shared}/)[^/]+/`,
        pathNot: [
          "^src/$1/",
          "\\.module\\.ts$",
          "\\.service\\.ts$",
          "\\.rules\\.ts$",
        ],
      },
    },
    {
      name: "rules-stay-pure",
      comment:
        "A .rules.ts file holds business rules only: no Nest, HTTP, database or files.",
      severity: "error",
      from: { path: "\\.rules\\.ts$" },
      to: {
        path: "^(node_modules/(@nestjs|drizzle-orm|pg|express)/|src/database/)|^(fs|node:fs|http|node:http)$",
      },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
  },
};
