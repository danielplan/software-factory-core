// The boxes a person placed by hand stay where they are; the layout
// (layout.ts) puts the others in columns without looking at them, so one
// could land under a placed box. This second pass keeps each box in its
// column and its order there, and moves down the ones that would overlap a
// placed box, or a box already moved, until they are clear of it. Kept
// apart from the layout kernel so it is checked on its own.

type Point = { x: number; y: number };
type Box = { id: string; width: number; height: number };

// The room kept between two boxes, as the layout keeps it.
export const GAP = 40;

type Rect = { x: number; y: number; width: number; height: number };

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width + GAP &&
  b.x < a.x + a.width + GAP &&
  a.y < b.y + b.height + GAP &&
  b.y < a.y + a.height + GAP;

// Where each box goes: a placed box where it was placed, every other one
// where the layout put it, or lower in its column when that is taken.
export function aroundPlaced(
  boxes: Box[],
  laidOut: Map<string, Point>,
  placed: Map<string, Point>,
): Map<string, Point> {
  const at = new Map<string, Point>();
  const taken: Rect[] = [];
  for (const box of boxes) {
    const place = placed.get(box.id);
    if (!place) continue;
    at.set(box.id, place);
    taken.push({ ...box, ...place });
  }
  const free = boxes
    .flatMap((box) => {
      const place = laidOut.get(box.id);
      return !placed.has(box.id) && place ? [{ ...box, ...place }] : [];
    })
    .sort((a, b) => a.x - b.x || a.y - b.y);
  for (const box of free) {
    let y = box.y;
    for (
      let under = taken.filter((one) => overlaps({ ...box, y }, one));
      under.length > 0;
      under = taken.filter((one) => overlaps({ ...box, y }, one))
    )
      y = Math.max(...under.map((one) => one.y + one.height)) + GAP;
    at.set(box.id, { x: box.x, y });
    taken.push({ ...box, y });
  }
  return at;
}
