import "reflect-metadata";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module.js";
import type { Environment } from "./common/environment.js";
import { setupApp } from "./setup-app.js";

const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  bodyParser: false,
});
setupApp(app);
app.enableShutdownHooks();
const config = app.get<ConfigService<Environment, true>>(ConfigService);
await app.listen(
  config.get("PORT", { infer: true }),
  config.get("HOST", { infer: true }),
);
