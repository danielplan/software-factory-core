import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { type Draft, factoryFolder } from "./draft";
import { StepFrame } from "./step-frame";

export function CompanyStep({
  draft,
  factoriesFolder,
  onChange,
  onBack,
  onNext,
}: Readonly<{
  draft: Draft;
  factoriesFolder: string;
  onChange: (change: Partial<Draft>) => void;
  onBack: () => void;
  onNext: () => void;
}>) {
  return (
    <StepFrame
      step={0}
      title="Your company"
      about="Its name, and what it does in a sentence: the factory's agents read it before they help you."
      onBack={onBack}
      onNext={onNext}
      canGoOn={draft.name.trim() !== ""}
    >
      <div className="grid max-w-xl gap-5">
        <Field label="Name" id="company-name">
          <Input
            id="company-name"
            value={draft.name}
            autoFocus
            placeholder="Acme"
            onChange={(event) => {
              onChange({ name: event.target.value });
            }}
          />
        </Field>
        <Field label="What it does" id="company-about">
          <Input
            id="company-about"
            value={draft.about}
            placeholder="We sell garden tools online."
            onChange={(event) => {
              onChange({ about: event.target.value });
            }}
          />
        </Field>
        <Field
          label="Where the factory keeps its files"
          id="company-folder"
          help="The factory keeps its files on this computer, outside your code: what it knows about your products, its plans and its history."
        >
          <Input
            id="company-folder"
            value={draft.folder}
            placeholder={factoryFolder(
              { ...draft, folder: "" },
              factoriesFolder,
            )}
            onChange={(event) => {
              onChange({ folder: event.target.value });
            }}
          />
        </Field>
      </div>
    </StepFrame>
  );
}

export function Field({
  label,
  id,
  help,
  problem,
  children,
}: Readonly<{
  label: string;
  id: string;
  help?: string;
  problem?: string;
  children: React.ReactNode;
}>) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
      {problem && (
        <p role="alert" className="text-xs text-destructive">
          {problem}
        </p>
      )}
    </div>
  );
}
