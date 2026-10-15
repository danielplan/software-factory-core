import { Factory } from "lucide-react";

// The navy bar along the top: the product's name, and the company's once
// it is set up.
export function TopBar({ company }: Readonly<{ company: string | null }>) {
  return (
    <header className="bg-navy text-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
        <Factory className="size-5 text-brand-soft" aria-hidden />
        <span className="font-semibold">Software factory</span>
        {company && (
          <>
            <span className="text-white/40" aria-hidden>
              /
            </span>
            <span className="truncate text-brand-soft">{company}</span>
          </>
        )}
      </div>
    </header>
  );
}
