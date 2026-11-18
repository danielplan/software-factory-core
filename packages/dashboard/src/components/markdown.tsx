import type { Components } from "react-markdown";
import Shown from "react-markdown";
import remarkGfm from "remark-gfm";

// Text written in Markdown (a card on the board, its plan, what the factory
// and the owner said): paragraphs, headings, bold, lists, links, code and
// small tables, styled to sit in a panel. Links open in a new tab; pictures
// and raw HTML are not shown.
export function Markdown({ text }: Readonly<{ text: string }>) {
  return (
    <div className="grid gap-2">
      <Shown
        remarkPlugins={[remarkGfm]}
        components={PARTS}
        disallowedElements={["img"]}
        unwrapDisallowed
      >
        {text}
      </Shown>
    </div>
  );
}

const PARTS: Components = {
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-primary underline underline-offset-2 transition-colors hover:text-primary/80"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="grid list-disc gap-1 pl-5 marker:text-muted-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="grid list-decimal gap-1 pl-5 marker:text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  h1: ({ children }) => (
    <p className="pt-1 text-[15px] font-semibold">{children}</p>
  ),
  h2: ({ children }) => (
    <p className="pt-1 text-[14.5px] font-semibold">{children}</p>
  ),
  h3: ({ children }) => <p className="font-semibold">{children}</p>,
  code: ({ children }) => (
    <code className="rounded bg-surface-2 px-1 py-0.5 text-[0.92em]">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-lg bg-surface-2 p-3 text-[0.92em] [&_code]:bg-transparent [&_code]:p-0">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="rounded-lg bg-surface-2 px-3 py-2 text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-border" />,
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-[0.92em]">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-border px-2 py-1 font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border/60 px-2 py-1">{children}</td>
  ),
};
