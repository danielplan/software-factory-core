import { ValidationPipe, type ValidationError } from "@nestjs/common";
import { AppError, type FieldProblem } from "./app-error.js";

function problems(errors: ValidationError[], parent = ""): FieldProblem[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.keys(error.constraints ?? {});
    return [
      ...(own.length ? [{ field, rules: own }] : []),
      ...problems(error.children ?? [], field),
    ];
  });
}

/**
 * Checks every request body, query and parameter that is a class. Fields the
 * class does not list are dropped; a failed check answers 400
 * `invalid_request` with `fields`: each failing field and the rules it broke.
 */
export const validationPipe = () =>
  new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors) =>
      new AppError("invalid_request", {}, problems(errors)),
  });
