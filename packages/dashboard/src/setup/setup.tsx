import { useState } from "react";

import type { KitView, SetupProduct, State } from "@/api";

import { CompanyStep } from "./company-step";
import { type Door, type Draft, emptyDraft, factoryFolder } from "./draft";
import { FoundProducts } from "./found-products";
import { NewProducts } from "./new-products";
import { ReviewStep } from "./review-step";
import { StepFrame } from "./step-frame";
import { TrackerStep } from "./tracker-step";
import { Welcome } from "./welcome";

type SetupState = Extract<State, { mode: "setup" }>;

// The setup flow: the welcome's two doors, then the company, its products
// (to make, or found in existing code), where work is tracked, and a last
// look before the factory is set up.
export function Setup({ state }: Readonly<{ state: SetupState }>) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [step, setStep] = useState(0);
  if (!draft)
    return (
      <Welcome
        onChoose={(door: Door) => {
          setDraft(emptyDraft(door));
          setStep(0);
        }}
      />
    );
  const change = (part: Partial<Draft>) => {
    setDraft({ ...draft, ...part });
  };
  const moves = {
    onBack: () => {
      if (step === 0) setDraft(null);
      else setStep(step - 1);
    },
    onNext: () => {
      setStep(step + 1);
    },
  };
  const folders = { factoriesFolder: state.factoriesFolder };
  if (step === 0)
    return (
      <CompanyStep draft={draft} onChange={change} {...folders} {...moves} />
    );
  if (step === 1)
    return (
      <ProductsStep
        draft={draft}
        kits={state.kits}
        factory={factoryFolder(draft, state.factoriesFolder)}
        onProducts={(products) => {
          change({ products });
        }}
        {...moves}
      />
    );
  if (step === 2)
    return <TrackerStep draft={draft} onChange={change} {...moves} />;
  return (
    <ReviewStep
      draft={draft}
      kits={state.kits}
      jobs={state.jobs}
      onBack={moves.onBack}
      {...folders}
    />
  );
}

// The products: to make (a new start), or found in existing code.
function ProductsStep({
  draft,
  kits,
  factory,
  onProducts,
  onBack,
  onNext,
}: Readonly<{
  draft: Draft;
  kits: KitView[];
  factory: string;
  onProducts: (products: SetupProduct[]) => void;
  onBack: () => void;
  onNext: () => void;
}>) {
  const isNew = draft.door === "new";
  return (
    <StepFrame
      step={1}
      title={isNew ? "Your first products" : "Your products"}
      about={
        isNew
          ? "Pick what to make. Each is made with its framework's own starter, ready to run."
          : "The factory looks through the folder for the kinds of product it knows, and the commands they already have. Nothing in your code is changed."
      }
      onBack={onBack}
      onNext={onNext}
      canGoOn={
        draft.products.length > 0 && draft.products.every((p) => p.name.trim())
      }
    >
      {isNew ? (
        <NewProducts
          kits={kits}
          products={draft.products}
          factory={factory}
          onChange={onProducts}
        />
      ) : (
        <FoundProducts
          kits={kits}
          products={draft.products}
          onChange={onProducts}
        />
      )}
    </StepFrame>
  );
}
