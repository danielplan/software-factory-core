// Import rules for the app's folders (see BLUEPRINT.md and the kit's rules,
// packages/kits/rules/expo-app/conventions.md in the factory's core), one
// way: shared folders -> features -> app (routes). Run with `npx depcruise src`
// (part of `npm run lint`).
// Each area in src/features/ is named here; add a new area to the list.
const areas = '(home)';

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'prototype-through-the-switch',
      comment:
        'The app reaches the prototype (prototype/) only through the prototype switch, which a normal build leaves out (src/lib/prototype-mode.ts).',
      severity: 'error',
      from: { path: '^src/', pathNot: '^src/lib/prototype-mode\\.ts$' },
      to: { path: '^prototype/' },
    },
    {
      name: 'no-circular',
      comment: 'Files must not import each other in a circle.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'shared-knows-no-feature',
      comment:
        'The shared folders serve every area, so they know no feature and no route.',
      severity: 'error',
      from: {
        path: '^src/(api|components|hooks|lib|i18n|providers|theme)/',
      },
      to: { path: '^src/(features|app)/' },
    },
    {
      name: 'lib-has-no-screens',
      comment:
        'lib is logic without screens: it imports no component (.tsx) and nothing from components or hooks.',
      severity: 'error',
      from: { path: '^src/lib/' },
      to: { path: ['\\.tsx$', '^src/(components|hooks)/'] },
    },
    {
      name: 'theme-and-i18n-stand-alone',
      comment:
        'The theme and the translations know nothing of the data or the screens.',
      severity: 'error',
      from: { path: '^src/(theme|i18n)/' },
      to: { path: '^src/(api|components|hooks|lib|providers)/' },
    },
    {
      name: 'hooks-have-no-screens',
      comment: 'A shared hook knows no component; components use hooks.',
      severity: 'error',
      from: { path: '^src/hooks/' },
      to: { path: '^src/components/' },
    },
    {
      name: 'api-knows-no-screen',
      comment:
        'api loads and checks the data; how it is shown lives in components, hooks and lib.',
      severity: 'error',
      from: { path: '^src/api/' },
      to: { path: '^src/(components|hooks|lib|providers)/' },
    },
    {
      name: 'features-do-not-meet',
      comment:
        'An area never imports another area; areas share only through the shared folders and meet in app/.',
      severity: 'error',
      from: { path: `^src/features/${areas}/` },
      to: { path: '^src/features/', pathNot: '^src/features/$1/' },
    },
    {
      name: 'app-only-composes',
      comment: 'app/ holds the routes; nothing else imports them.',
      severity: 'error',
      from: { path: '^src/', pathNot: '^src/app/' },
      to: { path: '^src/app/' },
    },
    {
      name: 'no-orphans',
      comment:
        'Every file in src is used; a file nobody imports is dead code. Routes are found by Expo Router, browser files (*.web.ts) by the bundler.',
      severity: 'error',
      from: {
        orphan: true,
        pathNot: ['^src/app/', '\\.d\\.ts$', '\\.web\\.tsx?$'],
      },
      to: {},
    },
    {
      name: 'not-to-unresolvable',
      comment: 'Every import resolves to a file or an installed package.',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: 'no-undeclared-packages',
      comment:
        'src imports only packages listed in package.json dependencies (not devDependencies).',
      severity: 'error',
      from: { pathNot: '^prototype/' },
      to: {
        dependencyTypes: [
          'npm-no-pkg',
          'npm-unknown',
          'npm-dev',
          'npm-optional',
          'npm-peer',
        ],
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'prototype-uses-declared-packages',
      comment:
        'The prototype may use development packages (MSW), which the real app never contains, but only declared ones.',
      severity: 'error',
      from: { path: '^prototype/' },
      to: { dependencyTypes: ['npm-no-pkg', 'npm-unknown'] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['react-native', 'import', 'require', 'default', 'types'],
      mainFields: ['react-native', 'main', 'types'],
      extensions: ['.ts', '.tsx', '.ios.ts', '.js', '.mjs', '.json'],
    },
  },
};
