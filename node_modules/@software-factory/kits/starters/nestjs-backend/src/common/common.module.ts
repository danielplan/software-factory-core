import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_PIPE } from "@nestjs/core";
import { AccessGuard } from "./access.guard.js";
import { validateEnvironment } from "./environment.js";
import { ErrorsFilter } from "./errors.filter.js";
import { validationPipe } from "./validation.js";

/** Settings, who may call each route, input checks and error answers: what every feature shares. */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: true,
      validate: validateEnvironment,
      skipProcessEnv: true,
    }),
  ],
  providers: [
    { provide: APP_GUARD, useClass: AccessGuard },
    { provide: APP_PIPE, useFactory: validationPipe },
    { provide: APP_FILTER, useClass: ErrorsFilter },
  ],
  exports: [ConfigModule],
})
export class CommonModule {}
