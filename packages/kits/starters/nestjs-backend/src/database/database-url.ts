// Loaded by Node directly too (scripts/), so it imports nothing.

/**
 * The address of another database on the same server: `name` in place of the
 * one `url` names; `url` itself without a name. A working copy of the factory
 * sets DATABASE_NAME, so its backend keeps its data apart from the owner's.
 */
export function withDatabaseName(url: string, name?: string): string {
  if (!name) return url;
  const address = new URL(url);
  address.pathname = `/${encodeURIComponent(name)}`;
  return address.toString();
}
