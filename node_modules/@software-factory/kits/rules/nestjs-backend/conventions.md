# How a NestJS backend is built

The usual way for a server made with NestJS and TypeScript. A product may do
something its own way: then its own rule, written in its blueprint, wins over
this one.

## The tools

- **NestJS** with its default Express adapter: modules, controllers,
  services, guards, pipes and dependency injection, used the way the Nest
  documentation shows.
- **Input checks** with class-validator classes through the global
  ValidationPipe.
- **Settings** with `@nestjs/config`: every setting listed and checked at
  start-up; code reads them through ConfigService, never from the
  environment directly.
- **A database** through a widely used query builder or ORM (for example
  Drizzle with PostgreSQL), with generated migrations; never SQL text built
  from strings.
- **Vitest** or Jest for tests, with requests sent to the app without
  opening a port.

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
