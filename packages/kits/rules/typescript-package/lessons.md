# TypeScript package lessons

Traps met in shared TypeScript packages, and what to do about them.

- The products use the built package, not its source: after a change, build
  it (or keep its watch script running) before checking the products, or
  they check against the old one.
- A watch build keeps old files from deleted sources in its output folder:
  build into a clean folder before trusting a check.
- zod 4's metadata (`.meta()`) carries over to copies, but `.nullable()` and
  `.optional()` wrap the schema: read the inner schema's metadata through
  `.unwrap()`.
