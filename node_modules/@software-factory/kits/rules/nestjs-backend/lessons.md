# NestJS backend lessons

Traps met in NestJS servers, and what to do about them.

- Nest answers a POST with 201 unless the handler says `@HttpCode(200)`.
- A test double given to Nest as a provider must not answer `onModuleInit`
  and the other lifecycle names, or Nest calls it at start-up.
- With experimental decorators, set `useDefineForClassFields: false`:
  otherwise every optional DTO field exists as undefined, and a partial update
  clears the fields it did not send.
- A settings class read by class-transformer needs explicit types, or it
  cannot turn the text "4176" into a number.
- ValidationPipe passes class instances: a test that compares a received body
  with a plain object must copy it first.
- Express 5 route wildcards are named (`*path`); Nest's Express adapter
  answers a returned Buffer as JSON, so return a StreamableFile for bytes.
- Session expiry columns must have a time zone: a timestamp without one
  shifts expiry when the database and Node use different zones.
- PostgreSQL date columns may come back as timestamps: format date-only
  fields explicitly.
- Real-database fixtures need clean-up by exact identifier, registered before
  the writes.
- Restart the server after adding routes, and tell a generic 404 apart from
  an explicit "not found" answer.
- When a browser needs privileged data, go through the server and keep keys
  there; public database policies are not authorisation.
- Drizzle's `sql` template turns an interpolated array into separate SQL
  pieces, not one list: use the query builder's `inArray`.
- Queries run through `db.execute` skip Drizzle's type conversion: PostgreSQL
  timestamps arrive as text like `2026-10-13 09:01:20+00`, not as dates or
  ISO text, and fail the apps' date checks. Use the query builder, which
  returns `Date`.
- drizzle-kit finds only tables exported at the top level of a schema file,
  puts `./` before its output folder, and exits with code 0 on some errors:
  check its message, not its exit code (the starter's `db:check` does).
- A generated JSON file in the backend (the error codes, a snapshot) is read
  by the format check too: write it through Prettier's `format` with the
  `json` parser, as the starter's `codes:export` does.
- Nest turns a request body that is not JSON into a plain 400
  BadRequestException before any filter sees the parser's error: the error
  filter cannot tell it from other 400s, so it answers a general code.
- To choose a database per request (a demo side next to the real one), set
  the choice in Nest's request context (nestjs-cls, with its middleware
  mounted) and let the one Drizzle client follow it; the transaction plugin
  keeps a transaction on the side it began on. Set the choice in a guard,
  once the route is known, not in a middleware.
- A test database that a hand-made change touched can hold rows the schema
  would refuse now (columns made nullable, leftover rows): an odd answer from
  it may be its data, not the change under test. Compare
  `information_schema.columns` with the schema first.
- In Node 24, `localhost` may resolve to the IPv6 address first, which some
  servers and bridges do not answer: write `127.0.0.1` in addresses meant for
  this computer.
- Several backends on one computer share one database server, each with
  databases of its own, rather than a server (or a container) each: they
  then never fight over a port.
