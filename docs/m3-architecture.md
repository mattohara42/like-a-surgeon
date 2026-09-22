# M3 architecture: the reading surface

Plan for review before any M3 code, following the M1 and M2 pattern. M3 is
the milestone where Lineage stops being a picture of a map and becomes
something a person can read. The gate is the hardest one so far: Matt's
13-year-old uses it without instruction and gets somewhere.

Scope, from `BUILD_PLAN.md` and `SPEC.md`: detail panels for nodes and edges,
a reading-level selector, the confidence legend, search, outbound
streaming-search links, and a typography pass. The version stamp from Q4
(A20) lands here too, next to the legend.

Decided in chat before this document was written (Q13 to Q15):

- The panel is an **overlay drawer** on the right, as in the Strata
  prototype. The graph does not reflow.
- Outbound links go to **YouTube search only**.
- The **Kid register stays hidden** until every reader-facing record carries
  it.

Out of scope: overlays, threads, and the timeline player (M5). Audio and demo
playback belong to M4, so an edge panel with a `demoId` says a demo exists
and does nothing else yet. Focus dimming and spread-on-click stay deferred
from the Strata port, although section 4 builds the neighbour index they
both need.

## 1. File layout

The panel, selector, legend and search are not graph rendering, so they get
their own directory instead of growing `render/`.

```
reading/
  registers.js   which registers exist, the reader's choice, localStorage
  panel.js       the drawer: open/close, focus handling, history
  nodePanel.js   node content (artist, machine, scene, label)
  edgePanel.js   edge content
  legend.js      confidence legend and version stamp
  search.js      index build, query, results list
  links.js       YouTube search URL construction, the only outbound URLs
  copy.js        interface text in registers (tier explanations, headings)
  neighbours.js  node id -> inbound/outbound edges, built once at load
```

`main.js` stays the only place that wires the graph and the reading surface
together. The graph never imports from `reading/`, and `reading/` talks to
the graph only through the small API in section 3.

## 2. Registers

`registers.js` walks every register object the reader can see (blurbs,
explanations, captions, thread intros and outros, plus `copy.js`) once at
load. A register key is **available** only if every one of those objects
carries it as a non-empty string. Today that yields `age13` and `adult`. When
the Track D Kid pass is complete, `age7` appears in the selector with no code
change, which satisfies A11 and Q15.

Display order and labels come from `CONFIG.reading.registers`
(`age7: Kid`, `age13: Teen`, `adult: Adult`). The default is `age13`, since
the primary reader is 13. The choice persists in localStorage under a key in
`CONFIG`, guarded the same way `render/layers.js` guards layer state. A saved
register that is no longer available falls back to the default.

The selector is global and always visible, beside the layer toggles, never
inside a settings menu (SPEC.md). Changing it re-renders the open panel and
the legend in place. It never rebuilds the graph.

Interface copy follows the same writing rules as the data. Tier explanations,
section headings like "What to listen for" and "How we know", and the legend
text all live in `copy.js` as register objects, so Teen and Adult readers get
the same facts in different words.

## 3. What the graph has to expose

`createGraph()` currently accepts `onSelectNode`/`onSelectEdge` callbacks and
flies the camera on click. M3 needs three additions, all small:

- `graph.focusNode(id)` and `graph.focusEdge(id)`. These run the same path a
  click does (`selectAndFlyTo`), so search results and panel links move the
  camera exactly the way a click would.
- A **camera inset**. `flyTo` centres on the full container width, and the
  drawer covers the right of it. `createGraph` takes
  `rightInset: () => number` and centres within the uncovered part. It is a
  function because the drawer can be open or closed.
- `graph.selectedId()`, so a rebuild (layer toggle) can restore the selection
  highlight. Panel state lives in `main.js`, outside the graph, so it
  already survives a rebuild.

