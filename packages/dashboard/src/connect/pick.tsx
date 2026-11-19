import { Combobox } from "@/components/ui/combobox";

// A choice from a list, with "Choose the …" until one is chosen.
export function Pick({
  label,
  value,
  options,
  onPick,
}: Readonly<{
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onPick: (value: string) => void;
}>) {
  return (
    <Combobox
      label={label}
      value={value}
      options={options}
      onChange={onPick}
      disabled={options.length === 0}
      placeholder={`Choose the ${label.toLowerCase()}…`}
    />
  );
}

// Which of the board's work the factory takes in: all of it (the usual),
// or only what carries a label.
export function WhichWork({
  value,
  onPick,
  noun,
}: Readonly<{ value: string; onPick: (value: string) => void; noun: string }>) {
  return (
    <Pick
      label="Work the factory takes in"
      value={value}
      options={[
        { value: "*", label: `Every ${noun.replace(/s$/, "")} on the board` },
        { value: "factory", label: `Only ${noun} labelled “factory”` },
      ]}
      onPick={onPick}
    />
  );
}
