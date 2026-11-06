# SvelteKit web app lessons

Traps met in SvelteKit web apps, and what to do about them.

- A value worked out with $effect is a step behind and can loop: work it out
  with $derived instead.
- $state turns objects into proxies: send a plain copy ($state.snapshot) to
  anything outside Svelte, such as a request body or a chart library.
- A load function runs again whenever something it read changes; read only
  what it needs, or it reloads more often than expected.
- Only the fetch a load function is given works the same on the server and
  in the browser, with cookies and relative addresses: never the global one
  there.
- svelte-check needs SvelteKit's generated types: run svelte-kit sync before
  it, as the usual check script does.
- A build of the app clears its output folder while the development server
  may be using it: check types with svelte-check, not a build, while it runs.
- Tailwind 4 puts its classes in CSS layers, and any rule outside a layer
  wins over them: keep global element rules in the base layer.
