<!-- conversation: d84121e4-a9cb-490b-bea4-f7ef3dd830a2 -->

**Kobold:** I added a choice on how to send the testers in, and a small diagram of what one tester goes through. "What we heard" is still empty, so I went by the problem and by what's already built.

Persona tests already exist. Today one persona at a time uses the app on this computer through a browser and keeps a diary of each step. The diary becomes a bug or a feedback signal. What's missing is three things: the kobold suggesting a task, the "idea" and "open question" kinds, and several testers running at once.

**Behind the scenes:** each tester is a full AI session with its own browser. Running several at once costs more and makes the computer work harder. They may also need their own copy of the app, so one tester doesn't change another's data.

I'd start with **A**. The team still reads and adjusts each suggested task, which is a cheap way to learn whether the suggestions are any good. **B** and **C** can come later on the same building blocks.

What matters most for you in this first version: control over each task, getting lots of signals quickly, or not having to think about it at all?

**You:** not sure, signals should still be signals, but th empty page i was thinking should maybe say to you go the agents and run them over the app to get ideas for what to improve

**Kobold:** Got it: signals stay signals. The empty Signals page is where it starts. Instead of just being blank, it invites you to send the personas through the app to find what to improve. I put that on the board as a note and a small diagram.

Prototype A puts the Run button on each persona's page. That would mean the empty Signals page sends you elsewhere instead of starting the testers itself.

I'd suggest a middle way. The button opens a short list right there on the Signals page: each persona with the task the kobold suggests, all ticked, and one Send. You can change a task or untick someone, but most of the time it's one click.

Would that work for you, or should the button send everyone straight away?

**You:** prototype A pus the sginals in, but this is not what we are talking about.

**Kobold:** I rewrote the choice around what the empty Signals page offers. I also added a note that Prototype A is still the old idea, so the next prototype starts from an empty page.

The three ways are:
- **A:** the page explains there are no customers yet and points you to Personas.
- **B:** the page lists each persona with its suggested task, all ticked, plus one Send button.
- **C:** one button sends everyone, with no list to check.

I'd go with **B**. You see what each tester will try before anything runs, and the signals come in on the same page you started from.

Shall we make a prototype of B?

**You:** there are personas, it should send you to the persona where it should be easy to send them on a misison

**Kobold:** Got it: the empty Signals page sends you to Personas. I updated the first choice and the diagram to match.

Now the next question is how easy "send on a mission" should be on a persona's page. I put three ways on the board:
- **A:** the kobold suggests one mission from the persona's journey, and you press Send or change the words first.
- **B:** the kobold suggests three missions to pick from.
- **C:** you write the mission yourself.

I'd go with **A**: one click when the suggestion is good, and still easy to change. One thing to know: today only one persona test runs at a time and the others wait, so running several at once is new work.

Which way feels right to you?

**You:** A

**Kobold:** I marked it agreed, along with the empty-page path. So the path is: the empty Signals page sends you to Personas, and on a persona's page the kobold suggests one mission from their journey. You press Send, or change the words first.

The next step is a prototype of this, starting from an empty Signals page so it doesn't skip the point like the first one did.

Do you want to make it now from option A of the mission choice, or first decide what the persona's page shows while a mission is running?

**You:** show me a prototype

**Kobold:** I can't make prototypes myself; the team does. Press **Make** on option A of the mission choice I'm pointing at. When it's built, it appears on the board and you can open it.

The board notes that it should start from an empty Signals page, so it doesn't skip the point like the first one did. Since this product has no made-up world, I can't empty the page for it myself.

When you open it, try this path: the empty Signals page, then Personas, then one persona, then Send with the suggested mission. Does the way there feel easy enough?

**You:** why is there no prototpye of A

**Kobold:** I checked: a prototype's name comes from the exploration and the option's letter only, not from which choice it belongs to. So option A of the mission choice gets the same name as the old Prototype A. The board thinks A already has one and doesn't make a new one.

The quickest fix is for me to take the old Prototype A off the board, since it missed the point anyway. Then Make on A starts fresh. Its work stays saved on its branch, but that branch may also have to be cleared first; I can't check that from here.

Separately, two choices in one exploration sharing a letter is a flaw in Kobble itself. That's worth its own exploration.

Shall I take the old Prototype A off the board?

**You:** lets focus on A2, it should actually redirect me to the personas page, just show me that i can create the first signals using it

