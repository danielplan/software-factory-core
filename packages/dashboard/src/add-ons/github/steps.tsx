import { useCallback, useEffect, useState } from "react";

import { get, type GitHubStatus, messageOf, post, type StageMap } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";

import { Step } from "@/connect/step";
import { Pick, WhichWork } from "@/connect/pick";
import { type Columns, StageMapping } from "@/connect/stage-map";

const SMALL = "h-9 justify-self-start px-3 text-[13px]";

// GitHub through its CLI: installed, signed in (a code to type in the
// browser), a repository and a board picked from lists, then checked.
export function GitHubSteps({
  onDone,
}: Readonly<{ onDone: (message: string) => void }>) {
  const { status, problem, act } = useGitHub();
  if (!status) return null;
  return (
    <section className="grid gap-5 rounded-3xl bg-card p-6 shadow-soft">
      <ol className="grid gap-5">
        <Step n={1} title="The GitHub CLI on this computer" done={status.cli}>
          {!status.cli && (
            <Button
              variant="outline"
              className={SMALL}
              onClick={() => {
                act("/api/add-ons/github/install");
              }}
            >
              Install it
            </Button>
          )}
        </Step>
        <SignIn status={status} act={act} />
        <Step n={3} title="Your board" done={false}>
          {status.login && (
            <BoardPicker
              onAllow={() => {
                act("/api/add-ons/github/sign-in", { more: "yes" });
              }}
              onDone={onDone}
            />
          )}
        </Step>
      </ol>
      {problem && <ProblemBox title="That did not work" text={problem} />}
    </section>
  );
}

type Act = (path: string, body?: unknown) => void;

// What the GitHub CLI says now, looked at again every few seconds while
// the owner installs or signs in; and a step to take.
function useGitHub() {
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const look = useCallback(() => {
    get<GitHubStatus>("/api/add-ons/github/status")
      .then(setStatus)
      .catch((error: unknown) => {
        setProblem(messageOf(error));
      });
  }, []);
  useEffect(() => {
    look();
    const every = setInterval(look, 2000);
    return () => {
      clearInterval(every);
    };
  }, [look]);
  const act: Act = (path, body = {}) => {
    setProblem(null);
    post(path, body)
      .then(look)
      .catch((error: unknown) => {
        setProblem(messageOf(error));
      });
  };
  return { status, problem, act };
}

function SignIn({ status, act }: Readonly<{ status: GitHubStatus; act: Act }>) {
  const signing = status.signingIn;
  return (
    <Step
      n={2}
      title={
        status.login ? `Signed in as ${status.login}` : "Sign in to GitHub"
      }
      done={status.login !== null}
    >
      {status.cli && !status.login && !signing?.code && (
        <Button
          className={SMALL}
          onClick={() => {
            act("/api/add-ons/github/sign-in");
          }}
        >
          Sign in with GitHub
        </Button>
      )}
      {signing?.code && (
        <div className="grid gap-1 rounded-2xl bg-surface-2 p-4">
          <span className="text-sm text-muted-foreground">
            Type this code in the browser window that opened:
          </span>
          <span className="text-2xl font-semibold tracking-[0.12em] tabular-nums">
            {signing.code}
          </span>
        </div>
      )}
      {signing?.problem && (
        <ProblemBox title="Not signed in" text={signing.problem} />
      )}
    </Step>
  );
}

// The repository and its owner's board, from lists; then the check.
function BoardPicker({
  onAllow,
  onDone,
}: Readonly<{ onAllow: () => void; onDone: (message: string) => void }>) {
  const [repository, setRepository] = useState("");
  const [board, setBoard] = useState("");
  const [label, setLabel] = useState("factory");
  const [stages, setStages] = useState<StageMap | null>(null);
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
          setRepository(value);
          setBoard("");
        }}
        onBoard={setBoard}
      />
      {board && (
        <BoardColumns
          repository={repository}
          board={board}
          stages={stages}
          onStages={setStages}
        />
      )}
      <WhichWork value={label} onPick={setLabel} noun="cards" />
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
  onStages,
}: Readonly<{
  repository: string;
  board: string;
  stages: StageMap | null;
  onStages: (stages: StageMap) => void;
}>) {
  const [columns, setColumns] = useState<string[]>([]);
  useEffect(() => {
    get<Columns>(
      `/api/add-ons/github/columns?repository=${encodeURIComponent(repository)}&board=${board}`,
    )
      .then((found) => {
        setColumns(found.columns);
        onStages(found.suggested);
      })
      .catch(() => {
        setColumns([]);
      });
  }, [repository, board, onStages]);
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
