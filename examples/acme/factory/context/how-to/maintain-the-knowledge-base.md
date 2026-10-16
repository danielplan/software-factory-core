# Maintaining the knowledge base

[Knowledge base](../index.md) · [How-to guides](index.md)

**Type:** How-to · Answers: where does a fact go, and how is a page written?

The knowledge base follows [Diátaxis](https://diataxis.fr): every page is one
of four kinds, and its folder says which. Decisions are
[MADR](https://adr.github.io/madr/) records. A page says what is true **now**,
one topic per page, each fact in one place; the runs are the diary. Follow
these steps whenever you add or change a page, then run the docs check.

## 1. Choose the kind

Ask what the reader is doing when they open the page:

| The reader wants to…                       | Kind        | Folder         |
| ------------------------------------------ | ----------- | -------------- |
| learn by doing a whole task once           | Tutorial    | `tutorials/`   |
| get one task done, step by step            | How-to      | `how-to/`      |
| look up a fact or a rule                   | Reference   | `reference/`   |
| understand why things are the way they are | Explanation | `explanation/` |

Keep the kinds apart: a reference page does not teach, a how-to does not
explain at length. Link to the other kind instead.

## 2. Find where the fact goes

| The fact is…                                                            | It goes in…                                      |
| ----------------------------------------------------------------------- | ------------------------------------------------ |
| What a product feature does, its rules, where it lives, what is checked | `reference/features/<feature>.md`                |
| How this company builds a kind of product, beyond its kit's rules       | `reference/conventions/<kind>.md`                |
| A trap we hit and how to avoid it                                       | `reference/lessons/<kind>.md`                    |
| The steps for a task someone will repeat                                | `how-to/<task>.md`                               |
| Product intent: the people who use it, their journeys, open questions   | `explanation/<topic>.md`                         |
| A choice that was accepted, with the options and why                    | `decisions/NNNN-<choice>.md`                     |
| Original material as it was given                                       | `sources/`, never edited; add a newly dated file |
| What must stay true in one product (ask before changing it)             | that product's `BLUEPRINT.md`                    |
| What happened in a piece of work, and when                              | a run, `runs/NNN-name.md`                        |

When a fact seems to belong in two places, put it in the more specific page
and link to it from the other.

## 3. Write the page

- **Header:** the title, a line of links back up to the index, and
  `**Type:** <Tutorial | How-to | Reference | Explanation | Index> · Answers: <the question this page answers>`.
  The type must match the folder. Agents use the answers line to decide
  whether to read on.
- **One topic, present tense.** Write what is true now. Never tell a run's
  story in a heading; link the run instead.
- **Short.** About a screen or two. When a page grows past that, split it by
  topic and add the parts to the section's index page.
- **Name the place in the code**: the folder or file, not line numbers.
- **Separate checked from unchecked.** Say what a check or a person verified,
  and list what was not verified.
- **Plain words.** Say what a thing is before naming it.

A decision record has MADR front matter (`status`, `date`,
`decision-makers`) and the sections Context and Problem Statement, Considered
Options, Decision Outcome (with Consequences) and More Information.

## 4. Link it

1. Add a one-line entry to the section's index page. Every page must be linked
   from somewhere; the check reports orphans.
2. Remove or replace any older text that said the same thing, so the fact
   stays in one place.
3. Run the docs check.

## What the check proves, and what it does not

The docs check proves that every local link and `#anchor` points at a file or
heading that exists, that every file or folder path written in backticks
exists (outside history: runs, change logs and sources), that every page sits
in a Diátaxis folder with a matching type line and an `Answers:` question,
that decision records have the MADR name, fields and sections, that every page
is linked, and that pages and blueprints carry no run-diary headings. It
cannot tell whether a statement is still true or said twice: reviewing that is
part of every run.
