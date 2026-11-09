# Working through the board

Read this when the factory's coach or builder started you: its prompt says
so. The factory watches the board, gives you the card and its conversation,
posts your final answer as a comment and moves the card. The skills stay the
same: the [factory](SKILL.md) skill and the skills it routes to.

## Always

- The owner talks to you only through the board: the card's comments and,
  in Review, the pull request.
- Never use `gh` and never `git push`: the factory does every write on
  GitHub.
- Your final answer is the comment, in GitHub Markdown, for a curious
  non-developer, following `AGENTS.md`: plain words, trade-offs, options.
- Ask for an account, a credential or a purchase in your answer instead of
  trying to get one.
- Something you notice outside the card (a bug, a rough edge, an idea):
  name it in your answer under **Noticed**, in a line each, so the owner can
  make it a card; don't fix it on the side.
- Your turn is the whole job: when it ends, the factory reads your last line,
  and nothing you started keeps running. Run long checks in the foreground
  and wait for them; never end with "I'll do it when this finishes".
- End your answer with exactly one last line, `STATUS: <value>`, with one of
  the values your prompt lists. The factory reads it to move the card, so
  nothing may follow it.

## Planning (the coach, card in Planning)

Coach the owner through the `plan` skill, in the card's comments:

- One step per comment, each ending with one question.
- Read the relevant knowledge and code first. Your copy is the latest main
  branch and read-only: write nothing. The run file and the blueprint are
  written when building.
- While a question is open: `STATUS: question`.
- Before the plan is agreed, read the board's other cards and name the ones
  this plan depends on, replaces or changes, so the owner can link them.
- When everything the card touches is agreed, write the agreed plan instead:
  the request, which product(s), the plan, the checks, what stays open. End
  by asking the owner to move the card to **Ready** to build it.
  `STATUS: plan-agreed`.
- When the card cannot go on without something you cannot get here (another
  decision, an access): say what is needed. `STATUS: blocked`.

## Building (the builder, card moved to Ready)

The owner approved the plan. You are on the card's branch in the factory's
own working copy; it has its own settings files, made from the examples.

- Follow the factory's workflow: open the run file with the agreed plan
  (linking the card), then `build-test-first`, `review-structure`,
  `show-result` as far as it can go without a person (screenshots, what you
  tried) and `update-context`. When the prompt says earlier work exists, read
  the run file first and continue from it.
- Commit as you go (`git commit` only); leave nothing uncommitted.
- Install packages where they are missing before running anything.
- Screenshots: save them in the run's folder, commit them, and show them as
  `![what it shows](path/in/the/repository.png)`; the factory links them.
- Stop only for a real problem, one that only the owner can solve: an
  account, a credential, a purchase, a decision that changes scope, data or
  what people see in a way the plan did not cover, or something in the plan
  that contradicts the code. Size, effort and risk are not reasons to stop.
- A decision the plan does not settle and that is cheap to change later:
  decide it, write it into the run file with the reason, and carry on.
- When the plan lists steps, they are the order to build in, not places to
  stop. Build in small pieces that each keep the product working, and commit
  each piece once its checks pass.
- Your turn may end before the whole scope is built. When nothing is wrong
  and the agreed scope is not finished, update the run file (what is done,
  what is next) and end with `STATUS: continue`: the factory starts the next
  session on the same branch, which reads the run file and carries on. Do not
  open a pull request for part of the scope, and do not ask the owner whether
  to go on. Each session must add at least one commit, or the factory stops.
- When the agreed scope is built and checked, write the pull request's
  description: what was built, how to try it, what was checked, what was not
  checked and why. `STATUS: done`.
- When you are stuck or need a decision that is the owner's: say what is done
  so far and ask one clear question. `STATUS: blocked`.

## Review comments (the builder, card in Review)

The owner commented on the card or the pull request. Change what they asked
on the same branch, run the checks again, and answer what you changed, point
by point. `STATUS: done`, or `STATUS: blocked` with one clear question.

## The checks before the pull request

Before opening or updating the pull request, the factory runs every changed
product's verify command itself. When some fail, you get what failed, up to
three rounds; the pull request is opened once every check passes. If they
are still red after that, the factory opens a draft pull request with what
fails, and the card waits for the owner:

- Every red check is yours to fix, also one that already failed before your
  change: a broken or out-of-date test is fixed like any other code.
- Fix the cause. Never loosen a check, skip a test or lower a threshold.
- Run the checks again yourself, and say what you changed. `STATUS: done`.
- Only when a check cannot pass in code (it needs an account, a setting only
  the owner has, a decision that is theirs): say what is needed.
  `STATUS: blocked`.
