// Claude's usage limit: a run that stops because the account hit it is a
// pause, not a failure. The factory waits until the limit resets and then
// carries on by itself. Claude says when it resets in the owner's words
// ("You've hit your session limit · resets 7:50pm (Europe/Rome)") or, in
// older versions, as a time stamp ("Claude AI usage limit reached|1763491800").

const LIMIT = /hit your \w*\s?limit|usage limit reached|rate[_ ]limit/i;
// "resets 7:50pm (Europe/Rome)", "resets 19:50", "resets 7pm".
const RESETS = /resets (?:at )?(\d{1,2})(?::(\d\d))? ?(am|pm)?/i;
const ZONE = /\(([\w/+-]+)\)/;
const STAMP = /\|(\d{10})\b/;
// Waited when Claude does not say when it resets, and added after the reset
// so the first try does not land a moment too early.
const UNKNOWN_MS = 60 * 60_000;
const MARGIN_MS = 2 * 60_000;

// When the factory may try again, or null when the error is not the limit.
export function usageLimitUntil(error: string, now: Date): Date | null {
  if (!LIMIT.test(error)) return null;
  const stamp = STAMP.exec(error);
  if (stamp) return new Date(Number(stamp[1]) * 1000 + MARGIN_MS);
  const said = RESETS.exec(error);
  if (!said) return new Date(now.getTime() + UNKNOWN_MS);
  let hour = Number(said[1]) % 12;
  const half = said[3]?.toLowerCase();
  if (half === "pm") hour += 12;
  if (!half) hour = Number(said[1]);
  const minute = Number(said[2] ?? "0");
  const at = nextTime(hour, minute, ZONE.exec(error)?.[1], now);
  return new Date(at.getTime() + MARGIN_MS);
}

// The next moment after now when the clock in that time zone (the
// computer's own when none) shows hour:minute.
function nextTime(
  hour: number,
  minute: number,
  zone: string | undefined,
  now: Date,
): Date {
  for (let day = 0; day <= 1; day++) {
    const local = partsIn(now, zone);
    const wall = Date.UTC(
      local.year,
      local.month - 1,
      local.day + day,
      hour,
      minute,
    );
    const guess = new Date(wall - offsetAt(new Date(wall), zone));
    // Near a clock change the offset differs at the result: once more.
    const at = new Date(wall - offsetAt(guess, zone));
    if (at.getTime() > now.getTime()) return at;
  }
  return new Date(now.getTime() + UNKNOWN_MS);
}

type Parts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function partsIn(date: Date, zone: string | undefined): Parts {
  let format: Intl.DateTimeFormat;
  try {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
  } catch {
    return partsIn(date, undefined);
  }
  const value = (type: string) =>
    Number(format.formatToParts(date).find((p) => p.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

// How far the zone's clock is ahead of UTC at that moment, in ms.
function offsetAt(date: Date, zone: string | undefined): number {
  const p = partsIn(date, zone);
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wall - Math.floor(date.getTime() / 1000) * 1000;
}

// The time in the owner's words, in the zone Claude named.
export function clockOf(date: Date, zone?: string): string {
  try {
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: zone,
    });
  } catch {
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

// Claude's usage limit stopped a run: the job ends, and the card waits.
export class Paused extends Error {
  readonly until: Date;
  constructor(until: Date) {
    super(`Paused until ${until.toISOString()}`);
    this.until = until;
  }
}

// The run's error as a pause when it is Claude's usage limit.
export function pauseOn(error: string | undefined, now: Date): void {
  const until = usageLimitUntil(error ?? "", now);
  if (until) throw new Paused(until);
}

export function pausedText(until: Date): string {
  return `Paused: Claude's usage limit is reached. The factory carries on with this card by itself once it resets, at about ${clockOf(until)}. Nothing to do; a comment here makes it try sooner.`;
}
