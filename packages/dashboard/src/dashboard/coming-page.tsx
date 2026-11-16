import { Card, CardContent } from "@/components/ui/card";

// The pages still to come, each with what it will hold.
const COMING = {
  today: { title: "Today", about: "What is waiting for you." },
  customers: {
    title: "Customers",
    about: "The companies and people who use your products.",
  },
  products: { title: "Products", about: "Everything this company makes." },
} as const;

export type Coming = keyof typeof COMING;

export function isComing(page: string): page is Coming {
  return Object.hasOwn(COMING, page);
}

// A page that is not built yet: its name, and what will be on it.
export function ComingPage({ page }: Readonly<{ page: Coming }>) {
  const { title, about } = COMING[page];
  return (
    <div className="grid content-start gap-4">
      <h1 className="px-1 pt-1 text-[26px] font-semibold tracking-[-0.02em]">
        {title}
      </h1>
      <Card className="py-5 shadow-soft">
        <CardContent className="grid gap-1 px-5">
          <p className="text-[15px]">{about}</p>
          <p className="text-sm text-muted-foreground">
            This page is coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