**Kobold:** I added a note to A2 with what it has to show. With no signals yet, the Signals page takes you to Personas, and there you see that sending a persona on its suggested mission makes your first signals.

A2 is already on the board, but I can't see whether it was built with that in mind. Open it and check that the way from the empty page to Personas feels right.

One thing to settle while you look: should the empty Signals page take you to Personas by itself, or show one clear button that takes you there? I'd go with the button. It's less surprising, and you still see why the page is empty.

**You:** try again

**Kobold:** I've started remaking A2; it takes a few minutes, and the board shows when it's running again. I asked for the following:
- **Signals page:** it starts empty, with no signals put in beforehand. It explains that the first signals come from your personas, and has one clear "Go to Personas" button.
- **Personas page:** each persona shows a suggested mission you can edit, and a Send button.
- **After Send:** the mission runs, and the first signals (bug, idea, open question) appear on the Signals page.

When you open it, does that path feel like the right way to get your first signals?

**Kobold:** Prototype A2 is ready (changed: Start with no signals at all: the Signals page is empty. The empty Signals page says there are no customers yet and that the first signals come from sending the personas over the app, with one clear button "Go to Personas" that takes you to the Personas page. On the Personas page, make it obvious that this is how you create your first signals: each persona shows one mission the kobold suggests from its journey, which you can edit, and a Send button. After Send, show the mission running, and then the first signals (bug, idea, open question, each with the step where it happened) appearing on the Signals page. Do not put any signals in beforehand.). It runs on the board; try it there, or press Bigger to use it full size.

**You:** maybe we need to make the starting of new missions easier. And explain it a bit more easily. Also use an illustration

**Kobold:** I've started remaking A2 with an easier start, shorter words and an illustration; the board shows when it's running again. Here's what I asked for:
- **Empty Signals page:** a drawing of your personas as their kobolds, heading into the app. Under it, one short sentence and a "Send a persona" button.
- **Personas list:** you can send a persona straight from the list, without opening its page. Each card shows its suggested mission, which you can change with one click, and a big Send button. There's also "Send everyone" at the top.
- **While it runs:** the card shows the kobold on its way ("step 2 of 5"), then "3 new signals" when it's done.

"Send everyone" brings back a little of the one-click idea you set aside earlier. Do you want to keep it, or just one Send per persona?

**Kobold:** Prototype A2 is ready (changed: Make starting a mission easier and the explanation simpler, with an illustration.
1. Empty Signals page: a friendly illustration in Kobble's own style, the personas drawn as their kobolds (each with its hat and colour), walking into the app with a little flag or map. Under it, one short sentence in plain words, like "No customers yet. Send your personas to try the app, and what they find shows up here." One button: "Send a persona".
2. Personas page: start a mission right from the list, without opening a persona first. Each persona card shows its kobold, one line with the mission the kobold suggests from its journey, and a big "Send" button. Clicking the mission line lets you change the words. Add a "Send everyone" button at the top for all suggested missions at once.
3. After Send, the card shows the persona's kobold "on its way" with a small progress line ("trying step 2 of 5"), and when it is done, "3 new signals" linking to the Signals page.
Keep the words short and everyday; no long explanations.). It runs on the board; try it there, or press Bigger to use it full size.

**You:** this is a bit too childish, our thing doesnt have bodies

**Kobold:** I've started remaking A2 in a calmer, more grown-up style; the board shows when it's running again.

- **Illustration:** only the face tiles Kobble already draws, in a small row next to a plain outline of an app screen. No bodies.
- **While a mission runs:** just the face, the mission and a quiet "Step 2 of 5".

When you open it, does the tone fit the rest of Kobble now?

