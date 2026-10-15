# Acme, an example company

A made-up company's factory folder, as the core makes one: the company file
(`factory.json`), a description of each product (`products/<id>/`, with its
`product.json` and `BLUEPRINT.md`), the knowledge base (`context/`) and the
history (`runs/`).

Its two products are the **Shop**, a web app for customers, and the **Orders
service** the shop needs. Their code is in `code/`, and holds only a
`package.json`: just enough for the kits to recognise each kind of product.
The core's tests load this company.
