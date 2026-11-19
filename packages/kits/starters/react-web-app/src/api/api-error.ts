import { z } from "zod";

type ErrorParams = Readonly<Record<string, string | number>>;

// Refusals that the app itself recognises, when there is no backend answer to
// read a code from.
export const clientErrorCodes = [
  // The data could not be fetched at all.
  "network_unreachable",
  // The backend answered with an error the app cannot read.
  "service_unavailable",
  // The backend's data does not have the expected shape.
  "invalid_response",
] as const;
type ClientErrorCode = (typeof clientErrorCodes)[number];

// Every request of the app fails with an ApiError: the backend's code and the
// values its translation needs. `fallback` is the backend's English sentence,
// shown only for a code the app does not know.
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly params: ErrorParams;
  readonly fallback: string | undefined;

  constructor(
    answer: {
      status: number;
      code: string;
      params?: ErrorParams;
      message?: string;
    },
    options?: ErrorOptions,
  ) {
    super(answer.message ?? answer.code, options);
    this.name = "ApiError";
    this.status = answer.status;
    this.code = answer.code;
    this.params = answer.params ?? {};
    this.fallback = answer.message;
  }
}

export function clientError(
  code: ClientErrorCode,
  status: number,
  cause?: unknown,
): ApiError {
  return new ApiError({ status, code }, { cause });
}

// The backend's refusal: { error, message, params? }, as the kit's
// backends send it.
const refusalSchema = z.object({
  error: z.string().min(1),
  message: z.string().optional(),
  params: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

// The error for a refused request, from the answer's body. Without a
// readable refusal, the service is not working as expected.
export function refusal(status: number, body: unknown): ApiError {
  const answer = refusalSchema.safeParse(body);
  if (!answer.success) return clientError("service_unavailable", status);
  return new ApiError({
    status,
    code: answer.data.error,
    params: answer.data.params,
    message: answer.data.message,
  });
}
