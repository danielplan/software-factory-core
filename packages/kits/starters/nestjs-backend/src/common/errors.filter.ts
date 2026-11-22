import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { Response } from "express";
import { AppError } from "./app-error.js";

/** The largest request body the server reads (setup-app.ts). */
export const BODY_LIMIT_KB = 1024;

/** Express's body parser marks the errors it is safe to show with `expose`. */
type ParserError = { status: number; expose: true; message: string };

const isParserError = (value: unknown): value is ParserError =>
  value instanceof Error &&
  "expose" in value &&
  value.expose === true &&
  "status" in value &&
  typeof value.status === "number";

/** Anything thrown as a refusal with a code from the list; undefined for a server failure. */
function asRefusal(exception: unknown): AppError | undefined {
  if (exception instanceof AppError) return exception;
  if (exception instanceof NotFoundException) return new AppError("not_found");
  if (isParserError(exception))
    return exception.status === 413
      ? new AppError("body_too_large", { max_kb: BODY_LIMIT_KB })
      : new AppError("request_failed");
  // Nest's own refusals, a body that is not JSON among them.
  if (exception instanceof HttpException && exception.getStatus() < 500)
    return new AppError("request_failed");
  return undefined;
}

/**
 * Every failure answers `{ error, message, params?, fields? }`: a code from
 * error-codes.ts, its English fallback sentence, and the values a
 * translation needs. A server failure is logged and hides its details.
 */
@Catch()
export class ErrorsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const refusal = asRefusal(exception);
    if (!refusal) this.logger.error(exception);
    const error = refusal ?? new AppError("server_error");
    response.status(error.status).json({
      error: error.code,
      message: error.message,
      ...(Object.keys(error.params).length ? { params: error.params } : {}),
      ...(error.fields.length ? { fields: error.fields } : {}),
    });
  }
}
