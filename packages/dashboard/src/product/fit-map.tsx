// The Product map's zoom buttons and how the map is fitted: once its cards
// are measured, and again with the Fit button, centred when it fits its
// box and from its left edge, where the project is, when it is wider
// (fit.ts). Never so small that the cards can't be read (their words at
// about 12px at least): a wider map is dragged sideways.

import {
  ControlButton,
  Controls,
  getNodesBounds,
  getViewportForBounds,
  useNodesInitialized,
  useReactFlow,
  useStore,
} from "@xyflow/react";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { leftWhenWide } from "./fit";
import type { MapNode } from "./map";

const FIT = { padding: 0.35, maxZoom: 1, minZoom: 0.85 };

export function FitMap() {
  const { t } = useTranslation("product");
  const flow = useReactFlow<MapNode>();
  const ready = useNodesInitialized();
  const width = useStore((store) => store.width);
  const height = useStore((store) => store.height);
  const fit = useCallback(() => {
    const nodes = flow.getNodes();
    if (nodes.length === 0 || width === 0) return;
    const bounds = getNodesBounds(nodes);
    const centred = getViewportForBounds(
      bounds,
      width,
      height,
      FIT.minZoom,
      FIT.maxZoom,
      FIT.padding,
    );
    void flow.setViewport(leftWhenWide(centred, bounds, width));
  }, [flow, width, height]);
  useEffect(() => {
    if (ready) fit();
  }, [ready, fit]);
  return (
    <Controls
      showInteractive={false}
      showFitView={false}
      position="bottom-left"
    >
      <ControlButton
        onClick={fit}
        title={t("fit")}
        aria-label={t("fit")}
        className="react-flow__controls-fitview"
      >
        <FitIcon />
      </ControlButton>
    </Controls>
  );
}

// React Flow's own Fit icon, four corners.
function FitIcon() {
  return (
    <svg viewBox="0 0 32 30" aria-hidden>
      <path d="M3.692 4.63c0-.53.4-.938.939-.938h5.215V0H4.708C2.13 0 0 2.054 0 4.63v5.216h3.692V4.631zM27.354 0h-5.2v3.692h5.17c.53 0 .984.4.984.939v5.215H32V4.631A4.624 4.624 0 0027.354 0zm.954 24.83c0 .532-.4.94-.939.94h-5.215v3.768h5.215c2.577 0 4.631-2.13 4.631-4.707v-5.139h-3.692v5.139zm-23.677.94c-.531 0-.939-.4-.939-.94v-5.138H0v5.139c0 2.577 2.13 4.707 4.708 4.707h5.138V25.77H4.631z" />
    </svg>
  );
}
