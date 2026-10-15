# Acme, an example company

A made-up company that uses the core, with two products: the **Shop**, a
web app for customers (`apps/shop/`), and the **Orders service** it needs
(`services/orders/`). Each describes itself in its `product.json`; the
company file, `factory.json`, says where the products are and which kits the
factory uses. The core's tests load this company.

There is no real code in the products: only what the factory reads.
