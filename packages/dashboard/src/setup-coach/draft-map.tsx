import { FileCheck2, Users } from "lucide-react";
import { Fragment, useState } from "react";

import { type Draft, idFrom, type KitView, messageOf, post } from "@/api";
import { Arrow } from "@/components/arrow";
import { LogoTile } from "@/components/logo";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { columnsOf } from "@/lib/columns";
import { inside } from "@/setup/draft";

import { DraftTile } from "./draft-tile";

type Product = Draft["products"][number];

// The company as the coach drafts it, building up while they talk: the
// company on top, its products below as a map, and the button that makes
// the factory from it. Every card can be changed by hand.
export function DraftMap({
  draft,
  kits,
  factoriesFolder,
  working,
}: Readonly<{
  draft: Draft;
  kits: KitView[];
  factoriesFolder: string;
  working: boolean;
}>) {
  const [problem, setProblem] = useState<string | null>(null);
  const change = (body: unknown) => {
    setProblem(null);
    post("/api/setup/draft", body).catch((error: unknown) => {
      setProblem(messageOf(error));
    });
  };
  return (
    <section
      aria-label="Your company, as drafted"
      className="dotted-board flex min-h-[640px] min-w-0 flex-[999_1_560px] flex-col gap-6 rounded-3xl p-5 sm:p-6"
    >
      <DraftTile
        className="max-w-[420px]"
        text={draft.company}
        placeholder={{
          name: "Your company",
          about: "What it does appears here.",
        }}
        top={<LogoTile small />}
        onSave={(company) => {
          change({ company });
        }}
      />
      <ProductMap products={draft.products} kits={kits} onChange={change} />
      {problem && <ProblemBox title="That did not work" text={problem} />}
      <MakeFactory
        name={draft.company.name}
        folder={inside(
          factoriesFolder,
          idFrom(draft.company.name || "my-company"),
        )}
        working={working}
      />
    </section>
  );
}

function ProductMap({
  products,
  kits,
  onChange,
}: Readonly<{
  products: Product[];
  kits: KitView[];
  onChange: (body: unknown) => void;
}>) {
  if (products.length === 0)
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1].map((n) => (
          <div
            key={n}
            className="flex min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-arrow p-4 text-center text-[13px] text-muted-foreground"
          >
            {n === 0 ? "Your products appear here as you talk." : ""}
          </div>
        ))}
      </div>
    );
  const columns = columnsOf(products);
  return (
    <div className="overflow-x-auto">
      <div
        className="flex items-center gap-3"
        style={{ minWidth: `${String(columns.length * 240)}px` }}
      >
        {columns.map((column, index) => (
          <Fragment key={column[0]?.id ?? index}>
            {index > 0 && <Arrow />}
            <div className="flex flex-1 flex-col gap-3">
              {column.map((product) => (
                <ProductTile
                  key={product.id}
                  product={product}
                  kit={kits.find((k) => k.kind === product.kind)}
                  onChange={onChange}
                />
              ))}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function ProductTile({
  product,
  kit,
  onChange,
}: Readonly<{
  product: Product;
  kit: KitView | undefined;
  onChange: (body: unknown) => void;
}>) {
  return (
    <DraftTile
      text={product}
      placeholder={{ name: "A product", about: "What it is for." }}
      top={
        <span className="flex flex-wrap gap-1.5 text-[11px] font-medium">
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted-foreground">
            {kit?.name ?? product.kind}
          </span>
          <span className="rounded-full bg-[var(--glow-c)] px-2 py-0.5">
            {product.isNew ? "New" : "Your code"}
          </span>
        </span>
      }
      onSave={(text) => {
        onChange({ product: { id: product.id, ...text } });
      }}
      onRemove={() => {
        onChange({ remove: product.id });
      }}
    >
      {product.users.length > 0 && (
        <span className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Users className="mt-0.5 size-3.5 flex-none" aria-hidden />
          {product.users.map((u) => `${u.who} ${u.does}`).join(" · ")}
        </span>
      )}
      {product.blueprint && (
        <span className="flex items-center gap-1.5 text-xs text-success">
          <FileCheck2 className="size-3.5" aria-hidden /> Blueprint drafted
        </span>
      )}
    </DraftTile>
  );
}

// Making the factory from the map; the page then becomes its dashboard.
function MakeFactory({
  name,
  folder,
  working,
}: Readonly<{ name: string; folder: string; working: boolean }>) {
  const [making, setMaking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const make = async () => {
    setMaking(true);
    setProblem(null);
    try {
      await post("/api/setup/make");
    } catch (error) {
      setProblem(messageOf(error));
      setMaking(false);
    }
  };
  return (
    <div className="mt-auto grid gap-3">
      {problem && (
        <ProblemBox title="The factory could not be made" text={problem} />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-4 shadow-soft">
        <p className="min-w-0 flex-1 text-[13px] text-muted-foreground">
          The factory keeps its files in{" "}
          <span className="break-all text-foreground">{folder}</span>. Nothing
          in your code changes.
        </p>
        <Button
          className="h-11 px-[22px]"
          disabled={!name.trim() || working || making}
          onClick={() => void make()}
        >
          {making ? "Making it…" : "Make the factory"}
        </Button>
      </div>
    </div>
  );
}
