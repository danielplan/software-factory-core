# Lessons from the kobolds

[Knowledge base](../../index.md) · [Reference](../index.md) · [Lessons](index.md)

**Type:** Reference · Answers: which traps have we hit with Kobble's kobolds, and what do we keep doing because of them?

- **Sprocket first called the other kobolds directly.** Its tools named
  Doodle's, Mimic's and the builder's code, so removing an extension left
  Sprocket offering what was not there, and every new extension meant
  changing Sprocket. Keep: each extension plugs its hand-offs into Sprocket,
  which hears only what is installed
  ([decision 0010](../../decisions/0010-sprocket-is-the-guide.md),
  [decision 0011](../../decisions/0011-extensions-plug-in.md)).
- **A reply job without a session id looped.** The builder's reply on a card
  ran as a warm conversation without a conversation id; it failed, and was
  started again on every reading of the board. Keep: a warm conversation
  always has a session id, and a job that fails is said once on the card,
  never tried again on every reading. (The in-card reply was later replaced
  by Ask Sprocket.)
- **The builder rebuilt screens the team had already agreed.** A prototype
  never marked agreed, or agreed while the hand-off was already writing the
  card, reached the builder as "not the reference", and it wrote the
  screens anew. Keep: the hand-off refuses a prototype nobody agreed on,
  reads the board again before the card is made, and the builder starts
  from the prototype's code
  ([decision 0003](../../decisions/0003-build-from-the-agreed-prototype.md)).
- **Unfinished work was pushed.** At its session limit the builder stopped
  with a draft pull request, and its commits skipped the git hooks. Keep:
  only work whose checks pass is pushed, through the hooks; unfinished work
  stays in the factory's copy
  ([decision 0007](../../decisions/0007-push-only-passing-work.md)), and a
  card out of sessions gets **Continue**, not a failure
  ([decision 0008](../../decisions/0008-out-of-sessions-is-not-a-failure.md)).
- **A board laid out as a pipeline hid the thinking.** Things followed one
  another in a set order, with many notes, and the board read as a form
  more than a picture of the idea. Keep: a whiteboard with one living
  picture, changed in place, and Doodle thinks before it draws
  ([decision 0005](../../decisions/0005-whiteboard-not-pipeline.md)).
- **A planning stage made a second place to think.** The factory had a
  Planning stage and a planner kobold, so an idea thought through in an
  exploration was planned again on its card. Keep: thinking happens in explorations; a card in To do is the
  go-ahead ([decision 0002](../../decisions/0002-no-planning-stage.md)).
