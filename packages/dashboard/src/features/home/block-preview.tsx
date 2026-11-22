// What a block looks like, drawn small, for the dialog that adds one.

function Bar({ w, dark = false }: Readonly<{ w: string; dark?: boolean }>) {
  return (
    <span
      className={
        "block h-1.5 rounded-full " +
        (dark ? "bg-foreground/35" : "bg-foreground/15")
      }
      style={{ width: w }}
    />
  );
}

function Rows({ n, tag }: Readonly<{ n: number; tag: string }>) {
  return (
    <>
      {Array.from({ length: n }, (_, at) => (
        <div
          key={at}
          className="flex items-center gap-2 border-t border-border-soft px-2 py-1.5 first:border-t-0"
        >
          <span className={"h-1.5 w-6 rounded-full " + tag} />
          <span className="grid flex-1 gap-1">
            <Bar w={at % 2 ? "70%" : "85%"} dark />
            <Bar w="50%" />
          </span>
          <span className="h-3.5 w-8 rounded border border-border" />
        </div>
      ))}
    </>
  );
}

const FRAME = "overflow-hidden rounded-lg border border-border bg-card";

// A block this list does not know (a team's own) is drawn as a few rows.
export function BlockPreview({ id }: Readonly<{ id: string }>) {
  switch (id) {
    case "status":
      return (
        <div className="flex items-center gap-2 py-1">
          <span className="size-2 rounded-full bg-foreground/25" />
          <Bar w="60%" dark />
          <span className="ml-auto h-1.5 w-8 rounded-full bg-blue/50" />
        </div>
      );
    case "loop":
      return (
        <div className={FRAME + " grid grid-cols-4"}>
          {[0, 1, 2, 3].map((n) => (
            <div
              key={n}
              className="grid gap-1 border-l border-border-soft p-2 first:border-l-0"
            >
              <Bar w="60%" dark />
              <span className="h-3 w-4 rounded bg-foreground/30" />
              <Bar w="80%" />
            </div>
          ))}
        </div>
      );
    case "exploring":
      return (
        <div className={FRAME}>
          <Rows n={2} tag="bg-explore/60" />
        </div>
      );
    case "signals":
      return (
        <div className={FRAME}>
          <Rows n={2} tag="bg-understand/60" />
        </div>
      );
    case "reviews":
      return (
        <div className={FRAME}>
          <Rows n={2} tag="bg-build/60" />
        </div>
      );
    default:
      return (
        <div className={FRAME}>
          <Rows n={id === "waiting" ? 3 : 2} tag="bg-explore/60" />
        </div>
      );
  }
}
