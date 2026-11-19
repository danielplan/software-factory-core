import type { NestExpressApplication } from "@nestjs/platform-express";

/** Express settings shared by the server and the tests. Call before `init()`. */
export function setupApp(app: NestExpressApplication) {
  app.disable("x-powered-by");
  app.set("etag", false);
  app.useBodyParser("json", { limit: "1mb" });
  return app;
}
