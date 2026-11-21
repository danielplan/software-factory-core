# Signals from AI testers

**The problem:** Before launch there are no customers, so the Signals page is empty: the live export has nothing to send and no persona test has run. Before launch, a signal is something learned while building that might change what we build. The first version should let the team send AI testers (the personas) into the apps: each persona tries its own app (a customer the shop app, a shop owner the orders page), with a task the kobold suggests from that persona's journey, and what they run into comes back as signals (bug, idea, open question), each linked to the step where it happened. Several can run at once; later they run again after each merge. Connecting the live app moves to a small line for later.

**The question:** —

**Agreed:** A2 · One suggested mission. The kobold suggests one mission from the persona's journey; Send, or change the words first.

**The prototype:** on the branch `proto/X-1-a2`.

**What we learned:**
- Signals stay signals (bug, idea, open question). Before launch, the empty Signals page invites the team to send the AI testers over the app to find what to improve.
- Prototype A misses the point: it starts with signals already there. The next prototype starts from an empty Signals page.
- A2 must show: the empty Signals page (calm illustration, one short sentence) sends you to Personas. The overview cards only show who each persona is (face, name, description); a card opens the persona's page: who they are, "Send on a mission" with the kobold's suggestion (badge) and Send, then one list of missions with the signals each found. No switch, no journey; real customers' signals only after launch.
- For the build, new compared with today: several personas on a mission at once (today one waits for the other), the kobold suggesting a mission, signals of kind "idea" and "open question" with the step where they happened, and "Tests" renamed to missions. Later: missions again after each merge.
- Agreed diagram: From the empty Signals page

<!-- factory:kobble exploration=X-1 prototype=A2 -->

Handed off as #10.
