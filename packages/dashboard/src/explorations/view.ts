// The board in small, for an exploration's preview in the list: its
// things in columns, each one column past the things that point to it (the
// longest way along the arrows), at most four in a column.

type Small = { id: string; kind: string; agreed: boolean };

export function columnsOf(
  things: Small[],
  links: { from: string; to: string }[],
): Small[][] {
  const depth = new Map(things.map((thing) => [thing.id, 0]));
  // As many rounds as there are things: enough for the longest way, and
  // a loop cannot go on for ever.
  for (let round = 0; round < things.length; round++)
    for (const link of links) {
      const from = depth.get(link.from);
      const to = depth.get(link.to);
      if (from !== undefined && to !== undefined && to < from + 1)
        depth.set(link.to, Math.min(from + 1, things.length));
    }
  const columns: Small[][] = [];
  for (const thing of things) {
    const at = depth.get(thing.id) ?? 0;
    columns[at] = [...(columns[at] ?? []), thing];
  }
  return columns.filter(Boolean).map((column) => column.slice(0, 4));
}
