import { type ErrorCode, errorCodes } from "./error-codes.js";

export type ErrorParams = Record<string, string | number>;

/** An input field that failed its checks, named by its path and the rules it broke. */
export type FieldProblem = { field: string; rules: string[] };

const fill = (message: string, params: ErrorParams) =>
  message.replace(/\{(\w+)\}/g, (whole, name: string) =>
    String(params[name] ?? whole),
  );

/**
 * A refusal the caller can act on: a code from error-codes.ts and the values
 * its translation needs. ErrorsFilter answers it as
 * `{ error, message, params?, fields? }`.
 */
export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    readonly params: ErrorParams = {},
    readonly fields: FieldProblem[] = [],
  ) {
    const definition = errorCodes[code];
    super(fill(definition.message, params));
    this.status = definition.status;
  }
}
