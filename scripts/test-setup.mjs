// Loaded before every test (`--import`). The tests make their own git
// repositories in temporary folders. When git itself runs the tests (a hook
// on commit or push), it sets variables that point at the real repository;
// a test's git command would inherit them and act on the real repository
// instead of its own (in a linked worktree this once made the fixtures commit
// and push to the real one). The tests never use these, so they go.
for (const name of [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_COMMON_DIR",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_PREFIX",
])
  delete process.env[name];
