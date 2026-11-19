import { Combobox } from "@/components/ui/combobox";
import { useT } from "@/i18n/use-t";

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
  const t = useT();
  return (
    <Combobox
      label={label}
      value={value}
      options={options}
      onChange={onPick}
      disabled={options.length === 0}
      placeholder={t.connect.pick.choose(label)}
    />
  );
}

// Which of the board's work the factory takes in: all of it (the usual),
// or only what carries a label.
export function WhichWork({
  value,
  onPick,
  noun,
}: Readonly<{
  value: string;
  onPick: (value: string) => void;
  noun: "cards" | "issues";
}>) {
  const t = useT();
  return (
    <Pick
      label={t.connect.pick.work}
      value={value}
      options={[
        { value: "*", label: t.connect.pick.every[noun] },
        { value: "factory", label: t.connect.pick.only[noun] },
      ]}
      onPick={onPick}
    />
  );
}
