import { Controller, Get, Inject } from "@nestjs/common";
import type { Pool } from "pg";
import { PG_POOL } from "./database.js";

/** `/health` answers once the database answers; the launcher waits for it. */
@Controller()
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get("/health")
  async health() {
    await this.pool.query("select 1");
    return { status: "ok" };
  }
}
