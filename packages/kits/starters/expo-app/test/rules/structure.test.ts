import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// The app's structure (see BLUEPRINT.md): Expo Router's routes in app/, the
// shared folders (api, components, hooks, lib, i18n, providers, theme), one
// folder per area in features/; plain file names, one component per .tsx
// file named after the file, and colours only in the theme. Import rules
// live in .dependency-cruiser.cjs.

const root = join(__dirname, '../..');
const source = join(root, 'src');

function sourceFiles(): string[] {
  return readdirSync(source, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) =>
      relative(source, join(entry.parentPath, entry.name)).replaceAll(
        '\\',
        '/',
      ),
    );
}

const read = (path: string) => readFileSync(join(source, path), 'utf8');
const fileName = (path: string) => path.split('/').pop() ?? '';
// A browser's version of a file (Expo's platform files, name.web.ts) is
// named after the file it replaces.
const baseName = (path: string) =>
  fileName(path).replace(/(\.web)?\.(tsx?)$/, '');
const pascal = (name: string) =>
  name.replace(/(^|-)([a-z0-9])/g, (_match, _dash, letter: string) =>
    letter.toUpperCase(),
  );
const camel = (name: string) =>
  name.replace(/-([a-z0-9])/g, (_match, letter: string) =>
    letter.toUpperCase(),
  );

// Routes follow Expo Router's names: _layout, [id], (group).
const route = /^app\//;
// Translations are JSON files, one per language and area.
const translation = /^i18n\/locales\/[a-z]{2}\/[a-z]+(-[a-z]+)*\.json$/;

test('files are named in lowercase words with dashes, with no catch-all names', () => {
  const named = /^[a-z][a-z0-9]*(-[a-z0-9]+)*(\.schema)?(\.web)?\.(ts|tsx)$/;
  const catchAll = /^(utils|helpers|common|misc|styles|types|index)\./;
  const wrong = sourceFiles().filter(
    (path) =>
      !route.test(path) &&
      !translation.test(path) &&
      (!named.test(fileName(path)) || catchAll.test(fileName(path))),
  );
  expect(wrong).toEqual([]);
});

test('a .tsx file outside app/ defines at most one component, named after the file', () => {
  const component =
    /^(?:export )?(?:function|const) ([A-Z]\w*)\s*(?:<|\(|=\s*\()/gm;
  const wrong = sourceFiles()
    .filter((path) => path.endsWith('.tsx') && !route.test(path))
    .flatMap((path) => {
      const names = [...read(path).matchAll(component)].map(
        (match) => match[1],
      );
      const expected = pascal(baseName(path));
      return names.length === 0 || (names.length === 1 && names[0] === expected)
        ? []
        : [`${path}: ${names.join(', ')}`];
    });
  expect(wrong).toEqual([]);
});

test('a hook file exports the hook it is named after', () => {
  const wrong = sourceFiles()
    .filter((path) => /^use-.*\.ts$/.test(fileName(path)))
    .filter(
      (path) =>
        !new RegExp(`export function ${camel(baseName(path))}[(<]`).test(
          read(path),
        ),
    );
  expect(wrong).toEqual([]);
});

test('a route file only shows a screen; layouts may set up navigation', () => {
  const wrong = sourceFiles()
    .filter((path) => route.test(path) && fileName(path) !== '_layout.tsx')
    .filter((path) => read(path).split('\n').length > 15);
  expect(wrong).toEqual([]);
});

test('every feature folder is an area named in the import rules', () => {
  const rules = readFileSync(join(root, '.dependency-cruiser.cjs'), 'utf8');
  const areas = /const areas =\s*'\(([^)]+)\)'/.exec(rules)?.[1]?.split('|');
  expect(areas).toBeDefined();
  const known = new Set(areas);
  const folders = readdirSync(join(source, 'features'), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  expect(folders.filter((folder) => !known.has(folder))).toEqual([]);
  expect([...known].filter((folder) => !folders.includes(folder))).toEqual([]);
});

test('a browser file sits next to the phone file it replaces', () => {
  const files = new Set(sourceFiles());
  const wrong = [...files].filter(
    (path) => path.includes('.web.') && !files.has(path.replace('.web.', '.')),
  );
  expect(wrong).toEqual([]);
});

// Where each kind of file may live.
const places: readonly RegExp[] = [
  /^app\/.+\.tsx$/,
  /^api\/[^/]+\.ts$/,
  /^components\/(forms\/)?[^/]+\.tsx$/,
  /^hooks\/use-[^/]+\.ts$/,
  /^lib\/[^/]+\.ts$/,
  /^i18n\/[^/]+\.ts$/,
  translation,
  /^providers\/[^/]+\.tsx?$/,
  /^theme\/[^/]+\.ts$/,
  /^features\/[^/]+\/components\/[^/]+\.tsx$/,
  /^features\/[^/]+\/hooks\/use-[^/]+\.ts$/,
  /^features\/[^/]+\/(?!use-)[^/]+\.ts$/,
];

test('every file sits in a folder meant for its kind', () => {
  const wrong = sourceFiles().filter(
    (path) => !places.some((place) => place.test(path)),
  );
  expect(wrong).toEqual([]);
});

test('colours are written only in the theme', () => {
  const colour = /#[0-9a-f]{3,8}\b|\brgba?\(/i;
  const wrong = sourceFiles()
    .filter((path) => /\.tsx?$/.test(path) && !path.startsWith('theme/'))
    .filter((path) => colour.test(read(path)));
  expect(wrong).toEqual([]);
});
