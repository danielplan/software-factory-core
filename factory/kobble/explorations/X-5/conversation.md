<!-- conversation: 33b1d62c-eb36-4441-8126-95e13b4aa2ec -->

**You:** Okay, so I want to add a feature for my...

**Kobold:** The idea got cut off before they said what it is, so there's nothing to draw yet. Just ask.

I heard the start: you want to add a feature, but your words stopped there. What's the feature you have in mind, and who is it for?

**You:** Yeah, sorry. I wanted to add that I can add feature requests in the factory and also some kind of way that errors are directly managed and sent to the factory's GitHub board. But I think we need to find a general, more generic way to add this thing.

**Kobold:** I've put three ways on the board, and a prototype of each one is being made now:
- **A form**: people type a request in the Factory
- **One inbox**: requests and errors arrive from anywhere, labelled with where they came from
- **Errors straight to the board**: each error becomes a card at once

I'd pick the **one inbox**, because adding a new source later doesn't mean building a new path.

Where do your errors come from today?

**Kobold:** The prototype is ready, and all three pictures show what we asked for:
- **A**: a "New request" button. It's simple, but errors aren't covered.
- **B**: an Inbox above the board. Requests, live errors and GitHub issues each show where they came from.
- **C**: errors turn into cards by themselves, with a count of how often each happened. To do fills up fast.

One risk with B: it could feel like a **second Signals page**.

Try B and send the checkout error **Straight to To do**. Does that feel right?

**You:** I think you misunderstand. I want also something that allows me to send feedback from the factory and use this feedback in the factory. So in a way, the send part could also be a different application, while the use part is always in the factory.

**Kobold:** I put it on the board as two separate parts: **sending**, which any app can do, and **using**, which always happens in the factory. The inbox we built last time already covers the using part. For sending, I'd give each product its own **drop-box address**, and build a ready-made feedback button on top of it later.

Is that how you picture the sending part?

**You:** what do you mean by drop-box

**Kobold:** By drop-box I mean a **mailbox address** that belongs to one product:
- any app (your live app, a form, another tool) **posts a short message** to it, like "checkout failed" or "please add PDFs"
- it can **only receive**, so nobody can read anything out of it
- the factory **empties it** and turns each message into a signal

One catch: your factory runs on your own computer, so the mailbox has to **live online**.

Should it live online, or should GitHub act as the mailbox?

**You:** i think it should likely use a github board, but the problem is the github board is not always public

**Kobold:** A private GitHub board is fine, as long as the sending app never holds the **GitHub key**. Anyone could read the key there. I added two GitHub ways to the choice:
- **Through a small relay**: a tiny online helper keeps the key and turns each message into an issue on your private board. It costs very little to run.
- **Team only**: only people with GitHub access can send.

Should customers and errors from your live app be able to send too, or only your team?

**You:** but there is nothing live thats the probelm

**Kobold:** Then the simplest way is for each sender to use **their own GitHub sign-in**:
- the factory already connects to GitHub
- there's nothing to host and no key to hide
- the one limit: only people with access to your private board can send

I've marked the other ways as needing something online, which you don't have yet.

Who should be able to send: your own team, or other teams running a factory too?

**You:** everybody using the factoy

**Kobold:** For everyone using the factory, I'd go with a **public feedback board**:
- it's a separate GitHub repository just for feedback, so your code stays private
- any factory sends to it with the person's own GitHub sign-in, and there's nothing to host
- your factory reads it into the inbox we prototyped earlier
- before an error is sent, the person sees exactly what goes out, since it could contain their team's data

Is it okay with you if feedback is public there?

**You:** yes

**Kobold:** I marked the **public feedback board** as your pick. A prototype of the **sending side** is being made now:
- a **Send feedback** button in every factory
- an offer to **report an error**, with the details already filled in
- a **preview** that shows exactly what will be sent
- afterwards, the person can **follow** what happens to it

