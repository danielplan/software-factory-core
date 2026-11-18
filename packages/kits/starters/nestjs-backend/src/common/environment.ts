import { plainToInstance, Type } from "class-transformer";
import {
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
  validateSync,
} from "class-validator";

/**
 * The settings in `.env`, checked once at start-up. DATABASE_URL names this
 * backend's own PostgreSQL database, on whichever server the product uses
 * (.env.example); without it, a local database named after the product.
 */
export class Environment {
  @Matches(/^postgres(ql)?:\/\//)
  DATABASE_URL: string = "postgres://127.0.0.1:5432/new-backend";

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
  return environment;
}
