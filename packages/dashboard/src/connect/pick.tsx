import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { t } from "@/i18n/i18n";

// A choice from a list, with "Choose…" until one is chosen.
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
        <SelectValue placeholder={t("settings:pick.choose")} />
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

// Which of the board's work the factory takes in: all of it (the usual),
// or only what carries a label.
export function WhichWork({
  value,
  onPick,
}: Readonly<{ value: string; onPick: (value: string) => void }>) {
  return (
    <Pick
      label={t("settings:pick.which")}
      value={value}
      options={[
        { value: "*", label: t("settings:pick.all") },
        { value: "factory", label: t("settings:pick.labelled") },
      ]}
      onPick={onPick}
    />
  );
}
