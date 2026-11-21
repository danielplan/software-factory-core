# A tidier Settings page

**The problem:** Settings is one long scroll of very different things: where work is tracked, the live app, updates, add-ons, the factory's programs, this computer, and each part's settings. Owners have to scroll past everything to find the one thing they came to change.

**The question:** How should Settings be arranged?

**Agreed:** A · How should Settings be arranged?. 

**Variant:** A · Tabs, one page each. The side list becomes tabs; only the chosen section shows, with its own address.

The prototype holds the variants A, B, C, shown by the page address (`?variant=A`). Build only A: leave out the others and the variant switch.

**Changed along the way** (all of it is on the prototype's branch, and all of it is to be built):
1. In variant A (tabs): use fewer tabs, grouped into 4 themes: Connections (where work is tracked, the live app), Updates, Add-ons (add-ons, kits and each part's own settings), This computer & advanced (this computer, the factory's programs). Make the selected tab much clearer: filled background and bold text, clearly different from the others.
2. In variant A: the selected tab looks weird. Style it like the selected page in the left sidebar (same text colour, weight and icon treatment), just without the background. Also: each part's own settings go under the "This computer & advanced" tab, not under Add-ons.
3. In variant A: (1) the selected tab gets a white background (like a card on the grey page), with dark text styled like the selected page in the left sidebar; the other tabs stay plain grey text, no background. (2) Split "This computer & advanced" into two tabs: "This computer" (this computer) and "Advanced" (the factory's programs and each part's own settings). So 5 tabs: Connections, Updates, Add-ons, This computer, Advanced.
4. The team still sees only 4 tabs in variant A on the board, although your screenshots show 5. Make sure the running prototype of variant A shows the latest version (5 tabs: Connections, Updates, Add-ons, This computer, Advanced; white selected tab), restarting it if needed, and check it in the running prototype.

**The prototype:** on the branch `proto/X-3-a`.

**What we learned:**
- 5 themed tabs: Connections, Updates, Add-ons, This computer, Advanced (the factory's programs and each part's own settings). The selected tab has a white background, with text like the selected page in the left sidebar.

<!-- factory:kobble exploration=X-3 prototype=A -->

Handed off as #15.
