// The server's borders (packages/server/BLUEPRINT.md), checked by
// dependency-cruiser in `npm run check:borders:server`: code flows one way,
// core → extensions → app. The core never imports an extension or the app;
// an extension imports the core (and the plugs' types) but never another
// extension, nor the app; only the app and the command line (bin/) put
// the extensions together.

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "server-core-not-to-extensions",
      comment:
        "The server's core never imports an extension or the app: extensions plug into it, the app puts them together.",
      severity: "error",
      from: {
        path: "^packages/server/src/",
        pathNot: "^packages/server/src/(extensions|app)/",
      },
      to: { path: "^packages/server/src/(extensions|app)/" },
    },
    {
      name: "server-extension-not-to-another",
      comment:
        "An extension can be installed and removed: it never imports another one, only the core's plugs.",
      severity: "error",
      from: { path: "^packages/server/src/extensions/([^/]+)/" },
      to: {
        path: "^packages/server/src/extensions/",
        pathNot: "^packages/server/src/extensions/$1/",
      },
    },
    {
      name: "server-extension-not-to-app",
      comment: "Only the app (and bin/) puts the extensions together.",
      severity: "error",
      from: { path: "^packages/server/src/extensions/" },
      to: { path: "^packages/server/src/app/" },
    },
  ],
  options: {
    includeOnly: "^packages/server/(src|bin)/",
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      extensions: [".ts", ".js", ".json"],
    },
  },
};
