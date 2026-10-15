import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import type { KitView, SetupProduct } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { Field } from "./company-step";
import { freeId, freePort, inside } from "./draft";

// Greenfield: the products to make, each of a kind a kit can make.
export function NewProducts({
  kits,
  products,
  factory,
  onChange,
}: Readonly<{
  kits: KitView[];
  products: SetupProduct[];
  factory: string;
  onChange: (products: SetupProduct[]) => void;
}>) {
  const makers = kits.filter((kit) => kit.canCreate);
  const [kind, setKind] = useState(makers[0]?.kind ?? "");
  const [name, setName] = useState("");
  const add = () => {
    const id = freeId(name, products);
    onChange([
      ...products,
      {
        id,
        name: name.trim(),
        kind,
        folder: inside(factory, "code", id),
        about: "",
        port: freePort(kind, products),
        isNew: true,
      },
    ]);
    setName("");
  };
  return (
    <div className="grid gap-6">
      <div className="grid gap-3 rounded-xl border bg-card p-4">
        <p className="font-medium">Add a product</p>
        <KindPicker kits={makers} kind={kind} onKind={setKind} />
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1">
            <Field label="Its name" id="new-product-name">
              <Input
                id="new-product-name"
                value={name}
                placeholder="Shop"
                onChange={(event) => {
                  setName(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && name.trim() && kind) add();
                }}
              />
            </Field>
          </div>
          <Button onClick={add} disabled={!name.trim() || !kind}>
            <Plus aria-hidden /> Add
          </Button>
        </div>
      </div>
      <ProductList products={products} kits={kits} onChange={onChange} />
    </div>
  );
}

// The kinds of product a kit can make, as cards to pick one from.
function KindPicker({
  kits,
  kind,
  onKind,
}: Readonly<{
  kits: KitView[];
  kind: string;
  onKind: (kind: string) => void;
}>) {
  return (
    <div
      className="grid gap-2 sm:grid-cols-3"
      role="radiogroup"
      aria-label="Kind"
    >
      {kits.map((kit) => (
        <button
          key={kit.id}
          type="button"
          role="radio"
          aria-checked={kit.kind === kind}
          onClick={() => {
            onKind(kit.kind);
          }}
          className={cn(
            "grid gap-1 rounded-lg border p-3 text-left text-sm transition hover:border-primary",
            kit.kind === kind && "border-primary bg-secondary",
          )}
        >
          <span className="font-semibold">{kit.name}</span>
          <span className="text-muted-foreground">{kit.about}</span>
        </button>
      ))}
    </div>
  );
}

function ProductList({
  products,
  kits,
  onChange,
}: Readonly<{
  products: SetupProduct[];
  kits: KitView[];
  onChange: (products: SetupProduct[]) => void;
}>) {
  if (products.length === 0)
    return (
      <p className="text-muted-foreground">
        No products yet: add the first one above.
      </p>
    );
  const change = (id: string, folder: string) => {
    onChange(products.map((p) => (p.id === id ? { ...p, folder } : p)));
  };
  return (
    <ul className="grid gap-3" aria-label="Products to make">
      {products.map((product) => (
        <li
          key={product.id}
          className="grid gap-2 rounded-xl border bg-card p-4"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold">{product.name}</span>
            <Badge variant="secondary">
              {kits.find((k) => k.kind === product.kind)?.name ?? product.kind}
            </Badge>
            <span className="text-xs text-muted-foreground">
              port {product.port}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="ml-auto"
              aria-label={`Remove ${product.name}`}
              onClick={() => {
                onChange(products.filter((p) => p.id !== product.id));
              }}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
          <Field label="Where its code goes" id={`folder-${product.id}`}>
            <Input
              id={`folder-${product.id}`}
              value={product.folder}
              onChange={(event) => {
                change(product.id, event.target.value);
              }}
            />
          </Field>
        </li>
      ))}
    </ul>
  );
}
