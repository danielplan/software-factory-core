import { Global, Module, ValidationPipe } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_PIPE } from "@nestjs/core";
import { validateEnvironment } from "./environment.js";

/** Settings and input checks that every feature shares. */
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
    {
      provide: APP_PIPE,
      // A failed check answers 400; fields the class does not list are dropped.
      useFactory: () =>
        new ValidationPipe({ whitelist: true, transform: true }),
    },
  ],
  exports: [ConfigModule],
})
export class CommonModule {}
