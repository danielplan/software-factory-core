import { Module } from "@nestjs/common";
import { CommonModule } from "./common/common.module.js";
import { DatabaseModule } from "./database/database.module.js";

/** The whole backend: the shared settings and the database. Each feature adds its module here. */
@Module({
  imports: [CommonModule, DatabaseModule],
})
export class AppModule {}
