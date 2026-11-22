// Picking the GitHub board: the repository and its owner's board from
// lists, which column each stage is, and which work the factory takes in,
// then the check; starting from the board connected now, if there is one.

import { KeyRound, Plug } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { type Board, messageOf, post, type StageMap } from "@/api/client";
import { useRead } from "@/api/query";
import {
  boardsSchema,
  columnsSchema,
  repositoriesSchema,
} from "@/api/schemas/github";
import { ProblemBox } from "@/components/layout/problem-box";
import { Button } from "@/components/ui/button";
import { Pick, WhichWork } from "../pick";
import { StageMapping } from "../stage-map";

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
  const t = useTranslation().t;
  const choice = useBoardChoice(connected);
  const { repository, board, label, stages } = choice;
  const [checking, setChecking] = useState(false);
  const [sendProblem, setProblem] = useState<string | null>(null);
  const lists = useLists(repository);
  const { repositories, boards } = lists;
  const problem = sendProblem ?? lists.problem;
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
      {problem && <ProblemBox title={t("connect.didNotWork")} text={problem} />}
      {problem?.includes("allow it") && (
        <Button variant="outline" className={SMALL} onClick={onAllow}>
          <KeyRound aria-hidden />
          {t("connect.github.allow")}
        </Button>
      )}
      <Button
        className="h-10 justify-self-start px-4"
        disabled={!repository || !board || checking}
        onClick={() => void connect()}
      >
        <Plug aria-hidden />
        {checking ? t("connect.checking") : t("connect.connect")}
      </Button>
    </div>
  );
}

// The repositories, and the boards of the picked repository's owner, as
// GitHub lists them; why it could not, to show.
function useLists(repository: string) {
  const repositories = useRead(
    "/api/add-ons/github/repositories",
    repositoriesSchema,
  );
  const owner = repository.split("/")[0] ?? "";
  const boards = useRead(
    owner
      ? `/api/add-ons/github/boards?owner=${encodeURIComponent(owner)}`
      : null,
    boardsSchema,
  );
  return {
    repositories: repositories.data ?? [],
    boards: boards.data ?? [],
    problem: repositories.problem ?? boards.problem,
  };
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
  const t = useTranslation().t;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Pick
        label={t("connect.github.repository")}
        value={repository}
        options={repositories.map((one) => ({ value: one, label: one }))}
        onPick={onRepository}
      />
      <Pick
        label={t("connect.github.boardPick")}
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
  const { data } = useRead(
    `/api/add-ons/github/columns?repository=${encodeURIComponent(repository)}&board=${board}`,
    columnsSchema,
  );
  const columns = data?.columns ?? [];
  useEffect(() => {
    if (data) onSuggested(data.suggested);
  }, [data, onSuggested]);
  if (!stages || columns.length === 0) return null;
  return <StageMapping columns={columns} value={stages} onChange={onStages} />;
}

// The choice as it is made, from the board connected now if there is one:
// its columns as they were matched; another board's as their names suggest.
function useBoardChoice(connected?: Board[string]) {
  const [repository, setRepository] = useState(textOf(connected?.repository));
  const [board, setBoard] = useState(textOf(connected?.board));
  const [label, setLabel] = useState(connected?.label ?? "*");
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
