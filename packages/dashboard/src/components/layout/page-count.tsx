// A count beside a page's name in the sidebar: a badge when it is something
// waiting for you (the new signals), a quiet number otherwise. Nothing when
// there is nothing to count.

export function PageCount({
  n,
  badge = false,
}: Readonly<{ n: number; badge?: boolean }>) {
  if (n <= 0) return null;
  return badge ? (
    <span className="ml-auto grid h-[18px] min-w-[18px] place-items-center rounded-md bg-wash px-1.5 text-[11px] font-medium text-wash-foreground">
      {n}
    </span>
  ) : (
    <span className="ml-auto text-xs text-sidebar-muted">{n}</span>
  );
}
