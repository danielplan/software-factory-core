import { LoaderCircle, Search } from "lucide-react";
import { useState } from "react";

import {
  type Candidate,
  type DetectAnswer,
  type KitView,
  messageOf,
  post,
  type SetupProduct,
} from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";

import { FolderBrowser } from "./folder-browser";

// Brownfield: the folder with the code, what the kits found in it, and
// which of those the owner keeps (all, unless they untick one).
export function FoundProducts({
  kits,
  products,
  onChange,
}: Readonly<{
  kits: KitView[];
  products: SetupProduct[];
  onChange: (products: SetupProduct[]) => void;
}>) {
  const [path, setPath] = useState("");
  const [found, setFound] = useState<Candidate[] | null>(null);
  const [looking, setLooking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const look = async () => {
    setLooking(true);
    setProblem(null);
    try {
      const answer = await post<DetectAnswer>("/api/setup/detect", {
        folder: path,
      });
      setFound(answer.candidates);
      onChange(answer.candidates.map(fromCandidate));
    } catch (error) {
      setProblem(messageOf(error));
    } finally {
      setLooking(false);
    }
  };
  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <p className="font-medium">The folder with your code</p>
        <FolderBrowser path={path} onPath={setPath} />
        <div>
          <Button onClick={() => void look()} disabled={looking || !path}>
            {looking ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <Search aria-hidden />
            )}
            Look for products
          </Button>
        </div>
      </div>
      {problem && (
        <ProblemBox title="The folder could not be read" text={problem} />
      )}
      {found?.length === 0 && <NoneFound kits={kits} />}
      {found && found.length > 0 && (
        <FoundList
          found={found}
          products={products}
          kits={kits}
          onChange={onChange}
        />
      )}
    </div>
  );
}

function fromCandidate(candidate: Candidate): SetupProduct {
  return {
    id: candidate.id,
    name: candidate.name,
    kind: candidate.kind,
    folder: candidate.folder,
    about: "",
    ...(candidate.port ? { port: candidate.port } : {}),
    commands: Object.fromEntries(
      Object.entries(candidate.commands).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ),
    isNew: false,
  };
}

function FoundList({
  found,
  products,
  kits,
  onChange,
}: Readonly<{
  found: Candidate[];
  products: SetupProduct[];
  kits: KitView[];
  onChange: (products: SetupProduct[]) => void;
}>) {
  const kept = (id: string) => products.find((p) => p.id === id);
  const toggle = (candidate: Candidate) => {
    onChange(
      kept(candidate.id)
        ? products.filter((p) => p.id !== candidate.id)
        : [...products, fromCandidate(candidate)],
    );
  };
  const rename = (id: string, name: string) => {
    onChange(products.map((p) => (p.id === id ? { ...p, name } : p)));
  };
  return (
    <div className="grid gap-2">
      <p className="font-medium">
        Found {found.length} {found.length === 1 ? "product" : "products"}.
        Untick any the factory should leave alone.
      </p>
      <ul className="grid gap-2" aria-label="Products found">
        {found.map((candidate) => {
          const product = kept(candidate.id);
          return (
            <li
              key={candidate.id}
              className="flex flex-wrap items-center gap-3 rounded-[14px] border border-border-soft bg-card p-3"
            >
              <input
                type="checkbox"
                className="size-4 accent-[var(--primary)]"
                aria-label={`Keep ${candidate.name}`}
                checked={product !== undefined}
                onChange={() => {
                  toggle(candidate);
                }}
              />
              <Input
                aria-label={`Name of ${candidate.name}`}
                className="w-48"
                disabled={!product}
                value={product?.name ?? candidate.name}
                onChange={(event) => {
                  rename(candidate.id, event.target.value);
                }}
              />
              <Badge variant="secondary">
                {kits.find((k) => k.kind === candidate.kind)?.name ??
                  candidate.kind}
              </Badge>
              <span
                className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
                title={candidate.folder}
              >
                {candidate.folder}
              </span>
              <span className="text-xs text-muted-foreground">
                {Object.values(candidate.commands)
                  .filter(Boolean)
                  .join(" · ") || "no commands found"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NoneFound({ kits }: Readonly<{ kits: KitView[] }>) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyTitle>No products found in this folder</EmptyTitle>
        <EmptyDescription>
          The factory knows these kinds of product so far:{" "}
          {kits.map((kit) => kit.name).join(", ")}. Try the folder that holds
          your code, or one level up.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
