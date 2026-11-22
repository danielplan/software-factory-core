import { Controller, Get, Inject } from "@nestjs/common";
import type { Pool } from "pg";
import { Public } from "../common/access.decorator.js";
import { PG_POOL } from "./database.js";

/**
 * `/health` (outside `/api`) answers once the database answers; the factory
 * waits for it before it calls the backend started.
 */
@Controller()
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Public()
  @Get("/health")
  async health() {
    await this.pool.query("select 1");
    return { status: "ok" };
  }
}