I asked for those details; they'll be added as soon as the first version is ready.

Should errors be offered for sending automatically, or only when someone clicks?

**Kobold:** Prototype E is ready. **Send feedback** sits at the bottom of the sidebar on every page.
- **Works**: a short form, similar posts so people don't send duplicates, and errors that can be unticked before sending
- **Off**: the feedback board on GitHub doesn't exist yet, so the GitHub page won't open. Your team creates that repository.
- **Missing**: no way yet to follow a post after sending

Open Send feedback and untick an error: does the form feel right?

**Kobold:** Prototype E now covers the whole **sending side**:
- **Error notice**: the factory hits an error and offers **Report this error**
- **Check step**: shows word for word what will go on the public board, and every part can be removed
- **After sending**: a link to the post and its state (sent, seen, planned, done)

The picture shows only the notice, so nobody has seen the form or the check step yet.

Click **Report this error** and remove the customer's name: does that feel safe?

**You:** can we make this a bit less "oldschool" think of a more modern way to make a feature request

**Kobold:** I started one new variant of E: **Tell the kobold**.
- no form: you just tell the kobold your wish in your own words
- it asks a question or two and finds teams that already asked for the same thing
- it writes the post for you to check, then sends it

A second idea, **Point at the screen**, can't start until this one is built. I'll add it then.

Should I add Point at the screen too?

**Kobold:** Variant **F, Tell the kobold**, is ready. In the picture, Sprocket opens with "Tell me in your own words."
- **Works**: no form, similar posts with a 👍 offer, a draft to check, and you can follow your post
- **Note**: Sprocket follows a fixed script in the prototype. The real one would think it through, using your own team's AI.

Type "I wish I could…" in F: does it beat the form?

**You:** this is maybe too minimal, since its not clear what you should do, maybe still open a customer support window with a chat where you can do something? But keep it minimal

**Kobold:** I've asked the maker to change **variant F** into a small **Help & feedback window**:
- three clear starting points: **Something is wrong**, **I wish Kobble could…**, **Ask a question**
- a small **Your posts** link to follow what you've sent
- picking one starts the chat with Sprocket, with a few quick answers to tap
- few words, lots of space, no form fields

Should **Ask a question** stay in there, or keep the window just for feedback?

**Kobold:** Variant F now opens a **Help & feedback** window, and the picture shows it as asked.
- **Works**: Sprocket says hello, three clear rows, and **Your posts (2)** at the bottom
- **Off**: the new words are only in English so far. The build adds Italian and German.
- **Risk**: there are now two ways to talk to Sprocket, the bar and this window

Pick **I wish Kobble could…** and add your 👍: does it feel clear now?

**You:** maybe open this in the sprocket window, make the sprocket window a bit more dynamic and not a stitic chat as it is right now

**Kobold:** I asked the maker to change **variant F**: no separate panel any more, everything opens in the **Sprocket window**.
- the window **grows** smoothly out of the bar
- what it suggests first **fits the page** you're on
- the post **builds itself** in a card at the top while you talk
- after Send, that card shows **live status**

Should the window offer to report errors by itself, or wait until you open it?

**You:** why does it randomly extend. also "your posts" is not needed, maybe we can put this into the feedback tab?

**Kobold:** It opened by itself because of a shortcut the maker added: in the prototype, the window **opens on its own** the first time you visit a page. I've asked for that to go, so it only opens when you click.
- **Your posts** moves out of the window and into a **Feedback** page under Send feedback in the sidebar

That change starts as soon as the current version is ready.

Do you want anything else changed in that Feedback page?

**Kobold:** Variant F now opens in the **one Sprocket window**, with suggestions that fit the page and a post that builds itself live.
- **Off**: **Your posts** is still in the window. Your request to move it to a Feedback page starts once the version being made now is ready.
- **Off**: the builder-stopped error is suggested twice. I've asked for that to be fixed too.

