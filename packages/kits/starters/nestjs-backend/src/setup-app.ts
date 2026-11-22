import type { NestExpressApplication } from "@nestjs/platform-express";
import { BODY_LIMIT_KB } from "./common/errors.filter.js";

/**
 * Express settings shared by the server and the tests. Call before `init()`.
 * Every route answers under `/api` (the web apps send `/api/...` to it), except
 * `/health`, which the factory asks.
 */
export function setupApp(app: NestExpressApplication) {
  app.disable("x-powered-by");
  app.set("etag", false);
  app.useBodyParser("json", { limit: `${BODY_LIMIT_KB}kb` });
  app.setGlobalPrefix("api", { exclude: ["health"] });
  return app;
}
