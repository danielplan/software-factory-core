// Made-up list of what we shipped (finished cards by week, in plain
// words), to try the idea.

import { CircleCheck } from "lucide-react";

import { CARD } from "@/signals/bits";

const SHIPPED = [
  {
    week: "This week",
    items: [
      { number: 42, text: "Searching the shop now finds products by colour." },
      {
        number: 40,
        text: "The basket remembers what you added after you sign in again.",
      },
    ],
  },
  {
    week: "Last week",
    items: [
      { number: 37, text: "Checkout shows the delivery date before you pay." },
      {
        number: 35,
        text: "Fixed: the order list jumped to the top after cancelling an order, with a very long product name such as /Users/someone/Documents/very-long-folder-name.",
      },
      { number: 33, text: "Product pictures load faster on a phone." },
    ],
  },
  {
    week: "2 weeks ago",
    items: [{ number: 29, text: "New: a wish list, from any product page." }],
  },
];

export function ShippedList() {
  return (
    <div className="grid gap-4">
      {SHIPPED.map((week) => (
        <section key={week.week} className="grid gap-1.5">
          <h3 className="text-[13px] font-semibold">{week.week}</h3>
          <ul className={`${CARD} grid`}>
            {week.items.map((item) => (
              <li
                key={item.number}
                className="flex items-start gap-3 border-t border-border-soft px-5 py-3 text-[13px] first:border-t-0"
              >
                <CircleCheck
                  aria-hidden
                  className="mt-0.5 size-4 flex-none text-success"
                />
                <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                  {item.text}
                </span>
                <span className="flex-none text-xs text-muted-foreground">
                  #{item.number}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-xs text-muted-foreground">Made-up example entries.</p>
    </div>
  );
}
