// `npm run codes:export` writes error-codes.json, the list of refusal codes
// the apps translate, from src/common/error-codes.ts. `npm run codes:check`
// (part of npm run verify) only fails while the file is out of date. The
// file goes through Prettier, so the format check agrees with it.
import { readFileSync, writeFileSync } from "node:fs";
import { format } from "prettier";
import { errorCodes } from "../src/common/error-codes.ts";

const target = new URL("../error-codes.json", import.meta.url);
const list = Object.fromEntries(
  Object.entries(errorCodes).map(([code, { status, message }]) => [
    code,
    {
      status,
      params: [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1]),
      message,
    },
  ]),
);
const text = await format(JSON.stringify(list), { parser: "json" });

function current() {
  try {
    return readFileSync(target, "utf8");
  } catch {
    return "";
  }
}

if (!process.argv.includes("--check")) writeFileSync(target, text);
else if (current() !== text) {
  process.stderr.write(
    "error-codes.json is out of date. Run npm run codes:export and commit it.\n",
  );
  process.exitCode = 1;
}
