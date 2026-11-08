// One thing a check found wrong: the file (relative to the root checked), the
// line when known, and what is wrong in plain words.
export type Problem = { file: string; line?: number; message: string };
