import { plainToInstance, Transform, Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  validateSync,
} from "class-validator";
import { withDatabaseName } from "../database/database-url.js";

const emptyAsMissing = Transform(({ value }: { value: unknown }) =>
  value === "" ? undefined : value,
);

/**
 * The settings in `.env`, checked once at start-up (`.env.example` lists them).
 * DATABASE_URL names this backend's own PostgreSQL database, on whichever
 * server the product uses; DATABASE_NAME, when set, names another database on
 * that server (a working copy's own, given by the factory).
 */
export class Environment {
  @Matches(/^postgres(ql)?:\/\//)
  DATABASE_URL: string;

  @emptyAsMissing
  @IsOptional()
  @Matches(/^[\w-]+$/)
  DATABASE_NAME?: string;

  // Explicit, because the test runner's compiler leaves out the type information.
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  HOST: string = "127.0.0.1";
}

export function validateEnvironment(values: Record<string, unknown>) {
  const environment = plainToInstance(Environment, values, {
    enableImplicitConversion: true,
  });
  const problems = validateSync(environment).flatMap((error) =>
    Object.values(error.constraints ?? {}),
  );
  if (problems.length) throw new Error(`Check .env: ${problems.join("; ")}`);
  environment.DATABASE_URL = withDatabaseName(
    environment.DATABASE_URL,
    environment.DATABASE_NAME,
  );
  return environment;
}
