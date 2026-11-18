import { Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import type { Environment } from "../common/environment.js";
import { DRIZZLE, PG_POOL } from "./database.js";
import * as schema from "./schema.js";

/** The pool and the Drizzle client; kept apart so the transaction plugin can import them. */
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        new pg.Pool({
          connectionString: config.get("DATABASE_URL", { infer: true }),
        }),
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: pg.Pool) => drizzle(pool, { schema }),
    },
  ],
  exports: [PG_POOL, DRIZZLE],
})
export class ConnectionModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}
  async onApplicationShutdown() {
    await this.pool.end();
  }
}
