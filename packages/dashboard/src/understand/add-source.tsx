// "Add what people said": something that came in (a support email, a review, notes
// from a call), pasted or taken from a file, with where it came from, who
// said it and when. The kobold reads it and places it, and the dialog
// shows where it went, to move it or agree.

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { messageOf, post } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  NEW_SOURCE,
  NOBODY,
  SignalFields,
  type Said,
  today,
} from "./signal-fields";
import { JobLine, SortedSignal } from "./sorted-signal";
import { useAllRecords, useKoboldJobs, useSignal } from "./use-records";

export function AddSource() {
  const { t } = useTranslation("understand");
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  return (
    <Dialog
      open={open}
      onOpenChange={(now) => {
        setOpen(now);
        if (!now) setSent(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">{t("add.button")}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogTitle>{t("add.button")}</DialogTitle>
        <DialogDescription>{t("add.about")}</DialogDescription>
        {sent ? (
          <Sorting
            signal={sent}
            onAnother={() => {
              setSent(null);
            }}
          />
        ) : (
          <SignalForm onSent={setSent} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SignalForm({ onSent }: Readonly<{ onSent: (id: string) => void }>) {
  const { t, i18n } = useTranslation("understand");
  const { data } = useAllRecords();
  const [said, setSaid] = useState<Said>({
    text: "",
    source: "",
    name: "",
    kind: "people",
    who: NOBODY,
    when: today(i18n.language),
  });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const ready =
    said.text.trim() !== "" &&
    said.source !== "" &&
    (said.source !== NEW_SOURCE || said.name.trim() !== "");
  const send = async () => {
    setBusy(true);
    setProblem(null);
    try {
      onSent(await sendSignal(said));
    } catch (error) {
      setProblem(messageOf(error));
      setBusy(false);
    }
  };
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <SignalFields
        said={said}
        onChange={setSaid}
        sources={data?.records.sources ?? []}
        customers={data?.records.customers ?? []}
      />
      {problem && <ProblemBox title={t("add.cant")} text={problem} />}
      <Button type="submit" className="w-fit" disabled={!ready || busy}>
        {t("add.send")}
      </Button>
    </form>
  );
}

// A new source first, when one is named; then the signal. Its id.
async function sendSignal(said: Said): Promise<string> {
  const source =
    said.source === NEW_SOURCE
      ? (
          await post<{ source: { id: string } }>("/api/sources", {
            name: said.name,
            kind: said.kind,
          })
        ).source.id
      : said.source;
  const { signal } = await post<{ signal: { id: string } }>("/api/signals", {
    source,
    text: said.text,
    when: said.when,
    ...(said.who === NOBODY ? {} : { who: said.who }),
  });
  return signal.id;
}

// While the kobold sorts it, what it is doing; then where it went.
function Sorting({
  signal,
  onAnother,
}: Readonly<{ signal: string; onAnother: () => void }>) {
  const { t } = useTranslation("understand");
  const jobs = useKoboldJobs();
  const job = jobs.find((one) => one.kind === "sort" && one.about === signal);
  const { data } = useSignal(signal);
  return (
    <div className="grid gap-3">
      {job?.working || !data ? (
        <JobLine job={job} />
      ) : (
        <SortedSignal signal={data} job={job} />
      )}
      <Button variant="ghost" size="sm" className="w-fit" onClick={onAnother}>
        {t("add.another")}
      </Button>
    </div>
  );
}
