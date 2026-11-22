import { Download, LogIn } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  type Board,
  get,
  type GitHubStatus,
  messageOf,
  post,
} from "@/api/client";
import { ProblemBox } from "@/components/layout/problem-box";
import { Button } from "@/components/ui/button";

import { Step } from "../step";

import { BoardPicker, SMALL } from "./board-picker";
import { useT } from "@/i18n/use-t";

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
  const t = useT();
  const { status, problem, act } = useGitHub();
  if (!status) return null;
  return (
    <section className="grid gap-5 rounded-xl bg-card p-6 shadow-soft">
      <ol className="grid gap-5">
        <Step n={1} title={t.connect.github.cli} done={status.cli}>
          {!status.cli && (
            <Button
              variant="outline"
              className={SMALL}
              onClick={() => {
                act("/api/add-ons/github/install");
              }}
            >
              <Download aria-hidden />
              {t.connect.github.install}
            </Button>
          )}
        </Step>
        <SignIn status={status} act={act} />
        <Step
          n={3}
          title={
            connected ? t.connect.github.boardConnected : t.connect.github.board
          }
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
      {problem && <ProblemBox title={t.connect.didNotWork} text={problem} />}
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
  const t = useT();
  const signing = status.signingIn;
  return (
    <Step
      n={2}
      title={
        status.login
          ? t.connect.github.signedInAs(status.login)
          : t.connect.github.signIn
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
          <LogIn aria-hidden />
          {t.connect.github.signInWith}
        </Button>
      )}
      {signing?.code && (
        <div className="grid gap-1 rounded-xl bg-surface-2 p-4">
          <span className="text-[13px] text-muted-foreground">
            {t.connect.github.typeCode}
          </span>
          <span className="text-2xl font-semibold tracking-[0.12em] tabular-nums">
            {signing.code}
          </span>
        </div>
      )}
      {signing?.problem && (
        <ProblemBox
          title={t.connect.github.notSignedIn}
          text={signing.problem}
        />
      )}
    </Step>
  );
}
