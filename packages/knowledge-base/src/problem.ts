// One thing a check found wrong: the file (relative to the root checked), the
// line when known, and what is wrong in plain words.
// A hint is advice, not a fault: it is said but doesn't fail the check (a page
// that has grown long).
export type Problem = {
  file: string;
  line?: number;
  message: string;
  hint?: boolean;
};
