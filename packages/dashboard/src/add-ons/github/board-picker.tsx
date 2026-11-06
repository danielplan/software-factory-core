// Picking the GitHub board: the repository and its owner's board from
// lists, which column each stage is, and which work the factory takes in,
// then the check; starting from the board connected now, if there is one.

import { useCallback, useEffect, useState } from "react";

import { type Board, get, messageOf, post, type StageMap } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { Pick, WhichWork } from "@/connect/pick";
import { type Columns, StageMapping } from "@/connect/stage-map";

export const SMALL = "h-9 justify-self-start px-3 text-[13px]";

// The repository and its owner's board, from lists; then the check.
export function BoardPicker({
  connected,
  onAllow,
  onDone,
}: Readonly<{
  connected?: Board[string];
  onAllow: () => void;
  onDone: (message: string) => void;
}>) {
  const choice = useBoardChoice(connected);
  const { repository, board, label, stages } = choice;
  const [checking, setChecking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const repositories = useList<string>(
    "/api/add-ons/github/repositories",
    setProblem,
  );
  const owner = repository.split("/")[0] ?? "";
  const boards = useList<{ number: number; title: string }>(
    owner
      ? `/api/add-ons/github/boards?owner=${encodeURIComponent(owner)}`
      : null,
    setProblem,
  );
  const connect = async () => {
    setChecking(true);
    setProblem(null);
    try {
      const { message } = await post<{ message: string }>(
        "/api/add-ons/github/connect",
        { repository, board: Number(board), label, stages },
      );
      onDone(message);
    } catch (error) {
      setProblem(messageOf(error));
    }
    setChecking(false);
  };
  return (
    <div className="grid gap-3">
      <RepositoryAndBoard
        repositories={repositories}
        boards={boards}
        repository={repository}
        board={board}
        onRepository={(value) => {
          choice.setRepository(value);
          choice.setBoard("");
        }}
        onBoard={choice.setBoard}
      />
      {board && (
        <BoardColumns
          repository={repository}
          board={board}
          stages={stages}
          onSuggested={choice.matched}
          onStages={choice.setStages}
        />
      )}
      <WhichWork value={label} onPick={choice.setLabel} noun="cards" />
      {problem && <ProblemBox title="That did not work" text={problem} />}
      {problem?.includes("allow it") && (
        <Button variant="outline" className={SMALL} onClick={onAllow}>
          Allow the factory to read boards
        </Button>
      )}
      <Button
        className="h-10 justify-self-start px-4"
        disabled={!repository || !board || checking}
        onClick={() => void connect()}
      >
        {checking ? "Checking…" : "Connect"}
      </Button>
    </div>
  );
}

// The repository and its owner's board, picked from lists.
function RepositoryAndBoard({
  repositories,
  boards,
  repository,
  board,
  onRepository,
  onBoard,
}: Readonly<{
  repositories: string[];
  boards: { number: number; title: string }[];
  repository: string;
  board: string;
  onRepository: (value: string) => void;
  onBoard: (value: string) => void;
}>) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Pick
        label="Repository"
        value={repository}
        options={repositories.map((one) => ({ value: one, label: one }))}
        onPick={onRepository}
      />
      <Pick
        label="Board"
        value={board}
        options={boards.map((one) => ({
          value: String(one.number),
          label: one.title,
        }))}
        onPick={onBoard}
      />
    </div>
  );
}

// The chosen board's columns, matched to the factory's stages.
function BoardColumns({
  repository,
  board,
  stages,
  onSuggested,
  onStages,
}: Readonly<{
  repository: string;
  board: string;
  stages: StageMap | null;
  onSuggested: (stages: StageMap) => void;
  onStages: (stages: StageMap) => void;
}>) {
  const [columns, setColumns] = useState<string[]>([]);
  useEffect(() => {
    get<Columns>(
      `/api/add-ons/github/columns?repository=${encodeURIComponent(repository)}&board=${board}`,
    )
      .then((found) => {
        setColumns(found.columns);
        onSuggested(found.suggested);
      })
      .catch(() => {
        setColumns([]);
      });
  }, [repository, board, onSuggested]);
  if (!stages || columns.length === 0) return null;
  return <StageMapping columns={columns} value={stages} onChange={onStages} />;
}

// A list the server gives (none for no path); why it could not, to show.
function useList<T>(
  path: string | null,
  onProblem: (problem: string | null) => void,
): T[] {
  const [list, setList] = useState<T[]>([]);
  useEffect(() => {
    if (!path) return;
    get<T[]>(path)
      .then((found) => {
        setList(found);
        onProblem(null);
      })
      .catch((error: unknown) => {
        setList([]);
        onProblem(messageOf(error));
      });
  }, [path, onProblem]);
  return list;
}

// The choice as it is made, from the board connected now if there is one:
// its columns as they were matched; another board's as their names suggest.
function useBoardChoice(connected?: Board[string]) {
  const [repository, setRepository] = useState(textOf(connected?.repository));
  const [board, setBoard] = useState(textOf(connected?.board));
  const [label, setLabel] = useState(connected?.label ?? "factory");
  const [stages, setStages] = useState<StageMap | null>(null);
  const matched = useCallback(
    (suggested: StageMap) => {
      const same =
        repository === textOf(connected?.repository) &&
        board === textOf(connected?.board);
      setStages(same && connected ? connected.stages : suggested);
    },
    [repository, board, connected],
  );
  return {
    repository,
    setRepository,
    board,
    setBoard,
    label,
    setLabel,
    stages,
    setStages,
    matched,
  };
}

// A board entry's field as text ("" when it has none).
function textOf(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}
