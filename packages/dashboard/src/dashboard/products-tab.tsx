import type { ProductView } from "@/api";
import { Badge } from "@/components/ui/badge";

import type { FactoryState } from "./dashboard";

// Each product as the factory knows it: what it is, where its code is, its
// commands and who uses it.
export function ProductsTab({ state }: Readonly<{ state: FactoryState }>) {
  const kitName = (kind: string) =>
    state.kits.find((k) => k.kind === kind)?.name ?? kind;
  if (state.products.length === 0)
    return <p className="text-muted-foreground">No products described yet.</p>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {state.products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          kind={kitName(product.kind)}
        />
      ))}
    </div>
  );
}

function ProductCard({
  product,
  kind,
}: Readonly<{ product: ProductView; kind: string }>) {
  const commands = Object.entries(product.commands);
  return (
    <article className="grid gap-3 rounded-xl border bg-card p-4">
      <header className="flex items-center gap-2">
        <h2 className="font-semibold">{product.name}</h2>
        <Badge variant="secondary">{kind}</Badge>
        {product.port && (
          <span className="ml-auto text-xs text-muted-foreground">
            port {product.port}
          </span>
        )}
      </header>
      <p className={product.about ? "" : "text-muted-foreground italic"}>
        {product.about || "No description yet."}
      </p>
      <dl className="grid gap-1 text-sm sm:grid-cols-[6rem_1fr]">
        <dt className="text-muted-foreground">Code</dt>
        <dd className="break-all">{product.folder}</dd>
        <dt className="text-muted-foreground">Commands</dt>
        <dd>
          {commands.length === 0 ? (
            <span className="text-muted-foreground">None found</span>
          ) : (
            <ul>
              {commands.map(([what, command]) => (
                <li key={what}>
                  <span className="text-muted-foreground">{what}:</span>{" "}
                  <code className="rounded bg-muted px-1 text-xs">
                    {command}
                  </code>
                </li>
              ))}
            </ul>
          )}
        </dd>
        <dt className="text-muted-foreground">Used by</dt>
        <dd>
          {product.users.length === 0 ? (
            <span className="text-muted-foreground">Not said yet</span>
          ) : (
            product.users.map((user) => `${user.who} (${user.does})`).join(", ")
          )}
        </dd>
      </dl>
    </article>
  );
}
