# Add a kit

[Knowledge base](../index.md) · [How-to guides](index.md)

**Type:** How-to · Answers: how do I teach the factory a new kind of product?

A kit teaches the factory one kind of product: how to recognise it, run it,
check it and make a new one, and the rules and libraries for building it.
The kits are in `packages/kits/`; the kit's type is `kitSchema` and `Kit` in
`packages/core/src/extensions/extension.ts`.

## Steps

1. **Is it a kind?** A kit is for a kind of product many companies have,
   such as a framework. One company's way of working goes in its own
   conventions instead.
2. **The kit's code.** `packages/kits/src/<kit>.ts`, written with
   `defineKit`, after a similar kit (`packages/kits/src/sveltekit-app.ts` for
   a web app). It gives:
   - `id`, `name`, `about` and the `kind` a `product.json` names;
   - `commands` a product of this kind usually has (its own win), and its
     check command, which the factory runs before a pull request;
   - `detect(folder)`: whether existing code is such a product, with its
     name, commands and port;
   - `partsFor(product)`: the programs that run it (a part that needs a
     backend gets the backend's address as `BACKEND_URL` from the core);
   - `create(folder, name)`: how to make a new one, from its starter or the
     framework's own generator;
   - `mcp`: the tools its agents use (its documentation, its checks).
3. **Add it** to `allKits` in `packages/kits/src/index.ts`, in the order
   kits are asked to recognise a folder; other code stays last.
4. **Its rules.** `packages/kits/rules/<kit>/conventions.md` (the folders,
   the rules and why, how it is tested) and `lessons.md`, and its libraries
   table: one library per job. `npx software-factory rules <product>` prints
   them.
5. **A starter** (optional): a whole empty product in
   `packages/kits/starters/<kit>/` with the kit's standards, checks and, for
   a screen, prototype mode with the shared world's hook and the check that
   no prototype code reaches the real app. It is a product of its own with
   its own `npm run verify`; the core's checks leave `starters/` out.
6. **Tests** in `packages/kits/test/`: it recognises its kind and refuses the
   others, its parts, its commands.
7. **Docs:** list it in [how Kobble is built](../explanation/how-kobble-is-built.md#kits)
   and the README.
