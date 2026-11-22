// Posts on the board that sound like what the person says: offered with a
// 👍, or sliding in while they type.

import { ThumbsUp } from "lucide-react";

import { useT } from "@/i18n/use-t";
import { cn } from "@/lib/utils";

import {
  issueUrl,
  type Post,
  useMine,
  useOnBoard,
  withSignIn,
} from "@/api/feedback-board";
import { SignInHelp } from "./sign-in-help";
import {
  findSimilarPosts,
  type Thread,
  thumb,
  thumbFor,
  writeDraft,
} from "./tell-kobold";

export function SimilarOffer({
  post,
  problem,
}: Readonly<{ post: Post; problem: string | null }>) {
  const t = useT().feedback;
  return (
    <div className="grid gap-2 motion-safe:animate-slide-in">
      <SimilarRow
        post={post}
        onThumb={() => {
          withSignIn(thumb);
        }}
      />
      <SignInHelp problem={problem} />
      <button
        type="button"
        onClick={writeDraft}
        className="self-end text-[12px] text-muted-foreground hover:text-foreground"
      >
        {t.chat.different} →
      </button>
    </div>
  );
}

function Count({ post, thumbed }: Readonly<{ post: Post; thumbed: boolean }>) {
  return (
    <span
      className={cn(
        "flex flex-none items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px]",
        thumbed
          ? "border-[#c7cbfb] bg-[#8b8ff0]/10 text-foreground-2"
          : "border-line-soft text-muted-foreground",
      )}
    >
      <ThumbsUp aria-hidden />
      {post.thumbs + (thumbed ? 1 : 0)}
    </span>
  );
}

// A post on the board, with its 👍: a button while it is offered, after
// that only the count (with the person's own 👍, when given).
export function SimilarRow({
  post,
  onThumb,
  thumbed = false,
}: Readonly<{
  post: Post;
  onThumb?: () => void;
  thumbed?: boolean;
}>) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line-soft bg-card px-3 py-2 text-[12.5px] [&_svg]:size-3.5 [&_svg]:flex-none">
      <a
        href={issueUrl(post.number)}
        target="_blank"
        rel="noreferrer"
        className="flex min-w-0 flex-1 items-center gap-2 hover:underline"
      >
        <span className="text-faint">#{post.number}</span>
        <span className="truncate">{post.title}</span>
      </a>
      {onThumb ? (
        <button
          type="button"
          onClick={onThumb}
          className="flex flex-none items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11.5px] text-foreground-2 transition-colors hover:border-[#8b8ff0] hover:bg-[#8b8ff0]/10"
        >
          <ThumbsUp aria-hidden />
          {post.thumbs}
        </button>
      ) : (
        <Count post={post} thumbed={thumbed} />
      )}
    </div>
  );
}

// Posts on the board that sound like what is being typed, sliding in.
export function SimilarAsYouType({
  text,
  thread,
  onThumb,
}: Readonly<{ text: string; thread: Thread | null; onThumb: () => void }>) {
  const mine = useMine();
  const onBoard = useOnBoard();
  const t = useT().feedback;
  const step = thread?.step ?? "choose";
  if (!["choose", "listen", "question", "again"].includes(step)) return null;
  if (text.trim().length < 6) return null;
  const said = `${thread?.said ?? ""} ${text}`;
  const kind = thread?.chosen ? thread.kind : null;
  const posts = findSimilarPosts(said, kind, onBoard).filter(
    (one) => !mine.some((it) => it.number === one.number),
  );
  if (posts.length === 0) return null;
  return (
    <div className="grid gap-1.5 px-4 pt-2">
      <span className="text-[11px] text-muted-foreground">
        {t.window.alreadyOnBoard}
      </span>
      {posts.map((post) => (
        <div key={post.number} className="motion-safe:animate-slide-in">
          <SimilarRow
            post={post}
            onThumb={() => {
              thumbFor(post.number);
              onThumb();
            }}
          />
        </div>
      ))}
    </div>
  );
}
