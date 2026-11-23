import assert from "node:assert/strict";
import type { Type } from "@nestjs/common";
import {
  METHOD_METADATA,
  MODULE_METADATA,
  PATH_METADATA,
} from "@nestjs/common/constants.js";
import { Reflector } from "@nestjs/core";
import { namesCaller, routeAccess } from "../src/common/access.guard.js";
import { AppModule } from "../src/app.module.js";

// What Nest does not check by itself: every route of the backend says who may
// call it (src/common/access.decorator.ts), so none is open by mistake.

function modules(root: Type): Type[] {
  const seen = new Set<Type>();
  const visit = (module: Type) => {
    if (seen.has(module)) return;
    seen.add(module);
    const imports = (Reflect.getMetadata(MODULE_METADATA.IMPORTS, module) ??
      []) as unknown[];
    for (const imported of imports)
      if (typeof imported === "function") visit(imported as Type);
  };
  visit(root);
  return [...seen];
}

function routes() {
  return modules(AppModule).flatMap((module) =>
    (
      (Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, module) ?? []) as Type[]
    ).flatMap((controller) => {
      const prototype = controller.prototype as Record<string, unknown>;
      return Object.getOwnPropertyNames(prototype).flatMap((method) => {
        const handler = prototype[method];
        if (
          typeof handler !== "function" ||
          Reflect.getMetadata(METHOD_METADATA, handler) === undefined
        )
          return [];
        const path = String(Reflect.getMetadata(PATH_METADATA, handler));
        return [
          {
            name: `${controller.name}.${method} (${path})`,
            controller,
            handler,
          },
        ];
      });
    }),
  );
}

test("the check sees the routes", () => {
  assert.ok(routes().some((route) => route.name.includes("/health")));
});

test("every route says who may call it", () => {
  const reflector = new Reflector();
  const unnamed = routes()
    .filter(
      (route) =>
        !namesCaller(routeAccess(reflector, [route.handler, route.controller])),
    )
    .map((route) => route.name);
  assert.deepEqual(unnamed, []);
});
