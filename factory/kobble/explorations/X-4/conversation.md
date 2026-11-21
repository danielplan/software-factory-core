<!-- conversation: 159cf91c-a7ad-4a8e-8151-a492d21331fd -->

**Kobold:** I put **three ways** on the board, plus a diagram of what happens today. The builder **carries on with any card in In progress**, even one it never started.

- **A, only its own cards:** the builder keeps track of the cards it started already, so this is the smallest change. I'd go with A.
- **B, assigned to a person:** works with how teams already use their board.
- **C, it asks first:** safest, but it's slow and gets noisy.

No prototype yet, because none of these changes a screen.

Which matters most: keeping it simple, or letting a person hand a card back to the builder later?

**You:** I pick A: Only its own cards.

**Kobold:** I marked **A as agreed** and drew how it would work. The builder already notes each card it starts, so this change is small.

- **To give a card back to the builder:** move it to To do.
- **One case is still open:** a person moves a card to In progress after the builder has already started it.

In that case, should the builder stop and leave the card to the person?

**You:** why should that happen

**Kobold:** Fair question. It happens when the **builder gets stuck**:

- It sends the card back to To do with a question.
- A developer decides to do the card themselves and moves it to In progress.
- The builder still sees its old **"started"** mark on the card and takes the card back.

A simple fix: a card counts as the builder's only when **the builder itself was the last to move it** to In progress.

Shall we make that the rule?

**You:** if there is an error it probably goes to planning, but good point this is a bug in the factory right now, since we dont have a plannign tab or a blocked tab

**Kobold:** Right, there's **no Planning or Blocked column** anymore. Today a stuck card goes back to **To do** with a question, and it keeps its old "started" mark.

- I put that on the board as a **separate finding**. Where a stuck card should wait is worth its own exploration (New exploration).
- The **proposed rule** fixes the takeover side either way: a card is the builder's only when the builder was the last to move it to In progress.

Do we agree on that rule here?

**You:** no i would fix that here and now, what can we do?

**Kobold:** Good, we fix it here. I put **three places a stuck card could wait** on the board.

- **A: To do:** the smallest change, but the card is still easy to miss.
- **B: In progress:** the same place a card waits today when the builder gives up.
- **C: Backlog:** I'd go with this one. It needs no new column, and moving the card says who does it next.

Which one feels right for your team?

**You:** maybe add next to the kanban or before a list of stuck tasks above

**Kobold:** I'm **making a prototype** of the Factory page now. You'll be able to switch between the two ways on the board.

- **A list above the board:** next to the "Waiting for you" box, which already shows cards stopped on a question.
- **A column beside the board:** a fifth "Stuck" column, on this page only.

Each stuck card gets its reason and two buttons: **Let the builder try again** and **I'll take it**.

While it's being made: should stuck cards stay where they are on GitHub or Jira, or go back to Backlog there?

**You:** ▎ Prototype A was cut off while it was being made (the factory restarted), so what runs now has no change in it. Please make it again: both variants on the Factory page, with
  ▎ made-up stuck cards so the change shows as soon as it opens.

**Kobold:** I'm making **prototype A again** from the start. Both variants will open with **three made-up stuck cards**:

- one stuck on a question
- one whose checks stayed red after three tries
- one waiting for an answer

On each card, **Let the builder try again** moves it to To do, and **I'll take it** moves it to In progress, marked as a person's.

While it's being made: on GitHub or Jira, should a stuck card go back to Backlog?

**You:** yes

**Kobold:** I marked **Backlog as agreed** on the board. On GitHub or Jira, a stuck card goes to **Backlog**, and moving it decides who works on it next:

- **To do:** the builder tries again.
- **In progress:** a person takes it, and the builder leaves it alone.

The prototype is still being made.

Do we also agree the rule that a card is the builder's only when the builder itself last moved it to In progress?

**Kobold:** **Prototype A has been rebuilt**, but no picture of it running could be taken, so nobody has looked at it yet.

- **Matches the plan:** both variants show three made-up stuck cards with the two buttons.
- **Off:** clicking a made-up card will probably show an error, and anything you move comes back when the page reloads.
- **Worth checking:** the list of changed files is long, and much of it may be other work.

Could you open it, switch between A and B, and press **I'll take it** on #209?

**You:** what does ill take it do

**Kobold:** **I'll take it** means a person, not the builder, will finish the card. In the prototype it:

- takes the card **off the stuck list**
- puts it at the top of **Building**, with a chip: "You took it · the builder leaves it alone"

In the real version it would also move the card to **In progress** on GitHub or Jira. Since the builder didn't move it there, the builder keeps off it.

Should the button also assign the card to whoever pressed it?

**You:** no it should allow me to reply or help

