import { ExternalLink, KeyRound } from "lucide-react";
import { useState } from "react";

import { messageOf, post } from "@/api";
import { Field } from "@/components/field";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Step } from "./connect-page";
import { Pick, WhichWork } from "./pick";
import { type Columns, type StageMap, StageMapping } from "./stage-map";

type Login = { site: string; email: string; token: string };
type Projects = { name: string; projects: { key: string; name: string }[] };

// Jira with an API token: the site, the owner's email and the token,
// checked against Jira; then a project picked from the ones it shows.
export function JiraSteps({
  onDone,
}: Readonly<{ onDone: (message: string) => void }>) {
  const [login, setLogin] = useState<Login>({ site: "", email: "", token: "" });
  const [found, setFound] = useState<Projects | null>(null);
  const { busy, problem, run } = useRun();
  return (
    <section className="grid gap-5 rounded-3xl bg-card p-6 shadow-soft">
      <ol className="grid gap-5">
        <Step
          n={1}
          title={found ? `Signed in as ${found.name}` : "Your Jira and a token"}
          done={found !== null}
        >
          <LoginFields
            login={login}
            onLogin={(next) => {
              setLogin(next);
              setFound(null);
            }}
          />
          {!found && (
            <Button
              className="h-9 justify-self-start px-3 text-[13px]"
              disabled={busy || !login.site || !login.email || !login.token}
              onClick={() =>
                void run(async () => {
                  setFound(
                    await post<Projects>("/api/connect/jira/projects", login),
                  );
                })
              }
            >
              {busy ? "Checking…" : "Check"}
            </Button>
          )}
        </Step>
        <Step n={2} title="Your project" done={false}>
          {found && (
            <ProjectStep
              login={login}
              found={found}
              busy={busy}
              run={run}
              onDone={onDone}
            />
          )}
        </Step>
      </ol>
      {problem && <ProblemBox title="That did not work" text={problem} />}
    </section>
  );
}

// The project, its statuses matched to the factory's stages, which work
// the factory takes in; then Connect.
function ProjectStep({
  login,
  found,
  busy,
  run,
  onDone,
}: Readonly<{
  login: Login;
  found: Projects;
  busy: boolean;
  run: (step: () => Promise<void>) => Promise<void>;
  onDone: (message: string) => void;
}>) {
  const [project, setProject] = useState("");
  const [label, setLabel] = useState("factory");
  const [columns, setColumns] = useState<Columns | null>(null);
  const [stages, setStages] = useState<StageMap | null>(null);
  const choose = (key: string) => {
    setProject(key);
    setColumns(null);
    void run(async () => {
      const found = await post<Columns>("/api/connect/jira/columns", {
        ...login,
        project: key,
      });
      setColumns(found);
      setStages(found.suggested);
    });
  };
  return (
    <div className="grid gap-3">
      <Pick
        label="Project"
        value={project}
        options={found.projects.map((one) => ({
          value: one.key,
          label: `${one.name} (${one.key})`,
        }))}
        onPick={choose}
      />
      {columns && stages && (
        <StageMapping
          columns={columns.columns}
          value={stages}
          onChange={setStages}
        />
      )}
      <WhichWork value={label} onPick={setLabel} noun="issues" />
      <Button
        className="h-10 justify-self-start px-4"
        disabled={!project || busy}
        onClick={() =>
          void run(async () => {
            const { message } = await post<{ message: string }>(
              "/api/connect/jira",
              { ...login, project, label, stages },
            );
            onDone(message);
          })
        }
      >
        Connect
      </Button>
    </div>
  );
}

function LoginFields({
  login,
  onLogin,
}: Readonly<{ login: Login; onLogin: (login: Login) => void }>) {
  const type =
    (key: keyof Login) => (event: React.ChangeEvent<HTMLInputElement>) => {
      onLogin({ ...login, [key]: event.target.value });
    };
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="jira-site"
          label="Site"
          help="For example acme.atlassian.net."
        >
          <Input id="jira-site" value={login.site} onChange={type("site")} />
        </Field>
        <Field
          id="jira-email"
          label="Your email"
          help="The one you sign in to Jira with."
        >
          <Input id="jira-email" value={login.email} onChange={type("email")} />
        </Field>
      </div>
      <Field
        id="jira-token"
        label="API token"
        help="Kept only on this computer."
      >
        <Input
          id="jira-token"
          type="password"
          autoComplete="off"
          value={login.token}
          onChange={type("token")}
        />
      </Field>
      <a
        href="https://id.atlassian.com/manage-profile/security/api-tokens"
        target="_blank"
        rel="noreferrer"
        className="inline-flex w-fit items-center gap-1.5 text-sm underline underline-offset-2"
      >
        <KeyRound className="size-4" aria-hidden />
        Create an API token
        <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden />
      </a>
    </>
  );
}

// A step that asks Jira: busy meanwhile, and why it failed, if it did.
function useRun() {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const run = async (step: () => Promise<void>) => {
    setBusy(true);
    setProblem(null);
    try {
      await step();
    } catch (error) {
      setProblem(messageOf(error));
    }
    setBusy(false);
  };
  return { busy, problem, run };
}
