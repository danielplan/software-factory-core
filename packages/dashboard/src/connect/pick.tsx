import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <Select
      value={value}
      onValueChange={onPick}
      disabled={options.length === 0}
    >
      <SelectTrigger aria-label={label} className="h-10 w-full bg-card">
        <SelectValue placeholder={`Choose the ${label.toLowerCase()}…`} />
      </SelectTrigger>
      <SelectContent>
        {options.map((one) => (
          <SelectItem key={one.value} value={one.value}>
            {one.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Which of the board's work the factory takes in: what carries its label,
// or all of it.
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
        { value: "factory", label: `Only ${noun} labelled “factory”` },
        { value: "*", label: `Every ${noun.replace(/s$/, "")} on the board` },
      ]}
      onPick={onPick}
    />
  );
}
