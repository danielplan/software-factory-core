import { SetMetadata } from "@nestjs/common";

/**
 * Who may call a route, said on the route or its controller. AccessGuard
 * refuses a route that names nobody, so a new route stays closed until it says
 * who it is for, and a test checks that every route names someone. Sign-in
 * adds its own kinds here (signed-in people, an owner of the record) with
 * their checks in AccessGuard.
 */
export type RouteAccess = { public?: true };

export const ROUTE_ACCESS = {
  public: "access:public",
} as const satisfies Record<keyof RouteAccess, string>;

/** Anyone, without signing in. */
export const Public = () => SetMetadata(ROUTE_ACCESS.public, true);
