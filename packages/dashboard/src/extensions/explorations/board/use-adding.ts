// What the toolbar does on the board: the tool that is on (the pen or the
// note), the note being typed (also from a double-click on empty space),
// the stroke being drawn, a pasted or dropped web address, the Delete key for
// what is the person's, and Esc to leave a tool. The person's things are
// kept on the server (mine/mine-state.tsx); Doodle hears of them from there.

import { useReactFlow } from "@xyflow/react";
import { type RefObject, useEffect, useRef, useState } from "react";

import { useBoardDo } from "./frame";
import { useMine } from "./mine/mine-state";
import type { Drawing } from "./mine/own";
import type { Tool } from "./mine/tool-layer";
import type { ThingNode } from "./nodes";

export type Client = { x: number; y: number };

const typing = (event: Event) =>
  event.target instanceof HTMLElement &&
  event.target.matches("input, textarea, [contenteditable]");

export function useAdding(
  nodes: ThingNode[],
  act: ReturnType<typeof useBoardDo>,
  flowAt: (client: Client | null) => { x: number; y: number },
) {
  const mine = useMine();
  const { screenToFlowPosition } = useReactFlow();
  const [tool, setTool] = useState<Tool>(null);
  const [writing, setWriting] = useState<{ x: number; y: number } | null>(null);
  const [drawing, setDrawing] = useState<Drawing | null>(null);

  const writeAt = (at: { x: number; y: number }) => {
    setTool(null);
    setWriting(at);
  };
  // A link card at the pointer, or in the middle of the view (one a little
  // lower and to the right of the one before, so none hides another).
  const placed = useRef(0);
  const addLink = (address: string, client: Client | null = null) => {
    const at = flowAt(client);
    const more = client ? 0 : placed.current++ % 5;
    mine.link(address, { x: at.x - 140 + more * 28, y: at.y - 40 + more * 28 });
  };

  useKeys(nodes, act, setTool, setWriting);

  return {
    tool,
    setTool,
    writing,
    stopWriting: () => {
      setWriting(null);
    },
    writeAt,
    // A click on the board's empty ground lets go of what was selected.
    deselect: () => {
      mine.select(null);
    },
    drawing,
    setDrawing,
    addLink,
    onDoubleClick: (event: React.MouseEvent) => {
      if (!(event.target as Element).classList.contains("react-flow__pane"))
        return;
      writeAt(screenToFlowPosition({ x: event.clientX, y: event.clientY }));
    },
  };
}

// Esc leaves a tool; Delete takes off what is selected, if it is theirs (a
// mark, a card of theirs, or a picture they put there).
function useKeys(
  nodes: ThingNode[],
  act: ReturnType<typeof useBoardDo>,
  setTool: (tool: Tool) => void,
  setWriting: (at: { x: number; y: number } | null) => void,
) {
  const mine = useMine();
  useEffect(() => {
    const removeSelected = (event: KeyboardEvent) => {
      if (mine.selected) {
        event.preventDefault();
        if (mine.own.marks.some((one) => one.id === mine.selected))
          mine.erase(mine.selected);
        else mine.remove(mine.selected);
        return;
      }
      const card = nodes.find(
        (n) =>
          n.selected &&
          n.data.thing.by === "person" &&
          n.data.thing.kind === "picture",
      );
      if (card) act("board", { do: { act: "remove", id: card.id } });
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTool(null);
        setWriting(null);
      } else if (
        (event.key === "Delete" || event.key === "Backspace") &&
        !typing(event)
      )
        removeSelected(event);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  });
}

// Where the pointer is on the board (null when it is off the board), and how
// a point on the screen becomes one on the board: the pointer's, or the
// middle of the view when it is off.
export function useBoardPoint(area: RefObject<HTMLDivElement | null>) {
  const { screenToFlowPosition } = useReactFlow();
  const pointer = useRef<Client | null>(null);
  useEffect(() => {
    const element = area.current;
    if (!element) return;
    const move = (event: PointerEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY };
    };
    const leave = () => {
      pointer.current = null;
    };
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerleave", leave);
    return () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", leave);
    };
  }, [area]);
  const flowAt = (client: Client | null) => {
    const box = area.current?.getBoundingClientRect();
    const middle = box
      ? { x: box.left + box.width / 2, y: box.top + box.height / 2 }
      : { x: 0, y: 0 };
    return screenToFlowPosition(client ?? middle);
  };
  return { pointer, flowAt };
}
