// The two kinds of card on the Product map: the project the factory is
// connected to, and a piece of the product with its kind, whether it runs
// and a few things it is built with. Each card is a button (by mouse or
// keyboard) that shows its details in the panel beside the map.

import { Handle, type NodeProps, Position } from "@xyflow/react";
import { FolderGit2, GitBranch } from "lucide-react";
import { useTranslation } from "react-i18next";

import { StatusLight } from "@/components/status-light";
import { lightWords } from "@/dashboard/part-card";
import { cn } from "@/lib/utils";

import { useChoose } from "./choose";
import type { ProductNode, ProjectNode } from "./map";

const CARD =
  "nodrag nopan grid cursor-pointer rounded-2xl bg-card p-4 text-left shadow-float transition-shadow outline-none hover:shadow-lift focus-visible:ring-2 focus-visible:ring-ring";
const CHOSEN = "ring-2 ring-primary";

export function ProjectNodeView({
  id,
  data,
  selected,
}: NodeProps<ProjectNode>) {
  const { t } = useTranslation("product");
  const choose = useChoose();
  const { project } = data;
  return (
    <>
      <button
        type="button"
        aria-label={t("project.open", { name: project.name })}
        onClick={() => {
          choose(id);
        }}
        className={cn(CARD, "w-[210px] gap-2", selected && CHOSEN)}
      >
        <span className="flex items-center gap-1.5 text-tag text-success">
          <span aria-hidden className="size-2 rounded-full bg-success" />
          {t("project.connected")}
        </span>
        <span className="flex items-center gap-2 text-item">
          <FolderGit2 aria-hidden className="size-4 text-muted-foreground" />
          {project.name}
        </span>
        {project.branch && (
          <span className="flex items-center gap-1.5 text-tag text-muted-foreground">
            <GitBranch aria-hidden className="size-3.5" />
            {project.branch}
          </span>
        )}
      </button>
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </>
  );
}

export function ProductNodeView({
  id,
  data,
  selected,
}: NodeProps<ProductNode>) {
  const { t } = useTranslation("product");
  const choose = useChoose();
  const { product, part, kind, chips, more } = data;
  const lit = part && part.light !== "none" ? part : null;
  return (
    <>
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <button
        type="button"
        aria-label={t("card.open", { name: product.name })}
        onClick={() => {
          choose(id);
        }}
        className={cn(
          CARD,
          "w-[240px] gap-2.5",
          lit?.light === "problem" && "ring-2 ring-destructive/60",
          selected && CHOSEN,
        )}
      >
        <span className="grid gap-0.5">
          <span className="truncate text-item">{product.name}</span>
          <span className="truncate text-tag text-muted-foreground">
            {kind}
          </span>
        </span>
        {lit && (
          <span className="flex items-center gap-1.5 text-tag text-foreground-2">
            <StatusLight light={lit.light} />
            {lightWords(lit)}
          </span>
        )}
        {chips.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {chips.map((chip) => (
              <span
                key={chip}
                className="rounded-md bg-tint px-1.5 py-0.5 text-tag text-tint-foreground"
              >
                {chip}
              </span>
            ))}
            {more > 0 && (
              <span className="px-1 py-0.5 text-tag text-muted-foreground">
                {t("card.more", { count: more })}
              </span>
            )}
          </span>
        )}
      </button>
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </>
  );
}
