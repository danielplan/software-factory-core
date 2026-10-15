import type { ReactNode } from "react";

// The one word of a heading set in the italic serif.
export function Accent({ children }: Readonly<{ children: ReactNode }>) {
  return <span className="font-serif font-normal italic">{children}</span>;
}
