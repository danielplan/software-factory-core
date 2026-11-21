// Variant C: one Updates page with both lists: what we shipped, and
// what Kobble's releases bring.

import { PageHead } from "@/components/page-head";

import { ShippedList } from "./changelog";
import { ReleaseList } from "./release-list";

export function UpdatesPage() {
  return (
    <>
      <PageHead
        title="Updates"
        about="What changed: the work we shipped, and what new Kobble releases bring."
      />
      <div className="mt-4 grid gap-8 lg:grid-cols-2 lg:items-start">
        <section className="grid gap-3">
          <h2 className="text-[15px] font-semibold">What we shipped</h2>
          <ShippedList />
        </section>
        <section>
          <h2 className="text-[15px] font-semibold">What's new in Kobble</h2>
          <div className="mt-3">
            <ReleaseList titled={false} />
          </div>
        </section>
      </div>
    </>
  );
}
