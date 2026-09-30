# Cards: the phone version

> **Status: draft for sign-off.** Matt chose the four options in section 2
> in chat on 2026-09-30. Q39 and Q40 (section 7) are still open. No code
> is written until this is signed off, as with M1 to M5.

The map needs a mouse and a wide screen. It has no pinch zoom, and on a
phone the drawer covers most of the view. Cards is a pared-down way into
the same data for a phone: one record per screen, and you move by tapping
from card to card or by asking for a random one.

This is outside the milestone order. Matt asked for it with the M5 gate
still open, so it is logged as a requested exception (A309) and gets its
own small gate (section 6). It replaces nothing: the map stays as it is,
and a phone reader can still open it.

## 1. What already exists

Most of what a card shows is already written.

- **Panel content is separate from the drawer.** `reading/nodePanel.js`
  and `reading/edgePanel.js` return plain DOM from a record plus a `ctx`
  object. Navigation happens through `ctx.goNode(id)` and `ctx.goEdge(id)`.
  A card is those same renderers inside a different shell.
- **Records load one at a time.** Startup loads the skeleton index, and
  each record's text loads when it opens (A235). A phone only ever loads
  what the reader visits.
- **The neighbour index exists.** `reading/neighbours.js` gives every
  record its edges in and out, sorted by year, which is the connection
  list and the connection count.
- **Registers are read from the data.** `reading/registers.js` handles
  Teen and Adult, and remembers the choice.

## 2. Decisions taken (2026-09-30)

1. **Tapping a connection opens the connection card first.** It shows the
   story, the two records and what to listen for, with a large button
   through to the record on the other side. The edges are the point of
   the project, so they get a screen of their own, at the cost of one
   extra tap.
2. **The first card is a random well-connected record.** It is picked
   from records with at least `CONFIG.cards.openingMinConnections`
   connections (8 gives 15 records today: Bowie, Kraftwerk, King Tubby,
   Marley Marl and others). The pool is worked out at load, so it grows
   with the roster and nobody maintains a list.
3. **Random picks evenly from every record with at least one
   connection** (256 today), so a jump never lands on a card with nowhere
   to go.
4. **A card has text and tracks, and no audio yet.** Name, years, place,
   the hook, the Teen or Adult text, signature tracks with YouTube links,
   and the connections. The demos come in once the Safari check (Q27) is
   done, because a phone usually means Safari.

## 3. What a reader sees

**A record card** (artist, machine, scene or label), top to bottom:

- A lineage colour band, the name, and "Artist · Detroit · 1981–now".
- The connection count, large: "15 connections". It tells the reader
  there is somewhere to go before they have read a word.
- The hook, then the body text in the current register.
- Signature tracks, each with its YouTube search link.
- The connections, one full-width row each: the other record's name, the
  kind of link, the year, and the confidence swatch. Oldest first, as in
  the drawer.

**A connection card:** "Kraftwerk → Afrika Bambaataa", its type, year and
confidence, then `whatToListenFor` as the main paragraph, the two
records with their YouTube links, and the evidence. At the bottom are two
large buttons, one for each end. The one you did not come from is drawn
as the main action.

**A bar fixed to the bottom of the screen,** within thumb reach:
**Back**, **Random** and a **Teen / Adult** switch. Nothing is hidden
behind hover or a long press. Touch targets are at least
`CONFIG.cards.minTargetPx` (44 px). A small "Open the full map" link
sits at the end of every card.

## 4. How it is built

- **One entry, one bundle.** `main.js` checks the view at startup (Q39)
  and either builds the map as now or calls `startCards()` from a new
  `cards/` folder. `tools/bundle.js` follows imports from `main.js`, so
  `npm run build` and the Netlify deploy need no change.
- **`cards/` never imports from `render/graph.js`** and the map never
  imports from `cards/`, the same separation A73 keeps between the graph
  and `reading/`. `cards/` uses the loader, the neighbour index and the
  `reading/` renderers.
  - `cards/app.js`: the shell, the bottom bar, and drawing a card into
    the page.
  - `cards/pick.js`: the opening pool and the random pool. These are pure
    functions of the edges and the CONFIG threshold, so they can be
    unit tested.
  - `cards/route.js`: reads and writes the address (Q40).
- **Audio and map-only buttons are switched off through `ctx`.** The
  cards `ctx` returns no demo and an empty producer list, so the demo
  block and "Follow the producer" do not draw. If a renderer turns out to
  need a guard for that, it is a one-line `if`, noted in ASSUMPTIONS.
- **All tuning in `CONFIG.cards`:** the opening threshold, the width
  breakpoint, the minimum touch target, and the card text sizes.
- **The page scrolls normally.** Each card is a page of text, and there is
  no swiping between cards, since a swipe would compete with scrolling
  and with the browser's own back gesture.

## 5. Order of work

1. `CONFIG.cards`, `cards/pick.js` and `cards/route.js`, with
   `node --test` tests for both pools and for reading an address.
2. The shell: the view switch in `main.js`, the bottom bar, and the first
   card.
3. Record and connection cards through the existing renderers, with audio
   off.
4. Phone styling and touch targets. A headless Chromium check at 390 by
   844 opens a card, taps through to a connection and on to the far
   record, uses Random and Back, and confirms there is no sideways
   scroll and no console error.
5. README, ASSUMPTIONS and BACKLOG updates.

Each step is its own commit. The whole thing is one PR.

## 6. Gate

The kids use it on their own phones without being shown how, and each of
them gets at least five cards in and can say what one connection was
about. A check on a real iPhone in Safari is part of the gate, since
headless Chromium cannot stand in for it.

## 7. Open questions

- **Q39. When does Cards switch on?** Options: (a) **Recommended.** At
  load, when the screen is narrower than `CONFIG.cards.maxWidthPx`
  (700 px, so every phone and no laptop). An address can override it
  either way (`?view=map`, `?view=cards`), and each view links to the
  other. It does not switch on rotation, so turning a phone mid-read
  does not throw the reader out. (b) Switch on any touch screen,
  tablets included. An iPad could run the map at that width if it had
  pinch zoom, which it does not yet. (c) Never automatic, only through a
  link.
- **Q40. Should each card have its own address?** Options: (a)
  **Recommended.** Yes, as `#/artist/kraftwerk` or
  `#/edge/e-kraftwerk-planetrock`. The phone's own back gesture then goes
  back a card, a reader can send a friend the exact card they are on,
  and a reload stays put. It is also the first piece of the
  "share-a-view URL" idea in BACKLOG. (b) No. The in-page Back button
  only, and a reload starts on a new random card.
