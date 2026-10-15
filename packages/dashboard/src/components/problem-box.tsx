import { CircleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Something that went wrong, in plain words.
export function ProblemBox({
  title,
  text,
}: Readonly<{ title: string; text?: string }>) {
  return (
    <Alert variant="destructive">
      <CircleAlert aria-hidden />
      <AlertTitle>{title}</AlertTitle>
      {text && <AlertDescription>{text}</AlertDescription>}
    </Alert>
  );
}
