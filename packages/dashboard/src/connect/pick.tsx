// A choice from a list, as a plain select with a first "Choose …" line.
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
    <select
      aria-label={label}
      className="h-10 w-full rounded-[10px] border border-input bg-card px-2 text-sm"
      value={value}
      disabled={options.length === 0}
      onChange={(event) => {
        onPick(event.target.value);
      }}
    >
      <option value="">Choose the {label.toLowerCase()}…</option>
      {options.map((one) => (
        <option key={one.value} value={one.value}>
          {one.label}
        </option>
      ))}
    </select>
  );
}
