// The board in small, for an exploration's preview in the list: the part of
// the whiteboard its things cover, so the whole board fits the preview.

type Place = { x: number; y: number };

// The area the things cover (each of the given size), with a margin around.
export function areaOf(
  places: Place[],
  size: { width: number; height: number },
  margin = 16,
): { x: number; y: number; width: number; height: number } {
  if (places.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const left = Math.min(...places.map((p) => p.x));
  const top = Math.min(...places.map((p) => p.y));
  const right = Math.max(...places.map((p) => p.x + size.width));
  const bottom = Math.max(...places.map((p) => p.y + size.height));
  return {
    x: left - margin,
    y: top - margin,
    width: right - left + 2 * margin,
    height: bottom - top + 2 * margin,
  };
}
