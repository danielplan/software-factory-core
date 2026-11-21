# A clearer System map

**The problem:** The System page shows the product's parts in columns with one arrow between columns, so the team can't see which part actually needs which. It should show clearly how each part connects to the others, well structured.

**The question:** —

**Agreed:** A3 · Real map with lines. Remove the key under the map. Instead, each type tag shows a tooltip when you point at it (or focus it with the keyboard / tap it on a phone) that says what this part's type means: Screen: "what people open, a web page or app"; Backend: "works behind the screens"; Data: "where data is stored"; Outside service: "run by someone else, like payments". Only the current tag's explanation is shown. Also move the tag: it sits awkwardly on the top edge of the box now. Put it inside the box, in the header row next to the part's name (aligned on the same line, small and tidy), so it reads as part of the card.

**The prototype:** on the branch `proto/X-2-a3`.

**What we learned:**
- Each part shows a type tag just above its name: Screen, Backend, Data or Outside service. Pointing at the tag explains it. Parts don't say their type yet, so the build has to add it.

<!-- factory:kobble exploration=X-2 prototype=A3 -->

Handed off as #12.
