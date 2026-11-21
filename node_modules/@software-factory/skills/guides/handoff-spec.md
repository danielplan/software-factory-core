# Writing the spec at hand-off

An exploration was agreed: the team talked it through with the explorer,
tried prototypes and agreed on one. Now it goes to the factory, whose builder
builds it from the card alone, without anyone to ask. You write that card: the
plan, for someone who was not there. It follows the shape of the `plan`
skill's agreed plan (Product, UX/UI, Architecture and design, Checks).

You get: the exploration's problem, the conversation, the board, the agreed
prototype (its branch, the variant agreed, every change asked along the way),
what the prototype's branch changes in the code, and a map of the products.
You may read the project's code (read only). Look at the code the prototype
touched and the code around it before you write: the builder needs the real
places, files and names.

## The rules

- **Only what was agreed or is true in the code.** Every line comes from the
  conversation, the board, the prototype or the code. Where the team did not
  settle something the builder must decide, say it plainly under **Open
  points**, with a proposal marked "proposed, not discussed". Never invent an
  agreement.
- **The prototype is the reference, not the product.** Say what in it is
  final (the screens, the words, the behaviour agreed) and what is only a
  stand-in (made-up data, shortcuts, the variant switch, a hard-coded
  language): the builder builds it properly, with the product's conventions
  (translations, states, tests).
- **Concrete.** Name the products, folders, files, routes and data the change
  touches; the screens' parts and their words; numbers and limits that were
  agreed. Plain words; a technical term only where the builder needs it.
- **Short where it can be.** A small change gets a short spec; leave out a
  part that has nothing to say, rather than filling it.
- English, Markdown, no greeting and nothing after the spec.

## The shape

Start with one paragraph: what is built and why, in two or three sentences.
Then:

```markdown
## The agreed plan

Explored and agreed in Kobble (exploration <id>, <date>). Products: <which>.
Prototype: `<branch>`, variant <key> (build only that one).

### Request

What the team wanted and why (the problem, in their words), and the state of
the product today where it matters: what exists, what is missing.

### Plan and checks

#### 1. Product

Goal: one sentence.

Journey: the steps the person goes through, numbered.

When the plan is too big for one card: the order, and which parts could be
cards of their own (say so; the team decides).

#### 2. UX/UI

Where it is (page, tab, area), the layout, each part with its words. The
other moments: first time, empty, loading, error, and any alarm or special
state agreed. What in the prototype is final and what is a stand-in.

#### 3. Architecture and design

How it works, as a small text diagram when there is a flow:

    source ──► step ──► result

The parts touched, with their places in the code, and what each does.
Choices made, each with the reason and the options considered and dropped.

#### 4. Checks

Rules and logic: the unit tests to write first. Data, pages, the journey:
the tests at their level. What the builder looks at on the running product.
What the factory cannot check (needs a person, a device, real data).

### Open points

What was not settled, each with a proposal ("proposed, not discussed").
```
