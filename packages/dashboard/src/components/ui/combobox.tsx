// A combobox: a button with the chosen option and a chevron (looking like
// every other field, lib/field-style.ts) that opens a list under it, the
// chosen one ticked. Arrow keys move through the list, Enter or a click
// picks, Escape closes. A long list (more than SEARCH_FROM options) gets a
// search box on top.

import { Check, ChevronDown } from "lucide-react";
import { Popover } from "radix-ui";
import { type KeyboardEvent, type RefObject, useRef, useState } from "react";

import { FIELD } from "@/lib/field-style";
import { cn } from "@/lib/utils";

export type ComboOption = { value: string; label: string };

const SEARCH_FROM = 7;

export function Combobox({
  id,
  value,
  options,
  onChange,
  placeholder = "Choose…",
  label,
  disabled = false,
  className,
}: Readonly<{
  id?: string;
  value: string;
  options: ComboOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  // Said to a screen reader when there is no visible label.
  label?: string;
  disabled?: boolean;
  className?: string;
}>) {
  const { open, toggle, search, setSearch, list, shown, pick } = useCombo(
    options,
    onChange,
  );
  const chosen = options.find((one) => one.value === value);
  return (
    <Popover.Root open={open} onOpenChange={toggle}>
      <Popover.Trigger asChild disabled={disabled}>
        <Field
          id={id}
          open={open}
          label={label}
          text={chosen?.label ?? null}
          placeholder={placeholder}
          className={className}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(event) => {
            // The chosen option (or the search box) takes the focus.
            event.preventDefault();
            focusFirst(list.current, options.length >= SEARCH_FROM);
          }}
          className="z-50 grid max-h-72 w-(--radix-popover-trigger-width) min-w-44 overflow-hidden rounded-lg border border-border bg-card p-1 text-[13px] shadow-[0_12px_32px_-12px_rgb(20_24_36/0.25)]"
        >
          <List
            list={list}
            options={shown}
            value={value}
            search={options.length >= SEARCH_FROM ? search : null}
            onSearch={setSearch}
            onPick={pick}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// Open or not, what is searched for, the options it leaves, and picking
// one (which closes the list).
function useCombo(options: ComboOption[], onChange: (value: string) => void) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const shown = search
    ? options.filter((one) =>
        one.label.toLowerCase().includes(search.toLowerCase()),
      )
    : options;
  const toggle = (now: boolean) => {
    setOpen(now);
    if (!now) setSearch("");
  };
  const pick = (picked: string) => {
    onChange(picked);
    toggle(false);
  };
  return { open, toggle, search, setSearch, list, shown, pick };
}

// The closed combobox: a field with the chosen option and a chevron.
function Field({
  id,
  open,
  label,
  text,
  placeholder,
  className,
  ...trigger
}: Readonly<{
  id: string | undefined;
  open: boolean;
  label: string | undefined;
  text: string | null;
  placeholder: string;
  className: string | undefined;
}>) {
  return (
    <button
      {...trigger}
      id={id}
      type="button"
      role="combobox"
      aria-expanded={open}
      aria-label={label}
      className={cn(
        FIELD,
        "flex items-center justify-between gap-2 text-left",
        className,
      )}
    >
      <span className={cn("truncate", !text && "text-faint")}>
        {text ?? placeholder}
      </span>
      <ChevronDown
        aria-hidden
        className="size-3.5 flex-none text-muted-foreground"
      />
    </button>
  );
}

// The open list: a search box when the list is long, the options with the
// chosen one ticked.
function List({
  list,
  options,
  value,
  search,
  onSearch,
  onPick,
}: Readonly<{
  list: RefObject<HTMLDivElement | null>;
  options: ComboOption[];
  value: string;
  search: string | null;
  onSearch: (text: string) => void;
  onPick: (value: string) => void;
}>) {
  return (
    <div
      ref={list}
      role="listbox"
      className="grid gap-px overflow-y-auto"
      onKeyDown={move}
    >
      {search !== null && (
        <input
          data-search
          value={search}
          placeholder="Search…"
          onChange={(event) => {
            onSearch(event.target.value);
          }}
          className="mb-1 h-8 border-b border-border bg-transparent px-2 outline-none placeholder:text-faint"
        />
      )}
      {options.map((one) => (
        <button
          key={one.value}
          type="button"
          role="option"
          aria-selected={one.value === value}
          data-option
          data-chosen={one.value === value || undefined}
          onClick={() => {
            onPick(one.value);
          }}
          className="flex h-8 items-center gap-2 rounded-md px-2 text-left outline-none hover:bg-[#f1f1f3] focus-visible:bg-[#ececef]"
        >
          <span className="flex-1 truncate">{one.label}</span>
          {one.value === value && (
            <Check aria-hidden className="size-3.5 text-foreground" />
          )}
        </button>
      ))}
      {options.length === 0 && (
        <p className="px-2 py-2 text-faint">Nothing matches</p>
      )}
    </div>
  );
}

// The search box, or the chosen option, or the first one.
function focusFirst(list: HTMLDivElement | null, searching: boolean): void {
  if (!list) return;
  const target =
    (searching && list.querySelector<HTMLElement>("[data-search]")) ||
    list.querySelector<HTMLElement>("[data-chosen]") ||
    list.querySelector<HTMLElement>("[data-option]");
  target?.focus();
}

// Up and down through the options (from the search box too).
function move(event: KeyboardEvent<HTMLDivElement>): void {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  event.preventDefault();
  const options = [
    ...event.currentTarget.querySelectorAll<HTMLElement>("[data-option]"),
  ];
  if (options.length === 0) return;
  const at = options.indexOf(document.activeElement as HTMLElement);
  const step = event.key === "ArrowDown" ? 1 : -1;
  const from = at === -1 && step === -1 ? 0 : at;
  const next = (from + step + options.length) % options.length;
  options[next]?.focus();
}
