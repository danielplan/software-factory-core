import type { ProductView } from "@/api";
import { Plus } from "lucide-react";
import { useState } from "react";

import { Accent } from "@/components/accent";
import { JobList } from "@/components/job-list";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { AddProducts } from "./add-products";
import type { FactoryState } from "./dashboard";

// Each product as the factory knows it: what it is, where its code is, its
// commands and who uses it; and adding more.
export function ProductsTab({ state }: Readonly<{ state: FactoryState }>) {
  const [adding, setAdding] = useState(state.products.length === 0);
  const kitName = (kind: string) =>
    state.kits.find((k) => k.kind === kind)?.name ?? kind;
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1 pt-2">
        <h1 className="text-[30px] font-medium tracking-[-0.02em]">
          Your <Accent>products</Accent>
        </h1>
        {!adding && (
          <Button
            className="h-11 rounded-xl px-4"
            onClick={() => {
              setAdding(true);
            }}
          >
            <Plus aria-hidden /> Add products
          </Button>
        )}
      </div>
      {adding && (
        <AddProducts
          state={state}
          onDone={() => {
            setAdding(false);
          }}
        />
      )}
      {state.jobs.length > 0 && <JobList jobs={state.jobs} />}
      {state.products.length === 0 && !adding && (
        <p className="rounded-3xl bg-card p-6 text-muted-foreground">
          No products yet.
        </p>
      )}
      {state.products.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2">
          {state.products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              kind={kitName(product.kind)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({
  product,
  kind,
}: Readonly<{ product: ProductView; kind: string }>) {
  const commands = Object.entries(product.commands);
  return (
    <article className="grid gap-4 rounded-3xl bg-card p-6">
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
      <dl className="grid gap-1.5 rounded-2xl bg-surface p-4 text-sm sm:grid-cols-[6rem_1fr]">
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
                  <code className="rounded-md bg-surface-2 px-1.5 py-0.5 text-xs">
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
