import { ArrowUp, Folder, House } from "lucide-react";
import { useEffect, useState } from "react";

import { type FolderList, get, withoutEndSlashes } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Choosing a folder on this computer: a browser cannot tell the page where
// a folder is, so the server lists them.
export function FolderBrowser({
  path,
  onPath,
}: Readonly<{ path: string; onPath: (path: string) => void }>) {
  const list = useFolderList(path, onPath);
  return (
    <div className="grid gap-2 rounded-xl border bg-card p-3">
      <PathBar path={list?.path ?? path} list={list} onPath={onPath} />
      <ul
        className="grid max-h-56 gap-0.5 overflow-y-auto"
        aria-label="Folders in it"
      >
        {list?.folders.length === 0 && (
          <li className="px-2 py-1 text-sm text-muted-foreground">
            No folders in here.
          </li>
        )}
        {list?.folders.map((name) => (
          <li key={name}>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent"
              onClick={() => {
                onPath(`${withoutEndSlashes(list.path)}/${name}`);
              }}
            >
              <Folder className="size-4 text-muted-foreground" aria-hidden />
              {name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// The folders in `path`, as the server lists them; the path it really
// opened (the home folder for an empty one) goes back to the page.
function useFolderList(path: string, onPath: (path: string) => void) {
  const [list, setList] = useState<FolderList | null>(null);
  useEffect(() => {
    let current = true;
    get<FolderList>(`/api/folders?path=${encodeURIComponent(path)}`).then(
      (answer) => {
        if (!current) return;
        setList(answer);
        if (answer.path !== path) onPath(answer.path);
      },
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, [path, onPath]);
  return list;
}

// Up, home, and the path itself, which can be typed.
function PathBar({
  path,
  list,
  onPath,
}: Readonly<{
  path: string;
  list: FolderList | null;
  onPath: (path: string) => void;
}>) {
  const [typed, setTyped] = useState(path);
  const [shown, setShown] = useState(path);
  if (shown !== path) {
    setShown(path);
    setTyped(path);
  }
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="icon"
        aria-label="Up one folder"
        disabled={!list?.parent}
        onClick={() => {
          if (list?.parent) onPath(list.parent);
        }}
      >
        <ArrowUp aria-hidden />
      </Button>
      <Button
        variant="outline"
        size="icon"
        aria-label="Your home folder"
        onClick={() => {
          if (list) onPath(list.home);
        }}
      >
        <House aria-hidden />
      </Button>
      <Input
        aria-label="Folder"
        value={typed}
        onChange={(event) => {
          setTyped(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") onPath(typed);
        }}
        onBlur={() => {
          if (typed !== path) onPath(typed);
        }}
      />
    </div>
  );
}
