import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

// A labelled input, with its help and, when a value was refused, why.
export function Field({
  label,
  id,
  help,
  problem,
  children,
}: Readonly<{
  label: string;
  id: string;
  help?: string;
  problem?: string;
  children: ReactNode;
}>) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
      {problem && (
        <p role="alert" className="text-xs text-destructive">
          {problem}
        </p>
      )}
    </div>
  );
}
