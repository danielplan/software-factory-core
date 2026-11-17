// The panel beside the Product map, always there. With nothing chosen, what
// the map is, in everyday words: what the cards and arrows mean, what the
// dots mean, how many pieces there are and how many run or need you, and
// the project it is connected to. With a card chosen, that card: a piece's
// story (what it is, its buttons and what went wrong, what it is built
// with, who uses it) or the project's folder, branch and where it is
// shared; "All pieces" goes back.

import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { PartView } from "@/api";
import { StatusLight } from "@/components/status-light";
import { Button } from "@/components/ui/button";
import { lightWords, PartButtons, PartProblem } from "@/dashboard/part-card";

import type { MapNode, Product } from "./map";

type Press = (path: string) => void;
type Project = Extract<MapNode, { type: "project" }>["data"]["project"];

// The panel grows with what it holds, so nothing scrolls inside it; its
// foot (Start all, Stop all) stays at its bottom right.
const PANEL =
  "flex min-w-0 flex-col gap-4 rounded-[18px] bg-card p-5 shadow-soft";

export function Panel({
  node,
  project,
  products,
  onPress,
  onBack,
  footer,
}: Readonly<{
  node: MapNode | null;
  project: Project;
  products: PartView[];
  onPress: Press;
  onBack: () => void;
  // At the panel's foot, whatever is shown: Start all and Stop all.
  footer?: ReactNode;
}>) {
  const { t } = useTranslation("product");
  if (!node)
    return (
      <aside aria-label={t("panel.label")} className={PANEL}>
        <AboutMap project={project} products={products} />
        <Foot>{footer}</Foot>
      </aside>
    );
  return (
    <aside
      key={node.id}
      aria-label={t("details.label")}
      className={`${PANEL} animate-enter`}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="-ml-2 w-fit text-muted-foreground"
      >
        <ArrowLeft aria-hidden />
        {t("panel.back")}
      </Button>
      {node.type === "project" ? (
        <ProjectDetails project={node.data.project} />
      ) : (
        <ProductDetails
          product={node.data.product}
          part={node.data.part}
          kind={node.data.kind}
          onPress={onPress}
        />
      )}
      <Foot>{footer}</Foot>
    </aside>
  );
}

function Foot({ children }: Readonly<{ children: ReactNode }>) {
  if (!children) return null;
  return (
    <div className="mt-auto flex flex-wrap justify-end gap-2 border-t border-border-soft pt-4">
      {children}
    </div>
  );
}

const LEGEND = ["running", "stopped", "problem"] as const;

function AboutMap({
  project,
  products,
}: Readonly<{ project: Project; products: PartView[] }>) {
  const { t } = useTranslation("product");
  const running = products.filter((part) => part.light === "running").length;
  const needsYou = products.filter((part) => part.light === "problem").length;
  const summary = [
    t("panel.pieces", { count: products.length }),
    t("panel.running", { count: running }),
    ...(needsYou > 0 ? [t("panel.needsYou", { count: needsYou })] : []),
  ];
  return (
    <>
      <Head title={t("panel.label")} sub={t("panel.explain")} />
      <p className="text-item">{summary.join(" · ")}</p>
      <ul
        aria-label={t("panel.legend")}
        className="flex flex-wrap gap-x-4 gap-y-1.5"
      >
        {LEGEND.map((light) => (
          <li
            key={light}
            className="flex items-center gap-1.5 text-tag text-muted-foreground"
          >
            <StatusLight light={light} />
            {t(`light.${light}`)}
          </li>
        ))}
      </ul>
      <Fact label={t("panel.connection", { name: project.name })}>
        <ProjectFacts project={project} />
      </Fact>
    </>
  );
}

function ProjectDetails({ project }: Readonly<{ project: Project }>) {
  const { t } = useTranslation("product");
  return (
    <>
      <Head title={project.name} sub={t("project.sub")} />
      <ProjectFacts project={project} />
    </>
  );
}

function ProjectFacts({ project }: Readonly<{ project: Project }>) {
  const { t } = useTranslation("product");
  return (
    <dl className="grid gap-2 text-body">
      <Line label={t("project.folder")}>
        <span title={project.folder} className="break-all">
          {lastFolder(project.folder)}
        </span>
      </Line>
      <Line label={t("project.branch")}>
        {project.branch ?? t("project.noGit")}
      </Line>
      <Line label={t("project.shared")}>
        {project.remote ?? t("project.local")}
      </Line>
    </dl>
  );
}

// The folder's own name; the whole of it shows on hovering.
const lastFolder = (folder: string) =>
  folder.split(/[/\\]/).findLast((part) => part !== "") ?? folder;

// The stack's groups as the server names them, in the page's language.
const GROUPS = {
  Language: "groups.language",
  Interface: "groups.interface",
  Server: "groups.server",
  Data: "groups.data",
  Look: "groups.look",
  Checks: "groups.checks",
  Tools: "groups.tools",
} as const;

const isGroup = (group: string): group is keyof typeof GROUPS =>
  Object.hasOwn(GROUPS, group);

function ProductDetails({
  product,
  part,
  kind,
  onPress,
}: Readonly<{
  product: Product;
  part: PartView | null;
  kind: string;
  onPress: Press;
}>) {
  const { t } = useTranslation("product");
  const lit = part && part.light !== "none" ? part : null;
  return (
    <>
      <Head title={product.name} sub={kind} />
      {lit && (
        <span className="flex items-center gap-1.5 text-item">
          <StatusLight light={lit.light} />
          {lightWords(lit)}
        </span>
      )}
      {product.about && <p className="text-body">{product.about}</p>}
      {part && <Actions part={part} onPress={onPress} />}
      {part?.problem && <PartProblem problem={part.problem} />}
      {product.stack.length > 0 && (
        <Fact label={t("card.builtWith")}>
          <dl className="grid gap-1.5">
            {product.stack.map(({ group, items }) => (
              <Line
                key={group}
                label={isGroup(group) ? t(GROUPS[group]) : group}
              >
                {items.join(", ")}
              </Line>
            ))}
          </dl>
        </Fact>
      )}
      {product.users.length > 0 && (
        <Fact label={t("card.usedBy")}>
          {product.users.map((user) => user.who).join(", ")}
        </Fact>
      )}
    </>
  );
}

// Start, Stop and the others as the part allows, and Open where it runs.
function Actions({
  part,
  onPress,
}: Readonly<{ part: PartView; onPress: Press }>) {
  const { t } = useTranslation("product");
  if (!part.canStart && !part.canStop && !part.link) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <PartButtons part={part} onPress={onPress} />
      {part.link && (
        <Button asChild size="sm">
          <a href={part.link} target="_blank" rel="noreferrer">
            {t("buttons.open")}
          </a>
        </Button>
      )}
    </div>
  );
}

function Head({ title, sub }: Readonly<{ title: string; sub: string }>) {
  return (
    <header className="grid gap-0.5">
      <h2 className="text-section">{title}</h2>
      <span className="text-note text-muted-foreground">{sub}</span>
    </header>
  );
}

function Fact({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="grid gap-1.5 border-t border-border-soft pt-3 text-body">
      <span className="text-tag text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Line({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="grid grid-cols-[84px_1fr] gap-2">
      <dt className="text-tag text-muted-foreground">{label}</dt>
      <dd className="text-body">{children}</dd>
    </div>
  );
}
