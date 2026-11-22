# The extension starter

A whole small extension: a page, a Home block and a stage, with the list they
show kept in a file. Copy this folder to `factory/extensions/<id>/` in the
company's factory folder, then:

1. Rename it: the folder's name, `"id"` and every `"id"` inside (pages, blocks,
   stages) become the new extension's. Ids are lowercase letters, digits and
   dashes, and no other extension has the same.
2. Write `"name"`, `"about"` and every page's, block's and stage's name in the
   team's own words and language.
3. Keep what the team asked for and delete the rest: an extension that only
   adds a Home block has no page and no stage.
4. Replace `items.json` with what the page and the block show, or fill it from
   the extension's kobold: it is read each time the page is shown.
5. Delete this README.

The checks that run before the extension loads are in [writing an
extension](../extensions.md).
