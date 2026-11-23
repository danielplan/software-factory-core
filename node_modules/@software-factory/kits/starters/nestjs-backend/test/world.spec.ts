import assert from "node:assert/strict";
import {
  integer,
  pgTable,
  text,
  timestamp,
  type PgTable,
} from "drizzle-orm/pg-core";
import {
  asValues,
  insertOrder,
  problemsIn,
  tablesOf,
  type Situation,
} from "./world.js";

// The made-up world's check and its writing order, on made-up tables.
const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id),
  total: integer("total").notNull(),
});
const tables: PgTable[] = [orders, customers];

const situation = (data: Situation["tables"]): Situation => ({
  name: "A day",
  about: "",
  clock: "2026-01-05T09:00:00.000Z",
  signed_in: {},
  tables: data,
});

test("a schema module's tables are found among its exports", () => {
  assert.deepEqual(tablesOf({ customers, orders, other: 1 }), [
    customers,
    orders,
  ]);
});

test("a situation that fits has no problems", () => {
  const fits = situation({
    customers: [{ id: "c-1", full_name: "Ada" }],
    orders: [{ id: "o-1", customer_id: "c-1", total: 12 }],
  });
  assert.deepEqual(problemsIn(fits, tables), []);
});

test("tables, columns, required values and references are checked", () => {
  const wrong = situation({
    orders: [
      { id: "o-1", customer_id: "c-9", total: 12, colour: "red" },
      { id: "o-2", customer_id: "c-1" },
    ],
    payments: [],
  });
  assert.deepEqual(problemsIn(wrong, tables), [
    "there is no table customers",
    "the database has no table payments",
    "orders[0] has no column colour",
    "orders[1] needs total",
    "orders[0] points at a row customers does not have",
    "orders[1] points at a row customers does not have",
  ]);
});

test("a table is written after the tables it points at", () => {
  assert.deepEqual(insertOrder(tables), [customers, orders]);
});

test("a row is given to Drizzle by its keys, with dates as dates", () => {
  assert.deepEqual(
    asValues(customers, {
      id: "c-1",
      full_name: "Ada",
      joined_at: "2026-01-05T09:00:00.000Z",
    }),
    {
      id: "c-1",
      fullName: "Ada",
      joinedAt: new Date("2026-01-05T09:00:00.000Z"),
    },
  );
});
