// Draws a diagram the kobold wrote in Mermaid (a short text description) as
// a picture. Mermaid, a widely used library, is large, so it is loaded only
// when the first diagram is shown. Its strict mode cleans what it draws, so
// a diagram cannot run anything in the page.

import { useEffect, useState } from "react";

let counter = 0;

async function drawDiagram(text: string): Promise<string> {
  const { default: mermaid } = await import("mermaid");
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "neutral",
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif",
    flowchart: { useMaxWidth: false },
  });
  counter += 1;
  const { svg } = await mermaid.render(`diagram-${String(counter)}`, text);
  return svg;
}

// A diagram's picture, drawn again when its text changes; or why it could
// not be drawn.
export function useDiagram(text: string): {
  svg: string | null;
  problem: string | null;
} {
  const [drawn, setDrawn] = useState<{
    text: string;
    svg: string | null;
    problem: string | null;
  } | null>(null);
  useEffect(() => {
    let stale = false;
    drawDiagram(text).then(
      (svg) => {
        if (!stale) setDrawn({ text, svg, problem: null });
      },
      (error: unknown) => {
        if (!stale)
          setDrawn({
            text,
            svg: null,
            problem: error instanceof Error ? error.message : String(error),
          });
      },
    );
    return () => {
      stale = true;
    };
  }, [text]);
  return drawn?.text === text
    ? { svg: drawn.svg, problem: drawn.problem }
    : { svg: null, problem: null };
}
