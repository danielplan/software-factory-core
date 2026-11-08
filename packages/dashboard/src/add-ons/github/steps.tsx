import { useCallback, useEffect, useState } from "react";

import { type Board, get, type GitHubStatus, messageOf, post } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";

import { Step } from "@/connect/step";

import { BoardPicker, SMALL } from "./board-picker";

// GitHub through its CLI: installed, signed in (a code to type in the
// browser), a repository and a board picked from lists, then checked.
export function GitHubSteps({
  onDone,
  connected,
}: Readonly<{
  onDone: (message: string) => void;
  // The board connected now: its step is done, and picking starts there.
  connected?: Board[string];
}>) {
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
        <Step
          n={3}
          title={connected ? "Your board, connected" : "Your board"}
          done={Boolean(connected)}
        >
          {status.login && (
            <BoardPicker
              connected={connected}
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