**Selecting something the current layers hide.** A panel link or search
result can point at a label or machine while that layer is off. Recommended:
turn the layer on, then focus it. The reader asked to go there, and a panel
that describes a node the map refuses to show is worse than a map that gets
one layer busier. The toggle chip updates, so the change is visible and one
click undoes it.

**Scenes** render as atmosphere with `pointer-events: none`, and making the
nebula clickable would fight with panning. Scene panels are reached from an
artist panel's scene chip and from search. When a scene is selected, the
camera frames its members' extent rather than a single point.

## 4. Panels

One drawer, width from `CONFIG.panel.width` (about 420px at 1280x800),
sliding in from the right above the transport bar. Escape and the close
button dismiss it. It moves focus in on open and returns focus to where it
came from on close. The drawer keeps a short back stack, so a reader who
follows three edges sideways can step back without hunting for where they
were. The back stack is in memory only and has no URL scheme; the share-a-view
URL is in the backlog.

**Node panel.** Kind and lineage kicker, name, dates and place, hook, blurb
in the current register. After that:

- Artist: signature tracks, each with `whyThisOne` and a YouTube search link,
  plus scene and label chips.
- Machine: what it was for, what actually happened, what it cost.
- Scene: blurb, then the five adult backing fields, shown only when the Adult
  register is on (SCHEMA.md says those fields are adult-only).
- Label: founders and the ownership story.

Every kind ends with its connections, split into "changed" (outbound) and
"changed by" (inbound). Each row carries the other end's name, the edge type
and a tier mark, and opens that edge's panel.

**Edge panel.** From and to, year, edge type, a crossing marker when
`crossLineage` is true, and the explanation in the current register. Then
"What to listen for": both records with YouTube links, then
`whatToListenFor`, set as the most prominent text in the panel because it is
the highest-value field in the dataset. Then "How we know": the tier, its
plain explanation from `copy.js`, and `evidence`. Then both ends as links. A
`demoId` shows a quiet "Playable demo arrives with the audio engine" line
until M4.

`neighbours.js` builds the inbound and outbound index once at load, in
O(edges), from whatever the loader returns. Nothing in it knows the roster
size, and the same index is what focus dimming and spread-on-click need
later.

All record text reaches the DOM through `textContent` or an escaping helper,
never raw `innerHTML`, since Matt and future contributors will hand-edit the
data.

## 5. Legend and version stamp

A permanent, collapsible legend in a corner that the transport bar and the
drawer never cover. It shows the three tiers exactly as the renderer draws
them (it reads the same `CONFIG` stroke values rather than restating them)
with one register-aware sentence each. Collapsed, it stays a visible
three-swatch key, so it is never truly hidden.

The version stamp sits under the legend: dataset version and last-updated
date (A20). Per Q16, the date is the manifest's `generatedAt` and the
version is `package.json`'s `version`, which the manifest carries.

## 6. Search

The index is built once at load from what the loader returned: node names,
`sortName`, cities and countries, label names, and scene names. Matching is
lowercased and accent-folded, prefix on any word first, substring after
that. It is a linear scan with no library. A linear scan over a few thousand
short strings is well under a frame at the thousand-artist scale, so an index
structure would be premature.

A four-digit query between the axis bounds becomes a year result: selecting
it moves the transport cursor to that year and frames that slice of the
axis. Places return the nodes from that place, grouped by the part of
the place that matched (A89). Arrow keys move
through results, Enter selects, Escape clears. `/` focuses the box, which is
a courtesy for keyboards, and it is never the only way in, since touch comes
later.

## 7. Outbound links

`links.js` builds `https://www.youtube.com/results?search_query=...` from an
artist and title and nothing else. Links open in a new tab with
`rel="noopener noreferrer"`. They are labelled "Search YouTube" rather than
"Listen", because a search does not promise the right recording. The app
still makes no network request of its own.

