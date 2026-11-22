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
- tailwind-merge (shadcn's `cn`) knows only Tailwind's own scales: it reads a
  theme's own text size such as `text-metric` as a colour and drops it when a
  colour class follows. Teach it the theme's sizes with
  `extendTailwindMerge` (the starter's `cn` does), or join such classes
  without `cn`.
- eslint-plugin-i18next in `jsx-only` mode also flags a string passed to a
  function or written in an array inside JSX (`{label("open")}`): keep such
  codes in a constant outside the markup.
- Some languages have a `many` plural form for large round numbers
  (Italian, Spanish and French among them), so i18next looks for `key_many`:
  give every plural each form `Intl.PluralRules` names for the language (the
  starter's translations test checks it).
- `Intl.NumberFormat` follows each language's own habits (Italian groups
  thousands only from five digits: "1234,50", "12.345,50"): test the text it
  makes, not the one you expect.
- eslint-plugin-jsx-a11y may not yet declare the newest ESLint as a peer
  while working with it: an `overrides` entry in package.json
  (`"eslint-plugin-jsx-a11y": { "eslint": "$eslint" }`) lets `npm ci`
  install it; remove it once the plugin declares that ESLint.
- shadcn's Sidebar, folded to icons, moves each group's title up over the
  previous group's last link, invisible: the title then catches that link's
  clicks. Give the titles `pointer-events-none`.
- Recharts' accessibility layer makes a chart focusable, so a dialog that
  opens on it focuses the chart and shows a tooltip: turn the layer off
  where a table next to the chart already says the same.
- Some embedded browsers (inside desktop apps) block service workers, so the
  prototype's pretend backend (MSW) cannot start there: open the prototype in
  a full browser.
