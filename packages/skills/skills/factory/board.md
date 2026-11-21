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
- A command that runs past its time limit is stuck, not slow: stop it and
  find out why (a server left running, a test waiting for input) instead of
  running it again or leaving it in the background.
- Helpers (subagents) run in the foreground only. To split a large job,
  start several helpers in one message (they still work at the same time)
  and write your answer only after every one has reported back.
- Other cards may be worked on at the same time in other working copies,
  each with its own settings, test database and ports. Use only your own
  copy's; never stop, reset or change another copy's servers or data.
- End your answer with exactly one last line, `STATUS: <value>`, with one of
  the values your prompt lists. The factory reads it to move the card, so
  nothing may follow it.

## Asking the owner

The owner may answer on GitHub or on the factory's Factory page. Whenever
you end with `STATUS: question` or `STATUS: blocked`, put the question in
this shape too, as the last thing before the status line, so the page can
show it with buttons:

```
<!-- software-factory:ask
{"about": "What the card is about, in one line",
 "where": "Where the work is now, in one line",
 "question": "The question, in plain everyday words",
 "answers": [
   {"key": "A", "answer": "The first answer", "means": "What it changes in practice, in one line"},
   {"key": "B", "answer": "The second answer", "means": "…"}
 ],
 "suggested": "A"}
-->
```

Two to four answers; `suggested` is the one you recommend (or leave it
out). The visible comment above it still says everything in words: the
block is only for the page. An open question with no sensible answers to
pick from leaves `answers` empty.

## No planning here

The factory does not plan. Work is thought through before it reaches the
board: in an exploration (the card then carries the agreed plan and its
prototype) or as a signal that is fixed (the card carries what was
reported). A card in To do is the go-ahead to build it.

## Building (the builder, card in To do)

The card's text is the plan: an agreed plan from an exploration, or a
signal to fix. You are on the card's branch in the factory's
own working copy; it has its own settings files, made from the examples.

- Follow the factory's workflow: open the run file with the agreed plan
  (`runs/issue-<card number>-short-name.md`, linking the card), then `build-test-first`, `review-structure`,
  `show-result` as far as it can go without a person (screenshots, what you
  tried) and `update-context`. When the prompt says earlier work exists, read
  the run file first and continue from it.
- **A card with a prototype is built from the prototype.** When the card
  names a prototype branch (`proto/…`) and its variant, the team agreed
  that screen: start from its code, not from the card's words. Fetch the
  branch (`git fetch origin <branch>`), read what it changed
  (`git diff origin/main...origin/<branch>`) and bring the agreed variant's
  files into the product, keeping its layout, components, styles, words and
  behaviour. Replace only its stand-ins: the made-up data (the real data
  instead), the variant switch and the other variants, words written into
  the screen (into the catalogue), shortcuts; then add the states, tests
  and checks. Open the prototype and your build side by side
  (`?variant=<key>`) and make them look the same before you call it done;
  say any difference you had to make in the run, with why. A card that says
  the prototype is "not the reference" or "only a sketch" while naming one
  is wrong: ask on the card instead of guessing.
- Commit as you go (`git commit` only); leave nothing uncommitted.
- Install packages where they are missing before running anything.
- Check lightly while you build, fully once. While building, run the tests
  for what you changed and the type check; run the product's full verify
  command (its `product.json`) once, when the scope is built. The factory
  runs it again before the pull request, so never run it twice for the same
  code, and in a round of fixing run only the check that failed.
- Words people see: when the product is translated (it has a catalogue of
  words), every new text goes into it, in every language it speaks;
  screen-reader labels, tooltips and field hints count too.
- Every state a screen can be in: what you change must hold in each one it
  can show (empty, loading or starting, running, stopped, a problem with its
  message, long names and long messages such as a folder's path, many
  items). Go through them in the browser, with made-up data where the real
  data does not have them, and take a screenshot of each state that changes.
- Screenshots: save them in the run's folder, commit them, and show them as
  `![what it shows](path/in/the/repository.png)`; the factory links them.
  To take them, start the product with its own start command (its
  `product.json`, or its kit's) on your copy's ports, open it with your own
  browser (the `browser` tools: headless, nobody sees it), and stop what you
  started.
  Never search for a browser program or write your own browser scripts; if
  the browser tools are missing or the product does not start within a
  minute or two, say what you could not look at and carry on.
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
  The factory gives a card at most 3 sessions in a row: when the third still
  ends with `continue`, it opens a draft pull request and asks the owner how
  to go on. So build the most important parts first. Your answer on each
  `continue` becomes a short note on the card, so say what is done and what
  is next, and nothing else.
- When the agreed scope is built and checked, write the pull request's
  description, and only that: your whole answer becomes it. It is about the
  whole card, every session and every change asked (the run file has them),
  never only what this session did: a heading with the card's title, what
  was built, how to try it, what was checked and measured (with the
  numbers), what was not checked and why. What this last session fixed
  belongs in the run file, not here. `STATUS: done`.
- Say plainly what is not done. When you report progress or stop early,
  list the plan's stages as done, partly done or not started; never call
  part of the scope finished.
- When you are stuck or need a decision that is the owner's: say what is done
  so far and ask one clear question. `STATUS: blocked`.

## Bringing main in

Before each build session or review fix on a branch that exists, the
factory merges the latest main into it. When that clashes, your prompt
names the files: settle them first.

- Keep both sides' intent: main's change and the card's change both stay.
- Numbered things (decisions, migrations) that both sides added keep
  main's number; the card's side moves to the next free number, and every
  link to it is updated. Runs are named after their card and are never
  renumbered.
- Lists both sides added to (a change log, an index) keep every row.
- Then `git commit` to finish the merge, and carry on with the task.
- When the two sides cannot both stay, say how they clash and ask.
  `STATUS: blocked`.

## Review comments (the builder, card in Review)

Your answer here is said on the pull request as a comment; the pull
request's description stays about the whole card.

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
- Run the checks that failed again yourself (the factory then runs them
  all), and say what you changed. `STATUS: done`.
- Only when a check cannot pass in code (it needs an account, a setting only
  the owner has, a decision that is theirs): say what is needed.
  `STATUS: blocked`.
