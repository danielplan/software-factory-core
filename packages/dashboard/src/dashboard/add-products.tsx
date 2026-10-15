import { FolderSearch, Sparkles } from "lucide-react";
import { useState } from "react";

import { messageOf, post, type SetupProduct } from "@/api";
import { ChoiceCard } from "@/components/choice-card";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { FoundProducts } from "@/setup/found-products";
import { NewProducts } from "@/setup/new-products";

import type { FactoryState } from "./dashboard";

type Way = "new" | "existing";

// Adding products: something new (made with its kit's starter) or existing
// code (found by the kits), then Add. New products are made on the server;
// the jobs show how far.
export function AddProducts({
  state,
  onDone,
}: Readonly<{ state: FactoryState; onDone: () => void }>) {
  const [way, setWay] = useState<Way>("new");
  const [products, setProducts] = useState<SetupProduct[]>([]);
  const { working, problem, add } = useAdd(products, onDone);
  const choose = (next: Way) => {
    setWay(next);
    setProducts([]);
  };
  return (
    <section
      aria-label="Add products"
      className="grid gap-6 rounded-3xl bg-card p-6 sm:p-8"
    >
      <WayPicker way={way} onWay={choose} />
      <div className="rounded-[20px] bg-surface p-5 sm:p-6">
        {way === "new" ? (
          <NewProducts
            kits={state.kits}
            products={products}
            existing={state.products}
            factory={state.root}
            onChange={setProducts}
          />
        ) : (
          <FoundProducts
            kits={state.kits}
            products={products}
            onChange={setProducts}
          />
        )}
      </div>
      {problem && (
        <ProblemBox title="The products could not be added" text={problem} />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onDone}
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        <Button
          className="h-11 px-[22px]"
          disabled={
            working ||
            products.length === 0 ||
            products.some((p) => !p.name.trim())
          }
          onClick={() => void add()}
        >
          Add
        </Button>
      </div>
    </section>
  );
}

function WayPicker({
  way,
  onWay,
}: Readonly<{ way: Way; onWay: (way: Way) => void }>) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2"
      role="radiogroup"
      aria-label="How to add"
    >
      <ChoiceCard
        chosen={way === "new"}
        icon={<Sparkles aria-hidden />}
        title="Make something new"
        text="Made with its framework's own starter, ready to run."
        onChoose={() => {
          onWay("new");
        }}
      />
      <ChoiceCard
        chosen={way === "existing"}
        icon={<FolderSearch aria-hidden />}
        title="Bring existing code"
        text="The factory finds your products and changes nothing."
        onChoose={() => {
          onWay("existing");
        }}
      />
    </div>
  );
}

// Sending the products; new ones are then made on the server.
function useAdd(products: SetupProduct[], onDone: () => void) {
  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const add = async () => {
    setWorking(true);
    setProblem(null);
    try {
      await post("/api/products", { products });
      onDone();
    } catch (error) {
      setProblem(messageOf(error));
    } finally {
      setWorking(false);
    }
  };
  return { working, problem, add };
}
