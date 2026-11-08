// A request the server will not do, with why in plain words (answered 409).
export class Refused extends Error {}

// Refused when any value was, each with why.
export function refuseAny(refused: Record<string, string>): void {
  const wrong = Object.entries(refused).map(([key, why]) => `${key}: ${why}`);
  if (wrong.length > 0) throw new Refused(wrong.join(" · "));
}
