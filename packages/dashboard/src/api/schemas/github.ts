// What the GitHub board add-on's pages read: whether the GitHub CLI is there
// and who is signed in (GET /api/add-ons/github/status), and the lists the
// board picker chooses from: repositories, the owner's boards, and a board's
// columns with the stage each one suggests.

import { z } from "zod";

import type { StageMap } from "../../../../server/src/api.ts";
import type {
  GitHub,
  GitHubStatus as ServedStatus,
} from "../../../../server/src/extensions/github/github.ts";

export const gitHubStatusSchema = z.object({
  cli: z.boolean(),
  login: z.string().nullable(),
  signingIn: z
    .object({ code: z.string().nullable(), problem: z.string().nullable() })
    .nullable(),
}) satisfies z.ZodType<ServedStatus>;

export type GitHubStatus = z.infer<typeof gitHubStatusSchema>;

// GET /api/add-ons/github/repositories: "owner/name" of each one.
export const repositoriesSchema = z.array(z.string()) satisfies z.ZodType<
  Awaited<ReturnType<GitHub["repositories"]>>
>;

// GET /api/add-ons/github/boards?owner=: the owner's boards.
export const boardsSchema = z.array(
  z.object({ number: z.number(), title: z.string() }),
) satisfies z.ZodType<Awaited<ReturnType<GitHub["boards"]>>>;

// The column each stage of the factory is on the board.
const stageMapSchema = z.record(
  z.enum(["backlog", "todo", "doing", "review", "done"]),
  z.string(),
) satisfies z.ZodType<StageMap>;

// GET /api/add-ons/github/columns?repository=&board=: no named type on the
// server; built inline in the route (extensions/github/index.ts).
export const columnsSchema = z.object({
  columns: z.array(z.string()),
  suggested: stageMapSchema,
});
