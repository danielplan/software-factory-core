# The live export

[Knowledge base](../index.md) · [Reference](index.md) · [Signals](features/signals.md)

**Type:** Reference · Answers: what does Kobble read from the live app, and how is it set up?

Kobble's signals come from the app as it runs for its customers. The app
offers one read-only export, and Kobble reads it when the factory starts,
every 30 minutes while it runs, and when someone presses **Sync now** on the
Signals page. The export is anonymised on the app's server, before Kobble
sees it: a customer is an id, never a name, and an event holds no customer
data beyond what its text says.

## Settings

| Setting             | What it is                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `KOBBLE_LIVE_URL`   | The export's address. A `file:` address (`file:///…/live-export.json`) reads a file instead. |
| `KOBBLE_LIVE_TOKEN` | A read-only secret the app's owner makes on the server. Sent as `Authorization: Bearer …`.   |

Both are read from the environment, or else from the project's own `.env`
file, which stays out of git. Without `KOBBLE_LIVE_URL` the sync is off and
the Signals page asks for both: **Connect** reads the export once with the
token, says plainly what is wrong when it does not work, and otherwise
keeps both in `.env` (adding `.env` to the project's `.gitignore` when it is
not there) and reads at once. Settings, The live app, shows the address
(never the token) and **Disconnect** takes both out of `.env` again.

## The request

```text
GET <KOBBLE_LIVE_URL>?since=<cursor>
Authorization: Bearer <KOBBLE_LIVE_TOKEN>
```

The first time there is no `since`. The app answers with JSON:

```json
{
  "cursor": "2026-11-17T08:40:00.000Z",
  "events": [
    {
      "id": "ev-1001",
      "at": "2026-11-16T20:12:00.000Z",
      "kind": "bug-report",
      "customer": "c-2841",
      "text": "The basket was empty again when I came back in the evening to pay."
    }
  ]
}
```

- `cursor`: any text; Kobble keeps it beside the signals, in
  `factory/kobble/signals/.sync.json` (on this computer, not in git), and
  sends it back as `since` next time. Each computer reads the export for
  itself.
- `id`: the event's id, the same every time it is sent. Kobble takes each
  event once: an id it has seen is left out.
- `at`: when it happened, an ISO time with its offset.
- `customer`: the anonymous customer id, or `null`.
- `text`: what the event says, in words.

The schema is `liveExportSchema` in `packages/core/src/kobble/live.ts`.

## Kinds of events

| `kind`              | What happened                                      | The signal               |
| ------------------- | -------------------------------------------------- | ------------------------ |
| `bug-report`        | Someone used "Report a bug" in the app             | Bug, from the app        |
| `suggestion`        | Someone used "Suggest something" in the app        | Feature request, the app |
| `limit`             | The assistant was asked for something it cannot do | Feature request, usage   |
| `automation-failed` | An automation ran and failed                       | Bug, errors              |
| `error`             | The app's server had an error                      | Bug, errors              |
| `other`             | Anything else worth hearing                        | Feedback, usage          |

A signal's persona is the persona whose `customers` include the event's
customer; none when no persona does.

## When it does not work

A sync that fails keeps the signals as they were, and the Signals page says
why in a line: the address cannot be reached, the token is not accepted, the
app answered with an error, or its answer does not fit. The next sync tries
again.

## Trying it without a live app

The example company has an export as a file, `examples/acme/live-export.json`.
Run the factory on a copy of the example company with
`KOBBLE_LIVE_URL=file:///<path to the copy>/live-export.json` and the Signals
page fills from it.
