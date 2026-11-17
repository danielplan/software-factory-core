// Where the Product map starts (product-page.tsx). React Flow fits the map
// in its box and centres it; a map too wide to fit at a readable zoom would
// then start with both ends cut off, the project's card among them. So a
// map wider than its box starts at its left edge, where the project is, and
// is dragged to see the rest. Kept apart from the component so it is
// checked on its own.

export type Viewport = { x: number; y: number; zoom: number };
export type Box = { x: number; y: number; width: number; height: number };

// The space kept between the box's left edge and the first card.
export const LEFT_EDGE = 24;

// The view React Flow centred (`centred`), kept when the map fits; moved
// to the left edge when the map, at that zoom, is wider than the box.
export function leftWhenWide(
  centred: Viewport,
  bounds: Box,
  width: number,
  edge = LEFT_EDGE,
): Viewport {
  const wide = bounds.width * centred.zoom + edge * 2 > width;
  if (!wide) return centred;
  return { ...centred, x: edge - bounds.x * centred.zoom };
}
