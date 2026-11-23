// A stroke as a smooth line, and a card's marks as a picture: what Doodle
// is given, because a stroke on its own is only a trail of dots with no
// meaning.

import {
  type Box,
  type Mark,
  type Own,
  type Point,
  type Sketch,
  sketchBox,
  type Target,
} from "./own";

// A smooth line through the points, as SVG path data.
export function pathOf(points: readonly Point[]): string {
  const [first, ...rest] = points;
  if (!first) return "";
  const at = (p: Point) => `${String(p[0])} ${String(p[1])}`;
  if (rest.length === 0) return `M${at(first)}l0.1 0`;
  let d = `M${at(first)}`;
  rest.forEach((p, i) => {
    const next = rest[i + 1];
    d += next
      ? ` Q${at(p)} ${at([(p[0] + next[0]) / 2, (p[1] + next[1]) / 2])}`
      : ` L${at(p)}`;
  });
  return d;
}

const LONGEST_SIDE = 1600;
const BLUE = "#3b6df0";

// The card's marks (each from the card's corner) on a white ground, at the
// card's size and place: `box` is the card's box and `corner` the corner
// the marks are kept from, both on the board. Null where the page cannot
// draw (no canvas) or there is nothing to draw on.
export function cardPicture(
  marks: readonly (readonly Point[])[],
  box: Box,
  corner: Point,
): string | null {
  if (typeof document === "undefined" || box.width <= 0 || box.height <= 0)
    return null;
  const scale = Math.min(2, LONGEST_SIDE / Math.max(box.width, box.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(box.width * scale));
  canvas.height = Math.max(1, Math.round(box.height * scale));
  const paint = canvas.getContext("2d");
  if (!paint) return null;
  paint.fillStyle = "#ffffff";
  paint.fillRect(0, 0, canvas.width, canvas.height);
  paint.scale(scale, scale);
  paint.translate(corner[0] - box.x, corner[1] - box.y);
  paint.strokeStyle = BLUE;
  paint.lineWidth = 3;
  paint.lineCap = "round";
  paint.lineJoin = "round";
  for (const points of marks) paint.stroke(new Path2D(pathOf(points)));
  return canvas.toDataURL("image/png");
}

// The corner a card's marks are kept from.
function cornerOf(sketch?: Sketch, target?: Target): Point | null {
  if (sketch) return [sketch.place.x, sketch.place.y];
  if (target) return [target.ox, target.oy];
  return null;
}

// The picture of a card with these marks on it: a sketch card as big as the
// marks make it, another card at its own size.
export function pictureOfCard(
  own: Own,
  targets: readonly Target[],
  card: string,
  marks: readonly Mark[],
): string | null {
  const sketch = own.sketches.find((one) => one.id === card);
  const target = targets.find((one) => one.id === card);
  const box = sketch ? sketchBox(sketch, [...marks], null) : target?.box;
  const corner = cornerOf(sketch, target);
  if (!box || !corner) return null;
  return cardPicture(
    marks.map((one) => one.points),
    box,
    corner,
  );
}