**Q17, resolved.** 50 of the 122 track-pair sides turned out not to be records (A92; the plan's first estimate was 17) ("TB-303
as intended", "Black Ark productions", "Warehouse-era DJ sets", "the
scratch"). Several real ones carry editorial notes in the title ("The Bridge,
produced for MC Shan"). No heuristic can tell these apart, and a search link
on "Warehouse-era DJ sets" sends a kid somewhere useless. Each side of
`trackPair` therefore takes an optional `search` field. When it is absent,
the query is artist plus title. A string replaces the query, and `false`
means no link is drawn.

## 7a. Arrange by (added mid-M3, Q19)

Scenes were hard to find and hard to click, and labels were lost among the
artists. The reader can now re-lane the map by lineage (the default), by
scene, or by label, using an "Arrange by" control that is separate from the
layer toggles. Showing labels and grouping by labels are different questions.

The time axis stays left to right and the layout stays lanes. Only the lane
key changes. `render/arrange.js` builds a lane plan (the ordered lanes, plus
which lane a node belongs to) from whatever records are loaded, and
`computeLayout` packs rows inside whatever lanes it is given. Nodes keep their
lineage colour in every arrangement, so a mixed scene reads as mixed. Edges
follow the nodes and need no change.

- **Scene view.** One lane per scene, ordered by start year. An artist goes in
  the lane of its earliest authored scene. Label markers, when that layer is
  on, get their own "Labels" lane.
- **Label view.** One lane per label, ordered by founding year, with the label
  marker at the head of its roster when that layer is on. An artist goes in
  the lane of its earliest label. Choosing a label here frames its lane
  instead of switching the Labels layer on.
- **Ungrouped.** Artists with no authored scene or label share one lane at
  the bottom ("Not in a scene yet", "No label on the map yet"). Nobody
  disappears, and the gap in the data stays visible.
- **Clickable lane titles.** A scene or label lane is titled with its name,
  drawn near the lane's earliest member rather than at the axis origin, so it
  stays close to the content. The title is a button that opens that scene's
  or label's panel. This is what makes scenes clickable.

Built before step 8 so the label-collision work happens once, on the final
layout.

## 8. Typography pass

Everything here uses system font stacks. We do not ship font files, which
avoids both a licensing question and a network request. The pass covers:

- A serif stack for names, hooks and `whatToListenFor`, and the existing UI
  stack for everything else.
- A 16px body-size floor in the panel and a measure of about 60 to 70
  characters.
- Contrast checked against the dark ground.
- The label-collision fix deferred from the Strata port, alternating label
  side and offset in the crowded years.

All sizes go in `CONFIG.type`.

## 9. Order of work

Each step is one PR and one concern, and each is usable on its own:

1. `neighbours.js`, `registers.js`, the graph API additions, and the drawer
   with node and edge panels. This is the step that makes clicking do
   something.
2. Legend and version stamp.
3. Search.
4. YouTube links, with the `search` field backfilled on the non-record
   sides.
5. Typography pass.

Verification per step is the same headless Chromium check M2 used: load
under `tools/serve.js` and under the bundle from `file://`, open a panel of
every kind, and confirm no console errors. The real gate is a person, so
after step 5 I will write a one-page note on what to watch for when the
13-year-old tries it. It will list the questions to hold back from asking him.

## 10. Questions raised by this plan (both resolved)

- **Q16. Where do the dataset version and last-updated date come from?**
  Recommended: `tools/manifest.js` already regenerates the manifest on every
  serve, validate and bundle. It could add a `generatedAt` date, and a
  hand-bumped `version` read from `package.json`. The alternative is
  deriving the date from git at bundle time, which is more truthful but
  makes the dev server shell out to git.
- **Q17. How should a track-pair side say what to search for?**
  Recommended: an optional `search` string on each side of `trackPair`.
  When it is absent, the query is artist plus title. When it is
  `false`, no link is drawn. That is one optional field, backwards
  compatible, and `tools/validate.js` checks its type. The 17 non-record
  sides get `false` in the same PR as the links, and the titles with
  editorial notes get an explicit query.
