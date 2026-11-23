// What the page sends to the server for the team's things: a request, then
// the board read again, and only then the pending things go (so nothing
// blinks away before the board has them). A stroke is sent on a card the
// board has, or as the first of a new card (the next ones wait for that
// card's real id).

import { use, useRef } from "react";

import { messageOf, post } from "@/api/client";
import { readAgain } from "@/api/query";

import { BoardProblem } from "../board-problem";
import type { Thing } from "../nodes";
import { type Stroke, type useHeld, withoutDone } from "./held";

export const PATH = "/api/kobble/explorations";

export function useSending(
  exploration: string,
  held: ReturnType<typeof useHeld>,
) {
  const say = use(BoardProblem);
  // A new card's real id, once the server has made it.
  const real = useRef(new Map<string, Promise<string>>());

  // Sent; the pending things named go once the new board is read.
  const send = async (
    path: string,
    body: Record<string, unknown>,
    gone: string[] = [],
  ) => {
    say(null);
    try {
      const answer = await post<{ thing?: Thing }>(`${PATH}/${path}`, {
        id: exploration,
        ...body,
      });
      await readAgain();
      return answer.thing ?? null;
    } catch (error: unknown) {
      say(messageOf(error));
      return null;
    } finally {
      held.setPending((now) => now.filter((one) => !gone.includes(one.id)));
    }
  };

  const draw = (stroke: Stroke, mark: string, picture: string | null) => {
    const card = held.now().pending.find((one) => one.id === stroke.on);
    const first = card?.kind === "sketch" && !real.current.has(card.id);
    const waiting = real.current.get(stroke.on);
    const request = (async () => {
      const on = (await waiting) ?? (first ? null : stroke.on);
      const at = first && card.place ? card.place : undefined;
      const act = { act: "draw", on, points: stroke.points, at, picture };
      return await send("mine", { do: act }, [mark]);
    })();
    if (first)
      real.current.set(
        stroke.on,
        request.then((done) => (done?.kind === "mark" ? done.on : "")),
      );
    void request.then(() => {
      held.setPending((now) => withoutDone(now, new Set(real.current.keys())));
    });
  };

  return { send, draw };
}
