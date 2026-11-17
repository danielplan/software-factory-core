# Acme, an example company

A made-up company's project with its factory, as the core makes one. The
factory is in `factory/`: the company file (`factory.json`, with the products'
folders) and the history (`runs/`). Each product describes itself next to its
code (`product.json`, `BLUEPRINT.md`), and what the company knows is in `docs/`.

Its two products are the **Shop** (`shop/`), a web app for customers, and the
**Orders service** (`orders/`) the shop needs. Their code holds only a
`package.json`: just enough for the kits to recognise each kind of product.
Its Kobble records start from `factory/kobble-seed.json`: the Shop's
personas, their stories, problems and ideas, made up as well. Running the
factory here fills its local database from it (`kobble.db`, never in git).
Its signals, explorations and personas for Kobble's new pages are files in
`factory/kobble/`, and `live-export.json` is a made-up export of the live
shop, to try the Signals page without a live app (see
[the live export](../../docs/reference/live-export.md)).
The core's tests load this company.