**Kobold:** The maker is **changing both variants**, so you can help the builder right on each stuck card:

- **Reply box:** "Answer the builder, or give it a hint". **Send and let it try again** moves the card to To do.
- **Quick picks:** on #214, the builder's suggested answers, like in "Waiting for you".
- **Smaller links:** "I'll do it myself" and "Try again as it is".

Should a hint also go on the card on GitHub or Jira, so the whole team sees it?

**You:** I pick A: A list above the board.

**Kobold:** I marked **"a list above the board"** as agreed. The maker is still adding the reply box.

One idea: "Waiting for you" and "Stuck" now do nearly the same job, since both mean the builder needs you. **Merging them into one list** would leave a single place to look.

Shall I merge them into one list in the prototype?

**Kobold:** The **reply box has been added** to the stuck cards. No picture could be taken, and the maker didn't open the page or run its checks, so it may not even load.

- **Matches what you asked:** you can reply, give a hint, or pick one of the suggested answers on #214.
- **Still separate:** "Waiting for you" and "Stuck" are two lists.

Could you open variant A, write a hint on #209, and press **Send**?

**You:** the answer is a bit weird. DO it myself is not needed, try again is also not really needed

**Kobold:** The maker is **removing both links** from variant A. Each stuck card will keep only:

- the reason it's stuck
- the suggested answers, when the builder asked a question
- the reply box and **Send and let it try again**

What feels weird about the answer: the suggested answers, or how your reply shows on the card afterwards?

**Kobold:** **Variant A** is simpler now: each stuck card has its reason, the suggested answers when the builder asked something, and a reply box. No picture could be taken, so nobody has looked at it running yet.

- **Done as asked:** both links are gone.
- **Left as it was:** variant B still has both links, which is fine since you picked A.
- **Still open:** what felt weird about the answer.

Could you send a reply on #214 and tell me what still feels off?

**You:** why do you write the message into the task

**Kobold:** I asked the maker for that, so other people could see the hint. But the reply belongs in the **card's conversation**, the comments on GitHub or Jira, not on the card itself.

The maker is changing it: after you send, the card moves to To do with just a small chip, **"Your hint is with the builder"**.

Is the chip enough, or should the card show nothing at all?

**Kobold:** In **variant A**, your reply no longer shows on the card. After you send, the card moves to To do with only the chip "Your hint is with the builder". Nobody has opened it yet, because no picture could be taken.

- **In the prototype:** the reply isn't saved anywhere, because the cards are made up.
- **In the real version:** it becomes a comment on the card. I noted this on the board.

Could you send a reply on #214 and check the To do column?

**You:** i think this looks good

**Kobold:** I marked **variant A of the prototype** and the reply note as agreed.

- **Already agreed:** the builder keeps to its own cards, stuck cards go to Backlog, and you reply to them from the list above the board.
- **Still open:** the rule on the board. A card counts as the builder's only when the builder was the last to move it to In progress.

Do we agree that rule, so this is ready to hand over?

**You:** yes, is this not trivial? Im not sure if i miss something

**Kobold:** I marked **the rule as agreed**. Mostly it's small: the builder keeps its own notes on each card, so the rule becomes "only carry on when my last note on it is 'started'".

You're missing one thing, now on the board:

- Some boards **have no Backlog column**. GitHub's plain board has only Todo, In Progress and Done.
- The factory **doesn't read Backlog** today.

On a board without Backlog, should stuck cards wait in To do, with the builder skipping them until someone replies?

**You:** why should there be no backlog? it has to have a backlog

**Kobold:** You're right, and I was wrong: **every connected board has a Backlog**. I corrected the note on the board.

The real catch is different:

- The factory treats Backlog as **new ideas waiting to be explored**.
- A stuck card sent there would show up among those ideas.

The fix is to have the factory recognise its own stuck cards in Backlog and show them only in the Stuck list.

Shall I mark that as agreed, so this is ready to hand over?

**You:** perfect

**Kobold:** Everything on the board is **agreed**:

- The builder only carries on with cards it moved to In progress itself.
- A stuck card goes to Backlog, and that includes the case where its checks stayed red after three tries.
- The Factory page lists stuck cards above the board, each with a reply box.
- A reply becomes a comment on the card, and the card goes back to To do.

Shall I mark this exploration ready to hand over to the builder?

**You:** yes

**Kobold:** The whole board is **agreed**, and I added the red-checks case as its own note.

I can't hand the exploration over myself; that's your step on the board. Two things for whoever builds it:

- The agreed prototype is **variant A**, the list above the board.
- The prototype changed a lot of files that have nothing to do with this exploration. The real build should touch only the builder and the Factory page.

Could you hand it over from the board now?
