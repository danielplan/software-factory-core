// The core's version: a company's factory.json says which one its factory
// is on (`core`), and `software-factory upgrade` brings it to this one,
// running the migrations of every release in between.

export const CORE_VERSION = "0.6.0";

// Where a project installs the core from: this repository, at the tag of a
// release (release-<version>, scripts/publish-release.mjs).
export const RELEASE_SOURCE = "github:danielplan/software-factory-core";

export function releaseOf(version: string): string {
  return `${RELEASE_SOURCE}#release-${version}`;
}

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
