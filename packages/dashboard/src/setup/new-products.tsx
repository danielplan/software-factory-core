import { AppWindow, Box, Plus, Server, Smartphone, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";

import type { KitView, SetupProduct } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChoiceCard } from "@/components/choice-card";

import { Field } from "@/components/field";
import { freeId, freePort, inside } from "./draft";

// Something new: the products to make, each of a kind a kit can make, with
// ids and ports no product has yet (`existing` are the factory's own),
// each in a folder of its own in the project.
export function NewProducts({
  kits,
  products,
  existing,
  project,
  onChange,
}: Readonly<{
  kits: KitView[];
  products: SetupProduct[];
  existing: { id: string; port: number | null }[];
  project: string;
  onChange: (products: SetupProduct[]) => void;
}>) {
  const makers = kits.filter((kit) => kit.canCreate);
  const [kind, setKind] = useState(makers[0]?.kind ?? "");
  const [name, setName] = useState("");
  const add = () => {
    const taken = [...existing, ...products];
    const id = freeId(name, taken);
    onChange([
      ...products,
      {
        id,
        name: name.trim(),
        kind,
        folder: inside(project, id),
        about: "",
        port: freePort(kind, taken),
        isNew: true,
      },
    ]);
    setName("");
  };
  return (
    <div className="grid gap-6">
      <div className="grid gap-4">
        <p className="text-[22px] font-medium">What do you want to make?</p>
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
      className="grid gap-4 sm:grid-cols-2"
      role="radiogroup"
      aria-label="Kind"
    >
      {kits.map((kit) => (
        <ChoiceCard
          key={kit.id}
          chosen={kit.kind === kind}
          icon={ICONS[kit.kind] ?? <Box aria-hidden />}
          title={kit.name}
          text={kit.about}
          onChoose={() => {
            onKind(kit.kind);
          }}
        />
      ))}
    </div>
  );
}

const ICONS: Record<string, ReactNode> = {
  "react-web-app": <AppWindow aria-hidden />,
  "expo-app": <Smartphone aria-hidden />,
  "nestjs-backend": <Server aria-hidden />,
};

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
          className="grid gap-2 rounded-[14px] border border-border-soft bg-card p-4"
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