**Kobold:** Prototype A2 is ready (changed: The illustration is too childish: our personas have no bodies. Use only the faces as Kobble already draws them (the kobold face on its coloured tile, from the existing face component), never bodies, walking or flags. Empty Signals page: a calm, simple illustration: the personas' face tiles in a small row next to a plain outline of an app screen, with a few small marks on the screen where they would find things, in the design system's soft colours. Keep the short sentence and the one button. On the persona cards while a mission runs, no "on its way" playfulness: just the face tile, the mission, and a quiet progress line ("Step 2 of 5"), then "3 new signals". Overall tone: calm and professional, like the rest of Kobble's pages.). It runs on the board; try it there, or press Bigger to use it full size.

**You:** The personas tab is actually an overview of personas, and it just shows maybe a potential mission to send it to as suggested, or the mission the persona has?

**Kobold:** Good point: the Personas tab is an overview, so each card should stay light. I put it on the board as a choice with three answers:
- **A:** each card always shows the suggested next mission.
- **B:** each card shows the mission the persona is on or last did.
- **C:** each card shows whichever fits the moment.

I'd go with **C**. While a persona is on a mission, you see that mission and how far it is. Otherwise you see the suggested next one with Send, so the overview never shows something out of date. Changing the mission's words or looking at past missions would then happen on the persona's own page.

Which one fits how you picture the overview?

**You:** It should actually display the description, not editable, just show who this is, use cards

**Kobold:** I've started remaking A2 with this; the board shows when it's running again. I also added it to the card choice as option D.

The Personas page is now a grid of cards. Each shows the persona's face, name and description, which can't be edited. A small "Send on a mission" button opens the kobold's suggested mission, and you can change the words there before sending. While a persona is on a mission, its card shows a quiet line with its progress.

Is a small button on each card what you meant, or should sending happen only on the persona's own page?

**Kobold:** Prototype A2 is ready (changed: The Personas page is an overview of who the personas are. Show them as cards in a grid: each card has the persona's face tile, its name and its description, read-only (not editable, no text box). Remove the mission line and the editable mission from the cards. Each card keeps one small, quiet "Send on a mission" button; pressing it opens a small panel with the mission the kobold suggests from that persona's journey (the words can be changed there) and Send. While a persona is on a mission, its card shows a quiet line "On a mission · Step 2 of 5", then "3 new signals" linking to the Signals page. Keep "Send everyone" at the top. Keep the empty Signals page and its calm illustration as they are.). It runs on the board; try it there, or press Bigger to use it full size.

**You:** I think it should open a detail page of the personas and make it better

**Kobold:** I've started remaking A2; the board shows when it's running again. The cards now only show who each persona is, and clicking one opens their own page. That page has, from top to bottom:
- who they are and which app they use;
- the next mission the kobold suggests, with Send and a small "Change" link;
- their journey as a row of steps;
- the mission running, step by step;
- past missions, each with the signals it found, linked to the step where each happened.

I updated the diagram to show this path.

"Send everyone" is still at the top of the overview. Do you want to keep it, or take it out so missions are only sent from a persona's own page?

**Kobold:** Prototype A2 is ready (changed: Remove the "Send on a mission" button from the persona cards: the overview cards only show who the persona is (face, name, description, read-only), and clicking a card opens that persona's detail page. Keep "Send everyone" at the top of the overview. Make the persona detail page better, calm and clear, in Kobble's style:
- At the top: the face tile, the name and the description (read-only), and which app they use.
- Next: "Next mission": one mission the kobold suggests from the persona's journey, shown as a short sentence, with a clear "Send" button; a small "Change" link lets you edit the words first.
- Their journey as a short row of steps, so you see what the mission covers.
- While on a mission: the mission, its progress step by step ("Step 2 of 5: choosing a delivery slot"), quietly updating.
- Past missions, newest first: each with its date, the mission, and the signals it found (bug, idea, open question), each signal showing the step where it happened and linking to the Signals page.
- When there are no missions yet, one short line: "No missions yet. Send <name> on the suggested mission to get your first signals."). It runs on the board; try it there, or press Bigger to use it full size.

**You:** no need for the journey, just a suggested next vision (make clear through a badge that its suggested)

**Kobold:** I've started remaking A2; the board shows when it's running again. I've taken the journey off the persona's page. Now there's just the next mission, with a small "Suggested" badge, Send, and a "Change" link. Once you change the words, the badge goes away, since it's no longer the kobold's suggestion. I updated the diagram to match.

Once you've opened it, shall I mark the card choice, option D ("Who this is"), as agreed?

**Kobold:** Prototype A2 is ready (changed: On the persona's detail page, remove the journey (the row of steps) completely. Keep only one "Next mission": the mission as a short sentence, with a small, clear "Suggested" badge beside it (Kobble's badge style, soft colour) so it is obvious the kobold suggested it, a clear "Send" button, and a small "Change" link to edit the words first (once changed, the badge goes away). Keep the rest: who they are at the top, the mission running step by step, past missions with their signals.). It runs on the board; try it there, or press Bigger to use it full size.

**You:** put the suggested on top in the next mission and maybe show the agent

