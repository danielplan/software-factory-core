// Draws a diagram the kobold wrote in Mermaid (a short text description) as
// a picture. Mermaid, a widely used library, is large, so it is loaded only
// when the first diagram is shown. Its strict mode cleans what it draws, so
// a diagram cannot run anything in the page. It is drawn in the app's own
// look, from the theme's colours: soft tinted boxes with rounded corners, a
// hairline, the app's font and grey arrows.

import { useEffect, useState } from "react";

let counter = 0;

// A colour of the company's theme, or the app's own when it has none.
function token(name: string, otherwise: string): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || otherwise;
}

function look() {
  const text = token("--foreground", "#141824");
  return {
    theme: "base" as const,
    fontFamily: token("--font-body", "Inter Variable, Inter, sans-serif"),
    themeVariables: {
      fontSize: "12px",
      primaryColor: token("--tint", "#f3f5fc"),
      primaryBorderColor: token("--tint-line", "#e1e6f7"),
      primaryTextColor: text,
      secondaryColor: token("--card", "#ffffff"),
      tertiaryColor: token("--card", "#ffffff"),
      lineColor: token("--arrow", "#a7afc0"),
      textColor: text,
      edgeLabelBackground: token("--card", "#ffffff"),
    },
    themeCSS: [
      ".node rect, .node polygon, .node circle { rx: 8px; ry: 8px; stroke-width: 1px; }",
      ".flowchart-link { stroke-width: 1.25px; }",
      ".edgeLabel { font-size: 11px; color: " +
        token("--muted-foreground", "#667085") +
        "; }",
      ".cluster rect { rx: 10px; ry: 10px; }",
    ].join(" "),
  };
}

async function drawDiagram(text: string): Promise<string> {
  const { default: mermaid } = await import("mermaid");
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    ...look(),
    flowchart: { useMaxWidth: false, curve: "basis", padding: 12 },
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
