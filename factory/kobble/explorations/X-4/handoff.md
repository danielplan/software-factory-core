# Builder keeps off people's cards

**The problem:** When a developer moves a card to In progress to do it themselves, the builder sees it there and starts building it too. Two people's work collide on one card, and the developer's effort is wasted or overwritten.

**The question:** How does the builder know a card is a person's?

**Agreed:** A · Where do stuck cards show on the Factory page?. 

**Variant:** A · A list above the board. "Stuck" cards sit above the columns, next to "Waiting for you", each with its reason and two buttons: Let the builder try again, I'll take it.

The prototype holds the variants A, B, shown by the page address (`?variant=A`). Build only A: leave out the others and the variant switch.

**The prototype:** on the branch `proto/X-4-a`.

**What we learned:**
- To hand a card back to the builder: move it to To do. The builder takes it from there.
- Found along the way: with no Planning or Blocked column, a stuck card goes back to To do with a question, where it is easy to miss and its old "started" mark stays. We fix it here.
- Rule: a card is the builder's only when the builder itself was the last to move it to In progress.
- A reply to a stuck card goes into the card's conversation (a comment on GitHub or Jira), not onto the card; the card moves to To do with "Your hint is with the builder".
- The factory reads Backlog as new ideas waiting to be explored. A stuck card there is recognised as the builder's own and shows only in the Stuck list, never among the ideas.
- Also agreed: when the checks stay red after three tries, the card goes to Backlog and the Stuck list too, instead of waiting in In progress.
- Agreed diagram: With A: the builder keeps to its own cards

<!-- factory:kobble exploration=X-4 prototype=A -->

Handed off as #6.
