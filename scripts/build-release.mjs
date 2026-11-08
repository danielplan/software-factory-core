// Builds the core as one package a project installs straight from this
// repository: node scripts/build-release.mjs <folder>
//
// The core's packages, compiled to JavaScript in their own layout (npm does
// not run TypeScript from node_modules) and bundled inside the package, with
// the dashboard built, the skills, their templates and guides, the
// knowledge base's template and the kits' rules. Its own `bin` is the
// software-factory command. The folder is then committed to the release
// branch and tagged release-<version> (docs/releasing.md).

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

const here = resolve(import.meta.dirname, "..");
const out = resolve(process.argv[2] ?? join(here, "release"));
const PACKAGES = [
  "core",
  "kits",
  "knowledge-base",
  "launcher",
  "server",
  "skills",
];
// What each package needs besides its compiled code, as its own files.
const ASSETS = {
  skills: ["skills", "templates", "guides"],
  "knowledge-base": ["template"],
  kits: ["rules"],
};

const version = /CORE_VERSION = "([^"]+)"/.exec(
  readFileSync(join(here, "packages/core/src/version.ts"), "utf8"),
)?.[1];
if (!version)
  throw new Error("No CORE_VERSION in packages/core/src/version.ts");

const run = (command, args) =>
  execFileSync(command, args, { cwd: here, stdio: "inherit" });

// Everything in the folder but its git data goes; the build starts clean.
mkdirSync(out, { recursive: true });
for (const name of ["bin", "node_modules", "package.json", "README.md"])
  rmSync(join(out, name), { recursive: true, force: true });

run("npm", ["run", "build", "-w", "@software-factory/dashboard"]);

const bundled = join(out, "node_modules", "@software-factory");
// Next to the repository's own, so it finds the same types.
const tsconfig = join(here, "tsconfig.release.json");
writeFileSync(
  tsconfig,
  JSON.stringify({
    extends: "./tsconfig.json",
    compilerOptions: {
      noEmit: false,
      allowImportingTsExtensions: false,
      rewriteRelativeImportExtensions: true,
      rootDir: join(here, "packages"),
      outDir: bundled,
      declaration: false,
      sourceMap: false,
    },
    include: PACKAGES.flatMap((name) => [
      join(here, "packages", name, "src", "**", "*.ts"),
      join(here, "packages", name, "bin", "**", "*.ts"),
    ]),
    exclude: [join(here, "packages", "**", "test", "**")],
  }),
);
try {
  run("npx", ["tsc", "-p", tsconfig]);
} finally {
  rmSync(tsconfig);
}

// Each bundled package: its files, and a package.json pointing at the
// compiled code; the packages from npm it needs go to the core's own.
const external = {};
for (const name of PACKAGES) {
  const from = join(here, "packages", name);
  const own = JSON.parse(readFileSync(join(from, "package.json"), "utf8"));
  for (const asset of ASSETS[name] ?? [])
    cpSync(join(from, asset), join(bundled, name, asset), { recursive: true });
  for (const [dependency, range] of Object.entries(own.dependencies ?? {}))
    if (!dependency.startsWith("@software-factory/"))
      external[dependency] = range;
  writeFileSync(
    join(bundled, name, "package.json"),
    `${JSON.stringify(
      {
        name: own.name,
        version,
        type: "module",
        ...(own.exports ? { exports: { ".": "./src/index.js" } } : {}),
      },
      null,
      2,
    )}\n`,
  );
}
const dashboard = join(bundled, "dashboard");
cpSync(join(here, "packages", "dashboard", "dist"), join(dashboard, "dist"), {
  recursive: true,
});
writeFileSync(
  join(dashboard, "package.json"),
  `${JSON.stringify({ name: "@software-factory/dashboard", version }, null, 2)}\n`,
);

mkdirSync(join(out, "bin"), { recursive: true });
writeFileSync(
  join(out, "bin", "software-factory.js"),
  '#!/usr/bin/env node\nimport "@software-factory/server/bin/software-factory.js";\n',
);
writeFileSync(
  join(out, "package.json"),
  `${JSON.stringify(
    {
      name: "software-factory",
      version,
      description:
        "The software factory's core: the software-factory command, its dashboard and skills.",
      type: "module",
      engines: { node: ">=24" },
      bin: { "software-factory": "bin/software-factory.js" },
      // The core's own packages are bundled, so npm takes them from inside
      // the package (it bundles only what is also a dependency).
      dependencies: Object.fromEntries(
        [
          ...Object.entries(external),
          ...[...PACKAGES, "dashboard"].map((name) => [
            `@software-factory/${name}`,
            version,
          ]),
        ].sort(([a], [b]) => a.localeCompare(b)),
      ),
      bundleDependencies: [...PACKAGES, "dashboard"].map(
        (name) => `@software-factory/${name}`,
      ),
    },
    null,
    2,
  )}\n`,
);
writeFileSync(
  join(out, "README.md"),
  `# Software factory ${version}\n\nThe core, built to install from this repository: in a project,\n\n    npm install -D github:<owner>/software-factory-core#release-${version}\n\nthen \`npx software-factory\`. Built from the main branch by scripts/build-release.mjs.\n`,
);
if (!existsSync(join(out, "bin", "software-factory.js")))
  throw new Error("The release has no command.");
process.stdout.write(`Built release ${version} in ${out}\n`);
