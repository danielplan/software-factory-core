import { CircleAlert } from "lucide-react";

import { Markdown } from "@/components/markdown";

// Something that went wrong, in plain words, in a soft red card; a link in
// it ([Settings](#settings)) leads to where it is put right.
export function ProblemBox({
  title,
  text,
}: Readonly<{ title: string; text?: string }>) {
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-xl border border-destructive/20 bg-destructive/[0.07] px-4 py-3 text-[13px]"
    >
      <CircleAlert
        className="mt-0.5 size-4 flex-none text-destructive"
        aria-hidden
      />
      <div className="grid gap-0.5">
        <p className="font-medium text-destructive">{title}</p>
        {text && (
          <div className="text-foreground/80 [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2">
            <Markdown text={text} inline />
          </div>
        )}
      </div>
    </div>
  );
}
