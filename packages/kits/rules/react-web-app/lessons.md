# React web app lessons

Traps met in React web apps, and what to do about them.

- Tailwind 4 puts its classes in CSS layers, and any rule outside a layer
  wins over them: keep global element rules in `@layer base`.
- A browser's EventSource reconnects by itself after a dropped connection
  but gives up for good on an error answer: retry it yourself.
- React Router runs a navigation as a React transition, so while a lazily
  loaded page is still loading, the previous page stays on screen and still
  reacts; turn transitions off on the router when that confuses people.
- zod 4's `.meta()` carries over to copies made by `.meta()` or `.refine()`,
  but `.nullable()` and `.optional()` wrap the schema: read the inner schema's
  metadata through `.unwrap()`.
- jsdom has no `window.matchMedia`, but the property exists as undefined:
  check the value, not whether the name exists.
- Recharts' ResponsiveContainer draws nothing in jsdom (it measures 0 × 0):
  give it a size in the test with a ResizeObserver that reports one.
- jsdom and Playwright's default browser ask for English: a page that follows
  the browser's language opens in English in tests unless the tests set it.
- A datetime-local input knows no time zone: convert at the input's edges, in
  the zone the screen shows.
- Headless Chrome's screenshot flag never finishes on a page with a live
  connection: take pictures through the DevTools protocol instead.
- shadcn's generated pieces may import from the shared hooks folder (the
  sidebar does): an import rule for the ui folder must allow it.
