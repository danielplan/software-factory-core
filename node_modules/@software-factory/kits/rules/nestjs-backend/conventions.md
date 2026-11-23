# How a NestJS backend is built

The usual way for a server made with NestJS and TypeScript. A product may do
something its own way: then its own rule, written in its blueprint, wins over
this one.

## The libraries

One library per job. Use the one named here. A job this table does not
have is never written by hand: take what the platform gives first, then a
widely used, maintained library, and add its row, with why, in the same
change: in this kit when other products would need it too, in the
product's blueprint (`## Libraries`, the same table) when only it does. Code
of your own is allowed only as a row that says why no library fits. Every
package in the product's `dependencies` is named in one of the two tables;
the core's checks refuse one that is not.

| Job            | Library                                                                                                                              | Why                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| The server     | **NestJS** on its default Express adapter (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `reflect-metadata`, `rxjs`) | modules, controllers, services, guards and pipes, used as the Nest documentation shows |
| Checking input | **class-validator** classes through the global ValidationPipe (`class-validator`, `class-transformer`)                               | Nest's own way                                                                         |
| Settings       | **@nestjs/config** (`@nestjs/config`)                                                                                                | every setting listed and checked at start-up                                           |
| The database   | **Drizzle** with **PostgreSQL** (`drizzle-orm`, `drizzle-kit`, `pg`)                                                                 | typed queries and generated migrations, never SQL built from strings                   |
| Transactions   | **nestjs-cls** with its Drizzle adapter (`nestjs-cls`, `@nestjs-cls/*`)                                                              | one transaction across services without passing it by hand                             |
| Tests          | **Vitest** or Jest, with requests sent without opening a port (development only)                                                     | see How we test                                                                        |

## The folder layout

```text
src/
├─ <feature>/                one Nest module per product feature
│   ├─ <feature>.module.ts   what the feature provides; exports only services
│   ├─ <topic>.controller.ts HTTP in and out: paths, who may call, status codes
│   ├─ <topic>.dto.ts        the input classes a controller checks
│   ├─ <topic>.service.ts    what the feature does, step by step
│   ├─ <topic>.repository.ts the feature's database reads and writes
│   └─ <topic>.rules.ts      pure business rules: no Nest, HTTP or database
├─ common/                   errors, settings, access decorators
├─ database/                 connection, schema, health check
├─ setup-app.ts              Express settings shared by the server and the tests
└─ main.ts                   start-up
prototype-world/             the made-up world's situations, as the database's tables
error-codes.json             the refusal codes the apps translate, generated
compose.yaml                 a local PostgreSQL server, for a computer without one
```

## The rules and why

- **Every route says who may call it,** with an access decorator
  (`@Public()`, and sign-in's own once there is one); a guard refuses a route
  that names nobody with `route_closed`, and a test walks every route.
- **Every route answers under `/api`,** as the kit's web apps call it
  (`app.setGlobalPrefix("api")`); `/health` stays outside, for the factory.
- **A feature uses another only through its module and service,** or its pure
  rules.
- **Controllers hold no database code and no workflow; services hold no
  HTTP; repositories hold no workflow.**
- **Input is checked once, at the edge;** services trust typed input and
  check only business rules.
- **Every refusal is a code** with its status and an English fallback
  sentence, `throw new AppError(code, params?)`: the apps translate the code.
  The answer is `{ error, message, params?, fields? }` (`fields`: each input
  field that failed and the rules it broke); a server failure is logged and
  hides its details. The codes live in one list (`common/error-codes.ts`); a
  new meaning gets a new code, and `error-codes.json`, generated from the
  list, is what the apps translate. The server never writes sentences for
  people into its answers.
- **Writes that touch several records run in one transaction.**
- **API answers keep their shape:** names, dates and nulls the same
  everywhere.
- Every POST that creates nothing says `@HttpCode(200)`: Nest's default for a
  POST is 201.
- **The made-up world follows the schema.** `prototype-world/<key>.json` are
  the situations the factory's prototypes share, written as this database's
  tables; the product names the folder as its `world` in `product.json`. A
  schema change updates every situation in the same change: a new table goes
  into each, a renamed column is renamed in its rows.

## The checks

All in the product's verify command; tighten them freely, loosen one only
with the owner's agreement.

| Check                               | What it stops                                   |
| ----------------------------------- | ----------------------------------------------- |
| TypeScript strict                   | unchecked undefined, missing returns            |
| ESLint strict type-checked, SonarJS | unsafe types, bug patterns                      |
| dependency-cruiser                  | imports across feature boundaries, impure rules |
| knip, jscpd                         | unused files and exports; copy-pasted code      |
| a schema check                      | a schema change without its migration           |
| the codes check                     | an error-code list that differs from its JSON   |
| the routes test                     | a route that does not say who may call it       |
| the made-up world's test            | a situation that no longer fits the schema      |
| coverage floor                      | code that loses its tests                       |

## How we test

- HTTP tests build the app with test doubles for its services, without a
  database; they and the coverage floor are part of `npm run verify`.
- Tests against a real database (`npm run test:integration`) run on a test
  database of their own, one per working copy of the code, so copies testing
  side by side never meet; they use unique identifiers and remove their own
  records; one journey makes its last step fail, to prove the transaction
  rolls back. Each situation of the made-up world is written into it, so the
  database's own checks hold for it too.

## The database and the start

- **The database is a setting** (`DATABASE_URL`), the product's or the
  company's decision. On a computer without a PostgreSQL server, the
  starter's `compose.yaml` runs one (`npm run db:start`), shared by every
  backend made from the starter, each with databases of its own on it.
- **A working copy keeps its data apart:** `DATABASE_NAME` names another
  database on the same server; the product's `copyEnv` gives each copy its
  own (`"DATABASE_NAME": "<name>-{port:<id>}"`).
- **The factory starts a backend with `npm start`**: in the starter it makes
  and updates the database, builds and runs the server. `npm run start:dev`
  (with a rebuild on every change) is for working on it by hand. The factory
  waits up to three minutes for `/health` when the code has that route, and
  will not start a backend whose `.env.example` has no `.env` beside it.

## The starter

A new NestJS backend starts as a copy of the kit's starter
(`starters/nestjs-backend` in the kits): settings checked at start, a
database connection with migrations, a health route, routes under `/api`
with the access decorator and its guard, the refusal codes with their check,
a made-up world with its check, a local database server, the checks above
in `npm run verify` and a `BLUEPRINT.md`, without features or sign-in. Which
database server it uses is a setting (`DATABASE_URL` in `.env`), the
product's or the company's decision, not the kit's.
