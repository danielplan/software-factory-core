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
