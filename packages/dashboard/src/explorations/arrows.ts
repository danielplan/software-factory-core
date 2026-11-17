// The arrows on an exploration's canvas, measured once the cards are laid
// out: from the problem to the choice, and from each option to its
// prototype (green for the agreed one). Each is a soft curve between the
// right edge of one card and the left edge of the other.

export type Box = { left: number; right: number; top: number; height: number };
export type Arrow = { d: string; agreed: boolean };

// Where an arrow leaves or arrives: the middle of the card's first 80px.
function middleOf(box: Box): number {
  return box.top + Math.min(box.height / 2, 40);
}

export function curve(from: [number, number], to: [number, number]): string {
  const [x1, y1] = from;
  const [x2, y2] = to;
  return `M${String(x1)} ${String(y1)} C ${String(x1 + 28)} ${String(y1)}, ${String(x2 - 28)} ${String(y2)}, ${String(x2)} ${String(y2)}`;
}

export function arrowsOf(boxes: {
  problem: Box | null;
  choice: Box | null;
  options: Record<string, Box>;
  prototypes: Record<string, { box: Box; agreed: boolean }>;
}): Arrow[] {
  const { problem, choice } = boxes;
  const arrows: Arrow[] = [];
  if (problem && choice)
    arrows.push({
      d: curve(
        [problem.right, middleOf(problem)],
        [choice.left, middleOf(choice)],
      ),
      agreed: false,
    });
  for (const [key, made] of Object.entries(boxes.prototypes)) {
    const option = boxes.options[key];
    if (!option || !choice) continue;
    arrows.push({
      d: curve(
        [choice.right, option.top + option.height / 2],
        [made.box.left, middleOf(made.box)],
      ),
      agreed: made.agreed,
    });
  }
  return arrows;
}
