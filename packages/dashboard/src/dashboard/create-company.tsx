import { useState } from "react";

import { idFrom, messageOf, post } from "@/api";
import { Accent } from "@/components/accent";
import { Field } from "@/components/field";
import { ProblemBox } from "@/components/problem-box";
import { TwoPanel } from "@/components/two-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inside } from "@/setup/draft";

// Before anything else: the company's name, what it does, and where the
// factory keeps its files. The server makes the factory's folder, and the
// page turns into the factory's dashboard.
export function CreateCompany({
  factoriesFolder,
}: Readonly<{ factoriesFolder: string }>) {
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [folder, setFolder] = useState("");
  const { working, problem, create } = useCreate({ name, about, folder });
  return (
    <TwoPanel
      left={
        <>
          <h1 className="text-[34px] leading-[1.1] font-medium tracking-[-0.02em] sm:text-[40px]">
            Let's set up your <Accent>factory</Accent>
          </h1>
          <p className="max-w-[320px] text-[15px] leading-relaxed text-muted-foreground">
            The factory keeps its files on this computer, outside your code:
            what it knows about your products, its plans and its history.
          </p>
        </>
      }
    >
      <h2 className="text-[22px] font-medium">Name your company</h2>
      <div className="grid gap-5">
        <Field label="Name" id="company-name">
          <Input
            id="company-name"
            value={name}
            autoFocus
            placeholder="Acme"
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
        </Field>
        <Field label="What it does" id="company-about">
          <Input
            id="company-about"
            value={about}
            placeholder="We sell garden tools online."
            onChange={(event) => {
              setAbout(event.target.value);
            }}
          />
        </Field>
        <Field label="Where the factory keeps its files" id="company-folder">
          <Input
            id="company-folder"
            value={folder}
            placeholder={inside(factoriesFolder, idFrom(name || "my-company"))}
            onChange={(event) => {
              setFolder(event.target.value);
            }}
          />
        </Field>
      </div>
      {problem && (
        <ProblemBox title="The factory could not be made" text={problem} />
      )}
      <div className="mt-auto flex justify-end">
        <Button
          className="h-11 px-[22px]"
          disabled={!name.trim() || working}
          onClick={() => void create()}
        >
          Create the factory
        </Button>
      </div>
    </TwoPanel>
  );
}

// Making the factory; the server turns the page into its dashboard, so only
// a problem comes back here.
function useCreate(company: { name: string; about: string; folder: string }) {
  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const create = async () => {
    setWorking(true);
    setProblem(null);
    try {
      await post("/api/company", {
        name: company.name.trim(),
        about: company.about.trim(),
        ...(company.folder.trim() ? { folder: company.folder.trim() } : {}),
      });
    } catch (error) {
      setProblem(messageOf(error));
      setWorking(false);
    }
  };
  return { working, problem, create };
}
