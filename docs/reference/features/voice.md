# Voice

[Knowledge base](../../index.md) · [Reference](../index.md) · [Features](index.md)

**Type:** Reference · Answers: how can the team talk to a kobold instead of typing, and what leaves the computer?

## What it does

The owner can talk instead of typing: to the setup coach's first question and
to Doodle in an exploration (**Talk**). Two speech models run in the browser
(Whisper): a quick one shows their words while they speak, an accurate one
writes the sentence as soon as they pause. The kobold's answer is read out
as it is written (Piper, also in the browser), and saying "stop" interrupts
it. The models are a one-time download of about 0.8 GB.

## Rules that must hold

- Nothing said leaves the computer except the written words sent to the
  kobold.

## Where it lives

| Part    | Where                                                             |
| ------- | ----------------------------------------------------------------- |
| Screens | `packages/dashboard/src/components/voice/`                        |
| Hooks   | `packages/dashboard/src/hooks/voice/`                             |
| Logic   | `packages/dashboard/src/lib/voice/` (hearing, speaking, the call) |

Its libraries (Piper, Whisper through Transformers.js, ONNX Runtime Web) are
listed in [the page's blueprint](../../../packages/dashboard/BLUEPRINT.md#libraries).

## Checked and not checked

Checked by tests: the voice's logic (`packages/dashboard/test/voice.test.ts`,
`packages/dashboard/test/hearing.test.ts`). Open: voice as an extension of its
own; today it is part of the core.