Click the waiting error in F: does the post building itself feel lively enough?

**You:** then the feedback should go to signals

**Kobold:** Got it: feedback lives in **Signals**, so I marked **One inbox** as your pick for where things land.
- the feedback you **sent** shows in Signals, with its state
- feedback **arriving** from the feedback board lands in Signals as signals, labelled with where it came from
- there's no separate Feedback page

The change starts as soon as the current version is ready.

Should feedback that arrives go straight to To do, or always get explored first?

**You:** in the prototype where would you put it

**Kobold:** I'd put it right into the **Signals list**, since each signal there already shows **where it came from**:
- feedback arriving from the board is an ordinary signal with its own **feedback-board** label
- the feedback you sent shows there too, with a small **state** label (seen, planned, done)
- a **Feedback** filter at the top shows only those

Shall I ask the maker for exactly that?

**You:** this is a bit redundant:

Sprocket


Hi, I'm Sprocket.
You're on Explorations. How can I help?


Also the + button is weird

**Kobold:** You're right, that's said twice. I've asked for:
- Sprocket's name **only once**, in the header, and just "How can I help?" below it
- the **+ button** gone, with a small **Start over** link once you've started talking
- feedback in the **Signals list**, with a Feedback filter, as I described

All of it starts as soon as the current version is ready.

Anything else in the window you'd like simpler?

**Kobold:** The window now **stays closed** until you open it. **Your posts** has moved to a separate **Feedback page**.
- that page was your earlier request; the switch to **Signals** is next
- also coming: Sprocket's name **once**, and the **+ button** gone

Both changes start by themselves.

Until then, open Send feedback and check the step bars: are **seen, planned, done** easy to read?

**You:** in the one inbox, put them into signals

**Kobold:** I've asked the maker to move the inbox in **variant B of prototype A** onto the **Signals page**:
- requests, errors and feedback-board posts show in the ordinary Signals list, each labelled with where it came from
- a small filter at the top shows one kind at a time
- **Straight to To do** and **Explore** stay on each one
- the Factory page goes back to just the board

Should errors also go into Signals, or only feedback?

**Kobold:** Prototype A is ready (changed: Variant B ("One inbox, any source") only: move the Inbox off the Factory page and into the Signals page. Requests, errors from the factory and posts from the public feedback board appear in the ordinary Signals list, each with its source label (Request, Error, Feedback board, GitHub issue); a small filter at the top shows one source at a time. Keep "Straight to To do" for small ones and "Explore" for bigger ones on each signal. The Factory page goes back to just the board. Open it on the Signals page.). Try it on the board.

**Kobold:** Variant F is close. Feedback now shows up in **Signals**, each with a state label, and an **All · Feedback** filter at the top.
- **Works**: posts from other teams sit next to yours, with "7 teams want this", Fix and Explore
- **Off**: under "All", a large empty box still shows below the list. I've asked for one list sorted by time.

While that's fixed, click **Fix** on a post from another team: should it go straight to To do?

**Kobold:** The empty box is gone, and in **variant F** the feedback now sits in **one Signals list**, newest first.
- **Prototype E, variant F**: Sprocket for sending, Signals for following and using
- **Prototype A, variant B**: also puts everything in Signals, filtered by where it came from. That repeats F's using part.

I'd agree to **variant F of prototype E** as the whole idea.

Shall I mark it agreed?

**You:** can we give them personas or how would that work int hes signlas

**Kobold:** Yes, that works. Signals already show a **persona's face** next to each signal, or a blank tile when no persona fits. I put three ways to fill that in on the board:
- **the kobold matches** each post to a persona
- **the sender says who they are** with one quick question in Sprocket
- **no personas**, just the team's name

I'd pick the **sender says**: it's more reliable than a guess.

Which one should I prototype?

**You:** I pick A: The kobold matches it.

