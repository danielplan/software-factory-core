// Chat (#chat): talk with the kobold as with any chatbot. Empty, the field
// is big in the middle of the page; with the first message it slides down
// to the bottom, where it stays, and the conversation scrolls above it. Say
// something you would like to improve and it writes it up as an idea to
// explore (after asking who it is for, when there is more than one); ask a
// question and it answers from the records; attach pictures or files to
// either. While the kobold works, what you write steers it.

import { SquarePen } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { PageHead } from "@/components/page-head";
import { Button } from "@/components/ui/button";
import { useExploreList } from "@/explore/use-explore";
import { busyOf, type Sent } from "@/lib/chat-view";
import { useKoboldJobs } from "@/understand/use-records";

import { Composer } from "./composer";
import { Messages } from "./messages";
import { useChat } from "./use-chat";
import { Welcome } from "./welcome";

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The field slides from where it was to where it is now (it moves from the
// middle of the page to its bottom with the first message).
function useSlide(docked: boolean) {
  const field = useRef<HTMLDivElement>(null);
  const from = useRef<number | null>(null);
  useLayoutEffect(() => {
    const element = field.current;
    const top = from.current;
    from.current = null;
    if (!element || top === null || reducedMotion()) return;
    const by = top - element.getBoundingClientRect().top;
    if (Math.abs(by) < 2) return;
    element.animate(
      [{ transform: `translateY(${String(by)}px)` }, { transform: "none" }],
      { duration: 520, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
  }, [docked]);
  const remember = () => {
    from.current = field.current?.getBoundingClientRect().top ?? null;
  };
  return { field, remember };
}

export function ChatPage() {
  const { t } = useTranslation("chat");
  const { data: explore } = useExploreList();
  const people = explore?.personas ?? [];
  const { said, send, choose, steer, clear } = useChat(people);
  const busy = busyOf(said, useKoboldJobs());
  const docked = said.length > 0;
  const { field, remember } = useSlide(docked);
  const onSend = (text: string, files: Sent[]) => {
    if (!docked) remember();
    if (busy) void steer(busy, text, files);
    else send(text, files);
  };
  const titleOf = (idea: string) =>
    explore?.ideas.find((one) => one.id === idea)?.title ?? null;
  const composer = (
    <div
      ref={field}
      className={
        docked
          ? "sticky bottom-0 -mx-4 bg-linear-to-t from-page from-70% to-transparent px-4 pt-6 pb-1 sm:-mx-[30px] sm:px-[30px]"
          : "w-full"
      }
    >
      <Composer
        big={!docked}
        onSend={onSend}
        placeholder={t(placeholderOf(docked, busy !== null))}
      />
      <p className="mt-2 text-center text-tag font-normal text-muted-foreground">
        {t("disclaimer")}
      </p>
    </div>
  );
  return (
    <div className="flex min-h-[calc(100dvh-120px)] flex-col">
      {docked && (
        <PageHead
          title={t("title")}
          actions={
            <Button variant="outline" onClick={clear}>
              <SquarePen aria-hidden />
              {t("newChat")}
            </Button>
          }
        />
      )}
      {docked ? (
        <>
          <div className="flex-1 pt-4">
            <Messages
              said={said}
              people={people}
              titleOf={titleOf}
              onChoose={choose}
            />
          </div>
          {composer}
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 pb-[10vh]">
          <Welcome />
          {composer}
        </div>
      )}
    </div>
  );
}

function placeholderOf(docked: boolean, busy: boolean) {
  if (busy) return "placeholder.steer" as const;
  return docked
    ? ("placeholder.reply" as const)
    : ("placeholder.start" as const);
}
