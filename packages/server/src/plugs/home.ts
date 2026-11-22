// The `home` plug, offered by each extension that brings Home blocks: the
// data its blocks show, by the block's id. Home (core) asks every installed
// one.

export type HomePlug = {
  blocks: () => Record<string, unknown>;
};
