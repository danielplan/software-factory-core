/**
 * Every refusal this backend can answer, one meaning per code, with its HTTP
 * status and an English fallback sentence. The apps translate the code (and
 * its `params`); the sentence is only for callers that do not translate.
 * `{name}` in a message is filled from the refusal's params. A new meaning gets
 * a new code; after changing the list, `npm run codes:export` writes
 * error-codes.json for the apps, and `npm run codes:check` (in verify) fails
 * while it is out of date.
 */
// Loaded by Node directly (scripts/export-codes.ts), so it imports nothing.
export const errorCodes = {
  invalid_request: { status: 400, message: "Check the data you sent." },
  body_too_large: {
    status: 413,
    message: "The request body is larger than {max_kb} KB.",
  },
  not_found: { status: 404, message: "Address not found." },
  request_failed: { status: 400, message: "The request is not valid." },
  route_closed: {
    status: 403,
    message: "Nobody may call this address yet.",
  },
  server_error: {
    status: 500,
    message: "The server could not complete the request.",
  },
} as const satisfies Record<string, { status: number; message: string }>;

export type ErrorCode = keyof typeof errorCodes;
