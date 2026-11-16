// Node prints "ExperimentalWarning: SQLite is an experimental feature" the
// first time node:sqlite (where the records live) is loaded. The factory
// relies on it on purpose, so that one warning is not shown; every other
// warning is, as before. It is set before node:sqlite loads (the command's
// first step).

const SQLITE = /^SQLite is an experimental feature/;

type Warns = { emitWarning: NodeJS.Process["emitWarning"] };

export function quietSqliteWarning(target: Warns = process): void {
  const emit = target.emitWarning.bind(target) as (...args: unknown[]) => void;
  target.emitWarning = (warning: string | Error, ...rest: unknown[]) => {
    const message = typeof warning === "string" ? warning : warning.message;
    if (!SQLITE.test(message)) emit(warning, ...rest);
  };
}
