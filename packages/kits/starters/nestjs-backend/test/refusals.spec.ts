import assert from "node:assert/strict";
import { Body, Controller, Get, Module, Post } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { Type } from "class-transformer";
import {
  IsInt,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Public } from "../src/common/access.decorator.js";
import { CommonModule } from "../src/common/common.module.js";
import { errorCodes } from "../src/common/error-codes.js";
import { setupApp } from "../src/setup-app.js";
import { inject } from "./helpers.js";

// How the backend refuses: every refusal is a code from error-codes.ts with
// its English fallback; input is checked by class; a route that names nobody
// who may call it is closed. Made-up routes, for these tests only.

class Place {
  @IsString()
  @MinLength(1)
  city: string;
}

class NewThing {
  @IsString()
  @MinLength(1)
  name: string;

  @ValidateNested()
  @Type(() => Place)
  place: Place;

  @IsInt()
  @Min(1)
  count: number;
}

@Public()
@Controller("things")
class ThingsController {
  @Post()
  add(@Body() thing: NewThing) {
    return { name: thing.name, count: thing.count, city: thing.place.city };
  }

  @Get("broken")
  broken() {
    throw new Error("secret detail");
  }
}

@Controller("closed")
class ClosedController {
  @Get()
  hidden() {
    return { seen: true };
  }
}

@Module({
  imports: [CommonModule],
  controllers: [ThingsController, ClosedController],
})
class ThingsModule {}

async function thingsApp() {
  process.env.DATABASE_URL ??= "postgres://unused@127.0.0.1:1/unused";
  const module = await Test.createTestingModule({
    imports: [ThingsModule],
  }).compile();
  const app = setupApp(module.createNestApplication<NestExpressApplication>());
  await app.init();
  onTestFinished(() => app.close());
  return app;
}

test("checked input passes, and fields the class does not list are dropped", async () => {
  const app = await thingsApp();
  const response = await inject(app, {
    method: "POST",
    url: "/api/things",
    payload: { name: "Lamp", count: 2, place: { city: "Turin" }, extra: "x" },
  });
  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.json(), { name: "Lamp", count: 2, city: "Turin" });
});

test("a failed input check names each field and the rules it broke", async () => {
  const app = await thingsApp();
  const response = await inject(app, {
    method: "POST",
    url: "/api/things",
    payload: { name: "", count: 0, place: { city: "" } },
  });
  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json(), {
    error: "invalid_request",
    message: errorCodes.invalid_request.message,
    fields: [
      { field: "name", rules: ["minLength"] },
      { field: "place.city", rules: ["minLength"] },
      { field: "count", rules: ["min"] },
    ],
  });
});

test("a body that is not JSON is refused with a code", async () => {
  const app = await thingsApp();
  const json = { "content-type": "application/json" };
  const broken = await inject(app, {
    method: "POST",
    url: "/api/things",
    headers: json,
    payload: "{ not json",
  });
  assert.equal(broken.statusCode, 400);
  assert.equal(broken.json<{ error: string }>().error, "request_failed");
});

test("a refusal answers its code, its fallback and the values a translation needs", async () => {
  const app = await thingsApp();
  const response = await inject(app, {
    method: "POST",
    url: "/api/things",
    headers: { "content-type": "application/json" },
    payload: JSON.stringify({ name: "x".repeat(1_100_000), count: 1 }),
  });
  assert.equal(response.statusCode, 413);
  assert.deepEqual(response.json(), {
    error: "body_too_large",
    message: "The request body is larger than 1024 KB.",
    params: { max_kb: 1024 },
  });
});

test("a server failure is logged and hides its details", async () => {
  const app = await thingsApp();
  const response = await inject(app, "/api/things/broken");
  assert.equal(response.statusCode, 500);
  assert.doesNotMatch(response.body, /secret detail/);
  assert.equal(response.json<{ error: string }>().error, "server_error");
});

test("a route that names nobody who may call it is closed", async () => {
  const app = await thingsApp();
  const response = await inject(app, "/api/closed");
  assert.equal(response.statusCode, 403);
  assert.equal(response.json<{ error: string }>().error, "route_closed");
});

test("every fallback sentence names only simple params", () => {
  for (const [code, { message }] of Object.entries(errorCodes))
    for (const [, name] of message.matchAll(/\{(\w+)\}/g))
      assert.match(name ?? "", /^[a-z_]+$/, code);
});
