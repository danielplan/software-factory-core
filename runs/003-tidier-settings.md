# A tidier Settings page

## Request

Card [#15 A tidier Settings page](https://github.com/danielplan/software-factory-core/issues/15).

Settings is one long scroll of very different things: where work is
tracked, the live app, updates, add-ons, the factory's programs, this
computer, and each part's settings. Owners scroll past everything to find
the one thing they came to change.

Agreed: **A · Tabs, one page each** (prototype on `proto/X-3-a`,
exploration X-3), with the changes the team asked for along the way.

Where things stand (core 0.12.0 and after): `SettingsTab` shows every
section one under the other, with a list of their names at the side that
scrolls to each (hidden on a narrow screen).

## Plan and checks

What people see (as in prototype A, its last version):

1. **Five tabs** at the side of Settings, each with its icon:
   - **Connections**: where work is tracked, the live app.
   - **Updates**.
   - **Add-ons**: the add-ons and kits.
   - **This computer**: the start on the desktop.
   - **Advanced**: the factory's programs and each part's own settings
     (the settings groups no add-on has).
2. **Only the chosen tab shows**, with its own address (`#settings/updates`,
   `#settings/this-computer`, …), so a reload or a link stays there and the
   back button goes back. `#settings` alone opens Connections.
3. **The chosen tab** sits on white, like a card on the grey page, with the
   text and icon of the chosen page in the left sidebar (dark text, the icon
   in its colour); the others are plain grey text with a grey icon.
4. A tab with nothing in it does not show.
5. Old addresses: `#add-ons` and `#workshop/add-ons` now open the Add-ons
   tab; the "Change" link of a board add-on opens Connections.

Left out: variants B and C and the variant switch (`?variant=`).

Checks:

- Dashboard (tests): which tab each section goes in, the tab's address, the
  tab an address opens (an unknown or no address: the first), empty tabs
  left out; the old addresses.
- In the browser (show-result, screenshots): each tab, the chosen tab's
  look, a reload staying on the tab, a narrow screen.
- `npm run verify` passes.

Decisions made while building (cheap to change):

## Status

in progress

## Result

## Later
