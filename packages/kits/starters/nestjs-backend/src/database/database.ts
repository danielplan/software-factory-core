import type { TransactionalAdapterDrizzleOrm } from "@nestjs-cls/transactional-adapter-drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "./schema.js";

/** Injection tokens for the PostgreSQL connection pool and the Drizzle client on top of it. */
export const PG_POOL = Symbol("PG_POOL");
export const DRIZZLE = Symbol("DRIZZLE");

export type DrizzleClient = NodePgDatabase<typeof schema>;

/**
 * What `TransactionHost<Database>` hands repositories: the current transaction or the pool.
 * @public for the first feature's repository
 */
export type Database = TransactionalAdapterDrizzleOrm<DrizzleClient>;
