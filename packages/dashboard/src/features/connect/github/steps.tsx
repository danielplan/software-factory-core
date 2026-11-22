import { Download, LogIn } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { type Board, messageOf, post } from "@/api/client";
import { readOf } from "@/api/query";
import { type GitHubStatus, gitHubStatusSchema } from "@/api/schemas/github";
import { ProblemBox } from "@/components/layout/problem-box";
import { Button } from "@/components/ui/button";

import { Step } from "../step";

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
  const t = useTranslation().t;
  const { status, problem, act } = useGitHub();
  if (!status) return null;
  return (
    <section className="grid gap-5 rounded-xl bg-card p-6 shadow-soft">
      <ol className="grid gap-5">
        <Step n={1} title={t("connect.github.cli")} done={status.cli}>
          {!status.cli && (
            <Button
              variant="outline"
              className={SMALL}
              onClick={() => {
                act("/api/add-ons/github/install");
              }}
            >
              <Download aria-hidden />
              {t("connect.github.install")}
            </Button>
          )}
        </Step>
        <SignIn status={status} act={act} />
        <Step
          n={3}
          title={
            connected
              ? t("connect.github.boardConnected")
              : t("connect.github.board")
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
      {problem && <ProblemBox title={t("connect.didNotWork")} text={problem} />}
    </section>
  );
}

type Act = (path: string, body?: unknown) => void;

// What the GitHub CLI says now, looked at again every few seconds while
// the owner installs or signs in; and a step to take.
function useGitHub() {
  const read = useQuery({
    ...readOf("/api/add-ons/github/status", gitHubStatusSchema),
    refetchInterval: 2000,
  });
  const [sendProblem, setProblem] = useState<string | null>(null);
  const act: Act = (path, body = {}) => {
    setProblem(null);
    post(path, body)
      .then(() => read.refetch())
      .catch((error: unknown) => {
        setProblem(messageOf(error));
      });
  };
  const status: GitHubStatus | null = read.data ?? null;
  const problem = sendProblem ?? (read.error ? messageOf(read.error) : null);
  return { status, problem, act };
}

function SignIn({ status, act }: Readonly<{ status: GitHubStatus; act: Act }>) {
  const t = useTranslation().t;
  const signing = status.signingIn;
  return (
    <Step
      n={2}
      title={
        status.login
          ? t("connect.github.signedInAs", { login: status.login })
          : t("connect.github.signIn")
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
          {t("connect.github.signInWith")}
        </Button>
      )}
      {signing?.code && (
        <div className="grid gap-1 rounded-xl bg-surface-2 p-4">
          <span className="text-[13px] text-muted-foreground">
            {t("connect.github.typeCode")}
          </span>
          <span className="text-2xl font-semibold tracking-[0.12em] tabular-nums">
            {signing.code}
          </span>
        </div>
      )}
      {signing?.problem && (
        <ProblemBox
          title={t("connect.github.notSignedIn")}
          text={signing.problem}
        />
      )}
    </Step>
  );
}
