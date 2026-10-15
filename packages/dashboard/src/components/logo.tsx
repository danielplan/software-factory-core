import { cn } from "@/lib/utils";

// The factory's mark: a saw-tooth roof, in a tile with a thin dark outline.
export function LogoTile({ small = false }: Readonly<{ small?: boolean }>) {
  return (
    <span
      className={cn(
        "inline-flex flex-none items-center justify-center border border-foreground bg-card",
        small ? "size-8 rounded-[10px]" : "size-11 rounded-xl",
      )}
    >
      <svg
        width={small ? 16 : 22}
        height={small ? 16 : 22}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 21V9l6 4V9l6 4V5l6 4v12z" />
      </svg>
    </span>
  );
}
