import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROUTE_ACCESS, type RouteAccess } from "./access.decorator.js";
import { AppError } from "./app-error.js";

/** What a route's access decorators say, read from the handler and then its controller. */
export function routeAccess(
  reflector: Reflector,
  targets: Parameters<Reflector["getAllAndOverride"]>[1],
): RouteAccess {
  const access: RouteAccess = {};
  for (const [name, key] of Object.entries(ROUTE_ACCESS)) {
    const value: unknown = reflector.getAllAndOverride(key, targets);
    if (value !== undefined) Object.assign(access, { [name]: value });
  }
  return access;
}

/** Whether the route names anyone who may call it. */
export const namesCaller = (access: RouteAccess) => Boolean(access.public);

/** Every route, before it runs: refused with `route_closed` unless it names who may call it. */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const access = routeAccess(this.reflector, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (access.public) return true;
    throw new AppError("route_closed");
  }
}
