// Products in columns, as a map: each after the products it needs.

type Node = { id: string; dependsOn: string[] };

// Each product one column after the deepest product it needs.
export function columnsOf<T extends Node>(parts: T[]): T[][] {
  const byId = new Map(parts.map((part) => [part.id, part]));
  const depth = new Map<string, number>();
  const depthOf = (part: T, seen: Set<string>): number => {
    const known = depth.get(part.id);
    if (known !== undefined) return known;
    const below = part.dependsOn
      .map((id) => byId.get(id))
      .filter((other): other is T => other !== undefined && !seen.has(other.id))
      .map((other) => depthOf(other, new Set([...seen, part.id])));
    const found = below.length === 0 ? 0 : 1 + Math.max(...below);
    depth.set(part.id, found);
    return found;
  };
  const columns: T[][] = [];
  for (const part of parts) {
    const at = depthOf(part, new Set([part.id]));
    columns[at] = [...(columns[at] ?? []), part];
  }
  return columns.filter(Boolean);
}
