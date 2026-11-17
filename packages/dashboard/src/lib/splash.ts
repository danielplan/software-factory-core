// The opening's timing (components/splash.tsx): it shows at least a moment,
// so it is never a flash, then fades away; shorter and still with reduced
// motion. Kept apart from the component so it is checked on its own.

// The shortest the opening shows, and how long it takes to fade away.
export const AT_LEAST_MS = 1600;
const AWAY_MS = 800;
const REDUCED_MS = { least: 600, away: 260 };

// How long to wait before it fades away, and how long fading takes.
export function openingTimes(
  shownMs: number,
  reduced: boolean,
): { wait: number; part: number } {
  const least = reduced ? REDUCED_MS.least : AT_LEAST_MS;
  return {
    wait: Math.max(0, least - shownMs),
    part: reduced ? REDUCED_MS.away : AWAY_MS,
  };
}
