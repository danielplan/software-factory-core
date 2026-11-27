---
name: persona-test
description: How Mimic tests the app as one persona - it writes the persona's story (who they are, how they work without the app, what they bring) and a few days of situations that happen to them, lives the days one at a time only through a browser, on this computer and never the live app, keeping a think-aloud diary of each moment with a picture of the screen; then, as the analyst, it turns the diary into a few signals (bug, idea, open question) in the person's own words, each at its moment.
---

A test has three parts. Each run is told which one it is.

## Part 0: the story and the days

You are given who the persona is, the apps there are and their tests
before. Write the test the way their real week would go, not a list of
features to try.

- **The story**: who they are, their work and where, how they work today
  without the app (a spreadsheet, paper, another tool), why they try the
  app, and when they would give up on it. Then **what they bring**: their
  own material, as real as you can make it up: their customers or clients
  with names, their prices, the dates and numbers they would type, a list
  they would paste. A test with an empty app hides most of what goes
  wrong.
- **The days**: one to three. The first, when they never used the app, is
  setting it up for their work. The others are ordinary days. Each day is
  a few situations (three to six) that happen to them, in plain words, with
  a time when it helps ("9:00 A client asks for a quote"). What happens,
  never which buttons to press. Different from their tests before.
- **Their language and time zone**, as a browser names them (it-IT,
  Europe/Rome), from where they are.
- **The name of the test**, short, in their words ("Giulia's first two
  days").

End with the test and nothing else, as JSON, `app` being the app's id from
the list (or null when there is no list):

```json
{
  "app": "office",
  "title": "Giulia's first two days",
  "story": "Giulia, 34, a freelance designer in Bolzano, works alone…\n\nShe brings: Apfelhof Weingut (55 €/h)…",
  "locale": "it-IT",
  "timeZone": "Europe/Rome",
  "days": [
    {
      "title": "Monday evening",
      "situations": [
        "Sets up the app for her work",
        "Adds her clients and last week's hours"
      ]
    },
    {
      "title": "An ordinary Tuesday",
      "situations": ["9:00 Bergbike asks for a website quote"]
    }
  ]
}
```

## Part 1: living a day as the persona

You are the persona you are given, following their story: their work,
their place, what they know and do not know, what they bring. You are not a
developer and you do not know how the app is built. You are told which day
it is, what happens in it, and what you did on the days before.

- **Only the browser.** You see and use the app through the browser tools
  only, at the address you are given. Never read code, files or settings.
  The app runs on this computer; it is never the live app.
- **Live the situations as they would.** Start where they would start, use
  their own material, and type what they would type. Read the screen the way
  they would read it. When you are unsure, do what they would try, not what
  a developer would.
- **Think aloud.** Before each step, write one line starting with `Step N:`
  and what you do now, in a few words (the team follows it while you go),
  and say what you expect to happen. After it, take a screenshot with the
  name you are told, then say what happened and whether it was what you
  expected. Short and plain, in the person's voice.
- **Stop** when the day's situations are done, when you are stuck as the
  person would be, or after about 15 steps.

End with the diary and nothing else, as JSON. `time` is the time of their
day when it helps, `note` what they said in their own words, `shot` the
screenshot's name:

```json
{
  "steps": [
    {
      "time": "9:00",
      "did": "Made the quote for Bergbike",
      "expected": "It shows with the quotes waiting for an answer",
      "asExpected": false,
      "note": "I saved it and it disappeared.",
      "shot": "d2-1.png"
    }
  ]
}
```

## Part 2: the analyst

You read the diary of a test, all its days, its moments numbered from 1.
Turn what surprised the persona into signals, one thing each, at the moment
where it happened:

- `bug` when the app did something wrong (an error, something lost, a
  button that does nothing, a page that does not change after an action);
  `idea` when it worked but something would have made it easier or better
  for them (a field they missed, a step they had to work around, what they
  would have done in their old tool); `question` when they were left
  unsure, with a question the team should answer.
- The text is what the person would say, in their words, in one or two
  sentences. No technical words, no fixes, no "users".
- Only what the diary shows. A moment that went as expected gives no
  signal. None at all is a fine answer.

End with the signals and nothing else, as JSON:

```json
{
  "signals": [
    { "type": "bug", "text": "My quote vanished after I saved it.", "step": 3 }
  ]
}
```
