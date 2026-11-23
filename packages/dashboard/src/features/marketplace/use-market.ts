// What the person can do in the Marketplace: install (asking first when it
// brings others), remove, and switch the board work is tracked on (asking
// first). The server does the change; the page follows its state.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { type AddOnView, messageOf, post } from "@/api/client";
import { listIn } from "@/i18n/format";
import { useLocale } from "@/i18n/use-t";
import type { Locale } from "@/i18n/locale";
import { installPlan, nameOf, type Words } from "@/lib/market-view";

import type { Question } from "@/components/confirm";

// The question before installing one that needs others: they are installed
// together (the last of the plan is the extension itself).
function installQuestion(
  t: Words,
  locale: Locale,
  plan: AddOnView[],
  go: () => void,
): Question {
  const names = plan.map((one) => nameOf(t, one));
  const needed = names.slice(0, -1);
  return {
    title: t("market.installTitle", { names: listIn(locale, names) }),
    lines: [
      t("market.installText", {
        name: names.at(-1) ?? "",
        needs: listIn(locale, needed),
        context: needed.length > 1 ? "several" : undefined,
      }),
    ],
    yes: t("market.installBoth", { names: listIn(locale, names) }),
    onYes: go,
  };
}

export function useMarket(addOns: AddOnView[]) {
  const t = useTranslation().t;
  const navigate = useNavigate();
  const locale = useLocale();
  const [question, setQuestion] = useState<Question | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  // Calm motion: the ones just installed, and the one on its way out.
  const [fresh, setFresh] = useState<string[]>([]);
  const [leaving, setLeaving] = useState<string | null>(null);
  const send = (id: string, on: boolean) => {
    setProblem(null);
    post("/api/add-ons", { id, on }).catch((error: unknown) => {
      setProblem(messageOf(error));
    });
  };
  // Installing brings what the extension needs: asks first when it does.
  const install = (addOn: AddOnView) => {
    const plan = installPlan(addOns, addOn.id);
    const go = () => {
      setFresh(plan.map((one) => one.id));
      setTimeout(() => {
        setFresh([]);
      }, 900);
      send(addOn.id, true);
    };
    if (plan.length === 1) go();
    else setQuestion(installQuestion(t, locale, plan, go));
  };
  // The card fades out first; the rest close up as it goes.
  const remove = (addOn: AddOnView) => {
    setLeaving(addOn.id);
    setTimeout(() => {
      send(addOn.id, false);
      setLeaving(null);
    }, 200);
  };
  // Switching board: asks, then goes to where the new one is connected.
  const switchBoard = (from: AddOnView, to: AddOnView) => {
    setQuestion({
      title: t("market.connections.switchTitle", {
        from: nameOf(t, from),
        to: nameOf(t, to),
      }),
      lines: [t("market.connections.switchText", { to: nameOf(t, to) })],
      yes: t("market.connections.switchGo"),
      onYes: () => {
        void navigate("/settings/connections");
      },
    });
  };
  return {
    question,
    closeQuestion: () => {
      setQuestion(null);
    },
    problem,
    fresh,
    leaving,
    install,
    remove,
    switchBoard,
  };
}
