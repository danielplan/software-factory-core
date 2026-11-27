# Features

[Knowledge base](../../index.md) · [Reference](../index.md)

**Type:** Index · Answers: what can Kobble do today, and where does each feature live?

One page per area a person meets: what it does, the rules that must hold,
where it lives in the server and the page, the decisions behind it, what is
checked and what is open. Test files named without a folder are in
`packages/server/test/`.

| Feature                                                         | What it is                                                                     | Brought by   | Page                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------ | ------------------- |
| [The Factory](factory.md)                                       | The board, Bolt the builder, stuck cards, Continue, only passing work pushed   | Factory      | `#build`            |
| [Explorations](explorations.md)                                 | Doodle, the whiteboard, the hand-off card                                      | Explorations | `#explore`          |
| [Prototypes and made-up worlds](prototypes.md)                  | Tinker, variants and states, the shared made-up data                           | Explorations | `#explore/<id>`     |
| [Signals](signals.md)                                           | The live app, tests and feedback as signals; the "already" check; Fix, Explore | Signals      | `#signals`          |
| [Personas](personas.md)                                         | The real kinds of customer the app is for                                      | Personas     | `#personas`         |
| [Testing](testing.md)                                           | Mimic living a few days in the app as one persona                              | Testing      | `#testing`          |
| [Releases](releases.md)                                         | A numbered release with notes from the merged pull requests                    | Releases     | `#releases`         |
| [Sprocket](sprocket.md)                                         | The guide on every page, and what extensions plug into it                      | the core     | every page          |
| [The feedback board](feedback-board.md)                         | Wishes and bugs sent to the people who make Kobble                             | the core     | Sprocket's window   |
| [Home](home.md)                                                 | Blocks from the installed extensions, arranged by the team                     | the core     | `#home`             |
| [System](system.md)                                             | The product's parts as a map, started and stopped                              | the core     | `#system`           |
| [The Marketplace and extensions](marketplace-and-extensions.md) | Installing extensions, the connections, kits, a team's own extensions, stages  | the core     | `#extensions`       |
| [Settings and updates](settings-and-updates.md)                 | The tabs of Settings, updates of the folder and of Kobble, the usage log       | the core     | `#settings`         |
| [Setup](setup.md)                                               | Setting up a factory with the setup coach                                      | the core     | before a factory    |
| [Voice](voice.md)                                               | Talking instead of typing, on this computer                                    | the core     | setup, explorations |
| [The theme](theme.md)                                           | The company's look, in `factory/theme.css`                                     | the core     | every page          |
| [The knowledge base](knowledge-base.md)                         | Its shape, kept in every factory                                               | the core     | `docs/`             |

How these pieces fit together: [how Kobble is built](../../explanation/how-kobble-is-built.md).