**Kobold:** I'm adding that to **variant F**: posts from the feedback board get the **face of the persona** the kobold thinks they fit.
- each one gives a short **reason** ("Sprocket thinks this is…"), and you can change it
- posts the kobold isn't sure about **stay blank**

Should your own sent posts get a persona too, or only posts from other teams?

**You:** the caht is a bit buggy, did it not see it open?

**Kobold:** No, the maker never saw the chat open. Its picture tool can't click, so the chat was **never tried end to end**. I've asked it to:
- click through **every path** in the chat itself
- fix anything that jumps, repeats or gets stuck

That starts as soon as the persona change is done.

What went wrong when you tried it?

**Kobold:** Posts from other teams now show a **persona's face**, with Sprocket's reason, **Change** and **Remove**. One post is left blank on purpose.
- **Off**: the personas come from a made-up **shop** (Bruno, Mia, Noah), so a bug about the builder fits them loosely
- **Next**: the chat fix starts by itself

Open the blank post and pick a persona: does correcting it feel easy?

**You:** there is somet spacing issues

**Kobold:** I see a few too. I've asked the maker to fix them:
- the line under the Signals list runs into the **Sprocket bar**
- **Change** and **Remove** sit too close to Sprocket's reason
- check the gaps in the **chat window** and the **error notice**

That starts once the chat fix is done.

Where did you spot the spacing issue?

**You:** what is the difference between "exploration" and "signal" in the github board

**Kobold:** On the factory's GitHub board, neither of them is a card yet:
- a **signal** is something you heard, like a feedback post: raw, not decided
- an **exploration** is where you and the kobold think a signal through, until a prototype is agreed
- only a **hand-off** puts a card into **To do** on the GitHub board

So on a feedback post, **Fix** goes straight to To do, and **Explore** opens an exploration first.

Is that what you meant?

**You:** its both in the backlog?

**Kobold:** I checked: yes, in a way. The board's **Backlog** holds both:
- **ideas**: issues waiting to be explored. Exploring one starts from that issue, and the hand-off fills it in and moves it to To do.
- **stuck cards**, which the builder moves back to Backlog

Signals themselves stay in the factory, not on GitHub.

Should feedback posts land in the Backlog as ideas, rather than only in Signals?

**Kobold:** The maker clicked through the **whole chat** this time and fixed about ten things:
- the chat now **scrolls with the newest line**, so nothing is cut off at the bottom
- no more **repeated lines**, double "Sent" or error that keeps coming back
- similar posts now **actually match** what you typed

Your spacing fixes start next, by themselves.

Click **Report this error** and send it: does the chat feel smooth now?

**You:** it still opens up too much, like there is a weird white space, the rest is fine

**Kobold:** I've asked for the **Sprocket window** to:
- open only as tall as what it shows, with **no empty space**
- grow only as the conversation adds lines

That starts after the spacing fixes being made now.

Once it's right, shall I mark **variant F** agreed?

**Kobold:** The spacing is better: **Change** and **Remove** now have their own row, and the **error notice** has even padding.
- **Still off**: in the picture, "Send more personas…" still touches the **Sprocket bar** until you scroll down
- **Next**: the window that opens too tall, with no empty space; that fix starts by itself

Should I add the bottom line to that fix too?

**Kobold:** The **Sprocket window** now opens only as tall as what it shows, with no empty space. The maker measured it:
- it opens **small**, from the bar or from Send feedback
- it **grows** as you talk, then scrolls once it reaches its top height
- **Start over** shrinks it back to small

The picture only shows the page with the window closed.

Open Sprocket and pick **Something is wrong**: is the white space gone?

**You:** i think its good like this

**Kobold:** I marked **variant F (Tell the kobold)** as agreed, together with your picks. I also added a note of what's still needed before it goes live:
- your team **creates the public feedback board** on GitHub
- the new words get **Italian and German**
- Sprocket **actually thinks**, instead of following the prototype's script

Shall I hand it off to the factory?
