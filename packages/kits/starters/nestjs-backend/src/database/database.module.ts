import { Global, Module } from "@nestjs/common";
import { ClsPluginTransactional } from "@nestjs-cls/transactional";
import { TransactionalAdapterDrizzleOrm } from "@nestjs-cls/transactional-adapter-drizzle-orm";
import { ClsModule } from "nestjs-cls";
import { ConnectionModule } from "./connection.module.js";
import { DRIZZLE } from "./database.js";
import { HealthController } from "./health.controller.js";

/**
 * PostgreSQL for every feature. Repositories read `TransactionHost<Database>.tx`, which is
 * the running transaction when there is one, so a service never passes a connection around.
 */
@Global()
@Module({
  imports: [
    ConnectionModule,
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
      plugins: [
        new ClsPluginTransactional({
          imports: [ConnectionModule],
          adapter: new TransactionalAdapterDrizzleOrm({
            drizzleInstanceToken: DRIZZLE,
          }),
        }),
      ],
    }),
  ],
  controllers: [HealthController],
  exports: [ConnectionModule],
})
export class DatabaseModule {}
