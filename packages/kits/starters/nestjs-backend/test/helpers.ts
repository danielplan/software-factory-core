import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { inject as injectRequest, type InjectOptions } from "light-my-request";
import { AppModule } from "../src/app.module.js";
import { PG_POOL } from "../src/database/database.js";
import { setupApp } from "../src/setup-app.js";

/** The whole backend, with a test double for the database pool when one is given. */
export async function buildTestApp(pool?: unknown) {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  if (pool) builder.overrideProvider(PG_POOL).useValue(pool);
  const module = await builder.compile();
  const app = setupApp(module.createNestApplication<NestExpressApplication>());
  await app.init();
  return app;
}

/** Sends a request to the app without opening a port. */
export function inject(
  app: NestExpressApplication,
  options: InjectOptions | string,
) {
  return injectRequest(
    app.getHttpAdapter().getInstance() as Parameters<typeof injectRequest>[0],
    options,
  );
}
