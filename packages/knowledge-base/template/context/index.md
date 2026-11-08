# Knowledge base

**Type:** Index · Answers: where is the page I need?

Everything the factory knows about this company and its products, organised
with [Diátaxis](https://diataxis.fr): four kinds of page, each answering a
different need. Decisions are numbered records in the
[MADR](https://adr.github.io/madr/) format. A page says what is true **now**;
the runs say what happened and when. To add or change a page, follow
[maintaining the knowledge base](how-to/maintain-the-knowledge-base.md).

## Find the right page

| You want to…                                                                | Kind        | Start here                                 |
| --------------------------------------------------------------------------- | ----------- | ------------------------------------------ |
| Learn a product or the factory by doing one whole thing                     | Tutorial    | [Tutorials](tutorials/index.md)            |
| Get a task done, step by step                                               | How-to      | [How-to guides](how-to/index.md)           |
| Look something up: features, how each kind of product is built, traps       | Reference   | [Reference](reference/index.md)            |
| Understand why: product intent, the people who use it, how it fits together | Explanation | [Explanation](explanation/index.md)        |
| See which choices were made, with the options and reasons                   | Decision    | [Decisions](decisions/index.md)            |
| Read the original material as it was given                                  | Source      | [Sources](sources/README.md), never edited |

## The project's own documentation

What the project documents outside this folder stays there, and those pages
stay the source for what they cover. They are listed here, each with the
question it answers; a page in this knowledge base links to them and adds
only what they do not say.

## Reading order for a new task

1. This index, then the [feature](reference/features/index.md) the task touches.
2. The product's blueprint (its promises) and the
   [conventions](reference/conventions/index.md) for its kind of product.
3. The [lessons](reference/lessons/index.md) for that kind of product, and any
   [decision](decisions/index.md) the feature page links.
4. The code, starting from the folder the feature page names.
