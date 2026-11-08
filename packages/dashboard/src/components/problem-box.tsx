import { CircleAlert } from "lucide-react";

// Something that went wrong, in plain words, in a soft red card.
export function ProblemBox({
  title,
  text,
}: Readonly<{ title: string; text?: string }>) {
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-2xl border border-destructive/20 bg-destructive/[0.07] px-4 py-3 text-sm"
    >
      <CircleAlert
        className="mt-0.5 size-4 flex-none text-destructive"
        aria-hidden
      />
      <div className="grid gap-0.5">
        <p className="font-medium text-destructive">{title}</p>
        {text && <p className="text-foreground/80">{text}</p>}
      </div>
    </div>
  );
}
