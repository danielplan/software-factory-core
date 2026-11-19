import * as React from "react";
import { FIELD } from "@/lib/field-style";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        FIELD,
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-[13px] file:font-medium file:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
