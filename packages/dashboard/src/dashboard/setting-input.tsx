import type { GroupView } from "@/api";
import { Field } from "@/components/field";
import { Input } from "@/components/ui/input";

// A secret the server says is set; its value is never sent to the page.
const SECRET_SET = "(set)";

type SettingView = GroupView["fields"][number];

// One setting: a choice, or text (a secret as a password, never shown).
export function SettingInput({
  id,
  field,
  typed,
  problem,
  onType,
}: Readonly<{
  id: string;
  field: SettingView;
  typed: string | undefined;
  problem: string | undefined;
  onType: (value: string) => void;
}>) {
  const { label, help, shown } = describe(field, typed);
  return (
    <Field id={id} label={label} help={help} {...(problem ? { problem } : {})}>
      {field.kind === "choice" ? (
        <select
          id={id}
          className="h-10 rounded-[10px] border border-input bg-card px-2 text-sm"
          value={shown}
          onChange={(event) => {
            onType(event.target.value);
          }}
        >
          {field.choices?.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
      ) : (
        <Input
          id={id}
          type={field.kind === "secret" ? "password" : "text"}
          inputMode={field.kind === "number" ? "numeric" : undefined}
          autoComplete="off"
          placeholder={field.default ?? ""}
          value={shown}
          onChange={(event) => {
            onType(event.target.value);
          }}
        />
      )}
    </Field>
  );
}

// A setting's label and help, and what its box shows: a secret that is set
// says so, and its box stays empty until a new one is typed.
function describe(field: SettingView, typed: string | undefined) {
  const secret = field.kind === "secret";
  const set = secret && field.value === SECRET_SET;
  return {
    label: set ? `${field.label} (set)` : field.label,
    help: set ? `${field.help} Type a new one to replace it.` : field.help,
    shown: typed ?? (secret ? "" : (field.value ?? "")),
  };
}
