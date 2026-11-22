# The page's conventions

[Knowledge base](../../index.md) · [Reference](../index.md) · [Conventions](index.md)

**Type:** Reference · Answers: how is code written in Kobble's page, and where are its rules?

The page (`packages/dashboard/`) is a React web app. It follows the React web
app kit's rules like any product a factory makes
(`packages/kits/rules/react-web-app/`, or `npx software-factory rules dashboard`).
Its [blueprint](../../../packages/dashboard/BLUEPRINT.md) is the source for its
promises, folders, extra libraries and what still differs from the kit.

## Where code goes

| The code is…                                                    | It goes in…                                                    |
| --------------------------------------------------------------- | -------------------------------------------------------------- |
| one core area's screens and logic                               | `packages/dashboard/src/features/<area>/`                      |
| one extension's screens and logic, and its module (`index.tsx`) | `packages/dashboard/src/extensions/<id>/`                      |
| talking to the server                                           | `packages/dashboard/src/api/`                                  |
| a piece several areas share                                     | `packages/dashboard/src/components/`                           |
| shadcn's pieces, as generated                                   | `packages/dashboard/src/components/ui/`                        |
| the shell's pieces (sidebar, page head)                         | `packages/dashboard/src/components/layout/`                    |
| a general hook, or logic without screens                        | `packages/dashboard/src/hooks/`, `packages/dashboard/src/lib/` |
| a word on a screen                                              | `packages/dashboard/src/i18n/areas/`                           |
| putting the areas together: routes, the installed extensions    | `packages/dashboard/src/app/`                                  |

## Rules

- **One way:** shared folders → features and extensions → app. A feature
  never imports another; an extension never imports another extension or a
  core feature, and the core never imports an extension: each extension
  plugs in through its module (`src/lib/page-module.ts`), and only `app/`
  imports the extensions, mounting the installed ones. What two share moves
  to a shared folder. Checked by `npm run check:borders:dashboard`
  (`packages/dashboard/.dependency-cruiser.cjs`).
- **Every word in three languages**, through `useT()`: see
  [languages](../languages.md).
- **The look:** the variables and pieces in [the design system](../design-system.md);
  every button has an icon; every state holds.
- **One library per job,** the one the kit's table or the blueprint names;
  `packages/kits/test/libraries.test.ts` fails on a package neither names.

## Tests

The page's logic is tested with node's test runner in
`packages/dashboard/test/`. Component tests and click-throughs are not there
yet; the blueprint lists it.

## Lessons

The React web app kit's lessons (`packages/kits/rules/react-web-app/lessons.md`),
and [lessons from working on the core](../lessons/working-on-the-core.md).
