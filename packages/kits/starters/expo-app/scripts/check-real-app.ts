/**
 * npm run check:prototypes (part of npm run verify): the real app contains no
 * prototype code. It builds the app as a normal build does (no
 * EXPO_PUBLIC_PROTOTYPE) and looks through the JavaScript for words that
 * only the prototype and its pretend backend have. The prototype switch
 * (src/lib/prototype-mode.ts) must leave them out.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runExpo } from './expo.ts';

// From prototype/start.ts and from MSW, which only the prototype uses.
const markers = ['factory-prototype', '[MSW]'];

/** The prototype words found in each script of the built app. */
function prototypeWords(out: string) {
  return readdirSync(join(out, '_expo'), { recursive: true })
    .map(String)
    .filter((path) => path.endsWith('.js'))
    .flatMap((path) => {
      const code = readFileSync(join(out, '_expo', path), 'utf8');
      return markers
        .filter((marker) => code.includes(marker))
        .map((marker) => `${path}: ${marker}`);
    });
}

const out = mkdtempSync(join(tmpdir(), 'new-phone-app-real-app-'));
// Empty settings are the same as none, whatever the shell has.
const status = runExpo(['export', '--platform', 'web', '--output-dir', out], {
  EXPO_PUBLIC_PROTOTYPE: '',
  PROTOTYPE_BASE_URL: '',
});
const found = status === 0 ? prototypeWords(out) : [];
rmSync(out, { recursive: true, force: true });
if (status !== 0) process.exit(status);
if (found.length > 0) {
  console.error('The real app contains prototype code:', found);
  process.exit(1);
}
console.log('The real app contains no prototype code.');
