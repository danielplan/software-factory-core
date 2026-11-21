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
└─ main.ts                   start-up
```

## The rules and why

- **Every route says who may call it,** with an access decorator; a guard
  refuses a route that names nobody.
- **A feature uses another only through its module and service,** or its pure
  rules.
- **Controllers hold no database code and no workflow; services hold no
  HTTP; repositories hold no workflow.**
- **Input is checked once, at the edge;** services trust typed input and
  check only business rules.
- **Every refusal is a code** with its status and an English fallback
  sentence: the apps translate the code. The server never writes sentences
  for people into its answers.
- **Writes that touch several records run in one transaction.**
- **API answers keep their shape:** names, dates and nulls the same
  everywhere.
- Every POST that creates nothing says `@HttpCode(200)`: Nest's default for a
  POST is 201.

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
| coverage floor                      | code that loses its tests                       |

## How we test

- HTTP tests build the app with test doubles for its services, without a
  database.
- Tests against a real database use unique identifiers and remove their own
  records; one journey makes its last step fail, to prove the transaction
  rolls back.

## The starter

A new NestJS backend starts as a copy of the kit's starter
(`starters/nestjs-backend` in the kits): settings checked at start, a
database connection with migrations, a health route, the checks above in
`npm run verify` and a `BLUEPRINT.md`, without features or sign-in. Which
database server it uses is a setting (`DATABASE_URL` in `.env`), the
product's or the company's decision, not the kit's.