**Kobold:** I've started changing A2; the board shows when it's running again. In "Next mission", the "Suggested" badge now sits on top, next to Kobble's own kobold face and "Suggested by the kobold". The mission, Send and Change come under it.

By "the agent", did you mean the kobold that suggests the mission, or the persona showing itself at work while on a mission?

**You:** this part is also a bit sketchy: ses the shop app · Bakery owner · back office · added by you
Orders flour and supplies every Monday from the office laptop and pays suppliers once a month.

Edit

**Kobold:** I've started tidying the top of the persona's page; the board shows when it's running again. Here's what I asked for:
- **Name and role:** the name with "Bakery owner" quietly under it.
- **Description:** shown as normal text.
- **App:** one small "App: Back office" label that fits who they are. Every persona will test the app that matches their role.
- **Small things:** "added by you" goes to the bottom, and Edit becomes a small link at the top right.

Once you've seen it, is the persona's page close enough that we can mark A2 as agreed?

**Kobold:** Prototype A2 is ready (changed: In the "Next mission" block on the persona's page, put the "Suggested" badge on top, above the mission sentence, together with the agent that suggested it: Kobble's own kobold face (the small light-blue kobold with its blue cap, from the existing face component) and "Suggested by the kobold". Below: the mission sentence, then Send and the small "Change" link. Once the words are changed, the badge and the kobold go away.). It runs on the board; try it there, or press Bigger to use it full size.

**You:** the next mission label is a bit weird

**Kobold:** I've started changing A2; the board shows when it's running again. The "Next mission" label is gone. There's now a plain section title, "Send on a mission", like the page's other titles. Under it, one card shows the kobold's face and a small "Suggested" badge on one line, then the mission in slightly larger words, then the Send button and a Change link.

Is that what felt weird, or was it something else about the label?

**Kobold:** Prototype A2 is ready (changed: The "Next mission" label looks weird. Remove the "Next mission" heading and the stacked label. Instead, one calm card with a single header line: Kobble's small kobold face, then a small soft "Suggested" badge, on one line. Under it the mission sentence itself, a bit larger, as the main thing. Under that, the "Send <persona's name>" button and the small "Change" link. Above the card, a plain section title "Send on a mission", in the same style as the page's other section titles (like "Past missions").). It runs on the board; try it there, or press Bigger to use it full size.

**You:** looks good, the past missions and the signals stuff is maybe weird with the switch, not sure what it was about

**Kobold:** I put this on the board as a choice with two ways:
- **A:** drop the switch and keep one list of past missions, each with the signals it found. Signals from real customers would appear as a second section only after launch, once there are any.
- **B:** keep the two tabs, so mission signals show up twice.

I'd go with **A**. Before launch, every signal comes from a mission anyway, and one list is easier to follow.

Shall I change A2 that way?

**You:** I pick A: One list: missions.

**Kobold:** I've marked A as agreed and started changing A2; the board shows when it's running again. The tabs are gone. Under "Send on a mission" there's now one list of missions, newest first, each with the signals it found. Signals from real customers will appear as their own section only after launch.

Once you've looked at it, is A2 ready to be marked as the agreed prototype?

**Kobold:** Prototype A2 is ready (changed: On the persona's page, remove the switch (the tabs "Signals on this computer" and "Tests"/"Missions"). Under "Send on a mission", show one list titled "Missions", newest first: the running mission on top with its quiet step-by-step progress, then each past mission with its date, the mission sentence, and the signals it found (bug, idea, open question), each showing the step where it happened and linking to the Signals page. With no missions yet, one short line: "No missions yet. Send <name> on the suggested mission to get your first signals." Signals from real customers appear as a second section "From real customers" only when there are any (after launch); before launch it is not shown at all.). It runs on the board; try it there, or press Bigger to use it full size.

**You:** perfect i think its don enow

**Kobold:** I've marked A2 as the agreed prototype, along with the choices and notes behind it.

I also added a note for the builders listing what's new compared with today:
- several personas on a mission at the same time (today each one waits for the previous to finish);
- the kobold suggesting a mission;
- signals of kind "idea" and "open question", each linked to the step where it happened;
- "Tests" renamed to missions.

Missions running again after each merge stays for later.

The next step is **Hand off** on the board, which turns this into a task on the Factory board. Before that: should "Send everyone" at the top of the overview go into the build, or wait until later?
