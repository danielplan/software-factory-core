// The core's version: a company's factory.json says which one its factory
// is on (`core`), and `software-factory upgrade` brings it to this one,
// running the migrations of every release in between.

export const CORE_VERSION = "0.2.0";

// Before a factory said its version, it was on the first one.
export const FIRST_VERSION = "0.1.0";

// Negative when a comes before b, positive after, 0 when the same
// (major.minor.patch).
export function compareVersions(a: string, b: string): number {
  const parts = (version: string) =>
    version.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) {
    const difference = (x[i] ?? 0) - (y[i] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}
