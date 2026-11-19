// The made-up world's check for the Orders service (its product.json names
// it as `checkWorld`; software-factory check runs it): each situation in
// prototype-world/ has every table the service keeps, each row has the
// table's columns, and what a row points at is there. A real service would
// check against its own database schema instead of the list below.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const folder = join(import.meta.dirname, "prototype-world");
const TABLES = {
  products: ["id", "name", "price_cents", "in_stock"],
  customers: ["id", "name", "email", "pays", "created_at"],
  basket_lines: ["id", "customer_id", "product_id", "quantity", "added_at"],
  orders: [
    "id",
    "customer_id",
    "status",
    "total_cents",
    "placed_at",
    "delivery_day",
  ],
};
const POINTS_AT = { customer_id: "customers", product_id: "products" };

const problems = [];
for (const file of readdirSync(folder).filter((name) =>
  name.endsWith(".json"),
)) {
  const { tables, signed_in: signedIn } = JSON.parse(
    readFileSync(join(folder, file), "utf8"),
  );
  const ids = (table) => new Set((tables[table] ?? []).map((row) => row.id));
  for (const [table, columns] of Object.entries(TABLES)) {
    if (!tables[table]) problems.push(`${file}: there is no table ${table}.`);
    for (const row of tables[table] ?? []) {
      const missing = columns.filter((column) => !(column in row));
      if (missing.length > 0)
        problems.push(
          `${file}: ${table} ${row.id} has no ${missing.join(", ")}.`,
        );
      for (const [column, other] of Object.entries(POINTS_AT))
        if (column in row && !ids(other).has(row[column]))
          problems.push(
            `${file}: ${table} ${row.id} points at ${row[column]}, which is not in ${other}.`,
          );
    }
  }
  for (const table of Object.keys(tables))
    if (!(table in TABLES))
      problems.push(`${file}: the service keeps no table ${table}.`);
  for (const [who, id] of Object.entries(signedIn))
    if (!ids("customers").has(id))
      problems.push(
        `${file}: ${who} is signed in as ${id}, who is not a customer.`,
      );
}
for (const problem of problems) process.stdout.write(`${problem}\n`);
process.exitCode = problems.length > 0 ? 1 : 0;
