// Product (#products): what the product is made of and whether each piece
// runs, as a map on a dotted canvas (React Flow, read only: it can be moved
// and zoomed). The project on the left, then each piece after the ones it
// needs, joined by arrows that move while the piece they lead to runs.
// Beside the map, always, a panel: what the map is, or the piece chosen
// (by clicking it, or with the keyboard; Escape goes back). Under it, the
// factory's own programs, if any. Start all and Stop all are at the top.

import "@xyflow/react/dist/style.css";

import {
  Background,
  BackgroundVariant,
  MarkerType,
  type NodeTypes,
  ReactFlow,
} from "@xyflow/react";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import {
  messageOf,
  type PartView,
  post,
  type ProductPage as Page,
} from "@/api";
import { PageHead } from "@/components/page-head";
import { ProblemBox } from "@/components/problem-box";
import { StatusLight } from "@/components/status-light";
import { Button } from "@/components/ui/button";
import type { FactoryState } from "@/dashboard/dashboard";
import { lightWords, PartButtons, PartProblem } from "@/dashboard/part-card";
import { useRead } from "@/understand/use-records";

import { kitWords } from "@/lib/server-words";
import { useDownToTheEnd } from "@/lib/use-down-to-the-end";

import { ChooseContext } from "./choose";
import { Panel } from "./details";
import { FitMap } from "./fit-map";
import { type MapNode, mapOf, type Product } from "./map";
import { ProductNodeView, ProjectNodeView } from "./nodes";

type Press = (path: string) => void;

const NODE_TYPES: NodeTypes = {
  project: ProjectNodeView,
  product: ProductNodeView,
};

// The map in the dashboard's own colours, light and dark.
const COLOURS = {
  "--xy-background-color": "var(--canvas)",
  "--xy-background-pattern-dots-color": "var(--canvas-dot)",
  "--xy-attribution-background-color": "transparent",
  "--xy-edge-stroke": "var(--arrow)",
  "--xy-controls-button-background-color": "var(--card)",
  "--xy-controls-button-border-color": "var(--border)",
  "--xy-controls-button-color": "var(--foreground)",
} as React.CSSProperties;

export function ProductPage({ state }: Readonly<{ state: FactoryState }>) {
  const { t } = useTranslation("product");
  // Read again when the products change (the server ignores the query).
  const ids = state.products.map((product) => product.id).join(",");
  const { data, problem } = useRead(
    `/api/product?v=${encodeURIComponent(ids)}`,
  ) as { data: Page | null; problem: string | null };
  const [pressed, setPressed] = useState<string | null>(null);
  const press: Press = (path) => {
    setPressed(null);
    post(path).catch((error: unknown) => {
      setPressed(messageOf(error));
    });
  };
  const runs = state.parts.some((part) => part.area === "products");
  return (
    <div className="grid content-start gap-4">
      <PageHead title={t("title")} />
      {problem && <ProblemBox title={t("cantRead")} text={problem} />}
      {pressed && <ProblemBox title={t("didntWork")} text={pressed} />}
      {data && (
        <ProductMap
          page={data}
          state={state}
          onPress={press}
          footer={runs && <StartStop onPress={press} />}
        />
      )}
      <OwnPrograms
        parts={state.parts.filter((part) => part.area === "factory")}
        onPress={press}
      />
    </div>
  );
}

function StartStop({ onPress }: Readonly<{ onPress: Press }>) {
  const { t } = useTranslation("product");
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          onPress("/api/start-all");
        }}
      >
        {t("startAll")}
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          onPress("/api/stop-all");
        }}
      >
        {t("stopAll")}
      </Button>
    </>
  );
}

function ProductMap({
  page,
  state,
  onPress,
  footer,
}: Readonly<{
  page: Page;
  state: FactoryState;
  onPress: Press;
  footer: ReactNode;
}>) {
  const { t } = useTranslation("product");
  const [chosen, choose] = useState<string | null>(null);
  // Down to the end of the page: the page's padding and the frame below.
  const [area, height] = useDownToTheEnd("3.25rem");
  const { parts } = state;
  const map = useMap(page, state);
  useEscape(() => {
    choose(null);
  });
  const nodes: MapNode[] = map.nodes.map((node) => ({
    ...node,
    selected: node.id === chosen,
  }));
  const pieces = page.products
    .map((product) => parts.find((part) => part.id === product.id))
    .filter((part): part is PartView => part !== undefined);
  return (
    <div
      ref={area}
      style={{ "--map-height": height } as CSSProperties}
      className="grid items-stretch gap-4 lg:min-h-(--map-height) lg:grid-cols-[minmax(0,1fr)_340px]"
    >
      <div className="relative h-[420px] overflow-hidden rounded-[18px] shadow-soft lg:h-auto">
        <ChooseContext.Provider value={choose}>
          <ReactFlow<MapNode>
            nodes={nodes}
            edges={map.edges.map((edge) => ({
              ...edge,
              markerEnd: { type: MarkerType.ArrowClosed },
            }))}
            nodeTypes={NODE_TYPES}
            onPaneClick={() => {
              choose(null);
            }}
            // A node that is neither selectable nor draggable takes no
            // clicks at all in React Flow unless it has a click handler;
            // the button inside each card still opens it by keyboard.
            onNodeClick={(_, node) => {
              choose(node.id);
            }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            edgesFocusable={false}
            minZoom={0.3}
            maxZoom={1.5}
            aria-label={t("mapLabel")}
            style={COLOURS}
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1.5} />
            <FitMap />
          </ReactFlow>
        </ChooseContext.Provider>
      </div>
      <Panel
        node={nodes.find((node) => node.id === chosen) ?? null}
        project={page.project}
        products={pieces}
        onPress={onPress}
        onBack={() => {
          choose(null);
        }}
        footer={footer}
      />
    </div>
  );
}

// The map's cards and arrows; each product named by its kit, in the
// dashboard's language.
function useMap(page: Page, { parts, kits }: FactoryState) {
  return useMemo(() => {
    const kindOf = (product: Product) =>
      kits.map(kitWords).find((kit) => kit.id === product.kit)?.name ??
      product.kind;
    return mapOf(page, parts, kindOf);
  }, [page, parts, kits]);
}

// Escape goes back to the map's overview.
function useEscape(back: () => void) {
  useEffect(() => {
    const press = (event: KeyboardEvent) => {
      if (event.key === "Escape") back();
    };
    window.addEventListener("keydown", press);
    return () => {
      window.removeEventListener("keydown", press);
    };
  }, [back]);
}

// The factory's own programs (an add-on's, for example), under the map:
// each with its light, what it is doing, its buttons and what went wrong.
function OwnPrograms({
  parts,
  onPress,
}: Readonly<{ parts: PartView[]; onPress: Press }>) {
  const { t } = useTranslation("product");
  if (parts.length === 0) return null;
  return (
    <section aria-label={t("own.title")} className="grid gap-2">
      <h2 className="text-section">{t("own.title")}</h2>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {parts.map((part) => (
          <li
            key={part.id}
            className="grid content-start gap-2 rounded-2xl bg-card p-4 shadow-soft"
          >
            <span className="flex items-center gap-2">
              <StatusLight light={part.light} />
              <span className="truncate text-item">{part.name}</span>
              <span className="ml-auto text-tag text-muted-foreground">
                {lightWords(part)}
              </span>
            </span>
            <PartButtons part={part} onPress={onPress} />
            {part.problem && <PartProblem problem={part.problem} />}
          </li>
        ))}
      </ul>
    </section>
  );
}
