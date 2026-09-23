# Sources

Which reference sources a session can reach, what each is good for, and how
to use them without getting the session's shared IP blocked. Written during
the first source-verification pass (A155 onward in `ASSUMPTIONS.md`).

Before September 2026 every record was written from standard histories and
web-search summaries (A145). The sources below are now reachable from the
session container, so a claim can be checked against the page rather than a
summary of it.

## What is reachable

| Source | Good for | Not good for |
|---|---|---|
| `en.wikipedia.org` (also `de`, `fr`, `pt`, `ja`) | Narrative, deaths, disputes, lawsuits, the article's own citations | Exact dates it does not cite. Treat an uncited sentence as a lead, not a source |
| `www.wikidata.org`, `query.wikidata.org` | Birth and death dates, founding and dissolution years, cross-IDs (MusicBrainz, Discogs) in bulk | Anything interpretive. Its "work period" dates follow no single convention |
| `musicbrainz.org` | First release dates of releases and recordings, credits | Machines and scenes |
| `api.discogs.com` | Label, catalogue number, pressing year, credits as printed on the sleeve | Narrative. Release dates are often year-only |
| `archive.org` | Full-text and metadata search over scanned manuals, catalogues and magazines, with item dates (`advancedsearch.php`, `services/search/v1/scrape`, `metadata/<id>`) | Reading the files themselves: see below |
| `www.worldradiohistory.com` | Scanned trade press: Billboard, Cash Box, Music Week, Record Mirror. Good for release dates, label moves and price lists as printed at the time | Browsing: see below |

`www.discogs.com` (the website, not the API) returns 403 from the container.
Use `api.discogs.com`. A release's `extraartists` and `notes` carry the
credits and label copy as transcribed from the sleeve, which is often the
primary evidence a `production` edge needs.

**archive.org serves search, not files.** Downloads redirect to storage
hosts such as `dn760109.eu.archive.org`, and the proxy refuses those. The
Wayback Machine (`web.archive.org`) is refused too. So archive.org can tell
you a dated manual exists, and its title and date can be cited, but its
text cannot be read from the container. Adding `web.archive.org` and
`*.archive.org` to the environment's allowed domains would fix both.

**World Radio History serves PDFs, not pages.** Its HTML index pages sit
behind a Cloudflare challenge, but a PDF at a known path downloads
directly, for example
`/Archive-All-Music/Billboard/80s/1981/BB-1981-01-17.pdf`. You need to
know the issue date, which makes it a tool for confirming a date you
already suspect rather than for finding one.

`api.secondhandsongs.com` is reachable but not used yet: it needs an API key
we do not have. It is the right source for `cover` edges and for who
recorded a song first, once the key arrives.

## Rate limits, learned the hard way

The container shares an egress IP, so limits are hit sooner than the
published numbers suggest.

- **Wikimedia (all Wikipedias and Wikidata)** throttles with HTTP 429 and a
  `Retry-After` header. Individual search requests got blocked within a
  minute. Batch instead: `prop=pageprops` takes 50 titles per request, and
  one SPARQL query can cover every node at once.
- **Wikidata Query Service** was limited to one request a minute during the
  first pass (an outage rule). Write one query that asks for everything.
- **MusicBrainz**: one request a second, with a descriptive User-Agent.
- **Discogs API**: 25 requests a minute unauthenticated.

Always send a User-Agent naming the project and the repo URL. Wikimedia's
policy asks for one, and it is the polite thing to do everywhere.

Node's built-in `fetch` ignores `HTTPS_PROXY`. Run Node scripts with
`NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`, or use
`curl`, which reads the proxy settings on its own.

## How the sources rank against each other

A primary source beats a secondary one. For this project that usually means:

1. The record itself as released: sleeve credits and label copy (Discogs
   images and transcriptions), or a court opinion.
2. Contemporary trade press (World Radio History scans).
3. A named interview, or a magazine profile (Wayback copies).
4. Wikipedia text with a citation you can see.
5. Wikidata and MusicBrainz structured fields.
6. Wikipedia text without a citation.

Structured databases are fast for finding disagreements and weak for
settling them. A diff against Wikidata is a list of places to look, not a
list of corrections. Most of the disagreements in the first pass were
conventions, not errors. Our `activeFrom` is usually the first record or the
first work that matters to the map. Wikidata's "work period start" is
usually the start of a career.

## Fields and conventions this touches

- A source that settles a date lets a null become a number (Q20). A source
  that does not settle it leaves the null in place, and the record's adult
  text says the date is unsourced.
- `confidence` tiers move only when the evidence changes what we can show.
  A better citation for a `consensus` claim does not make it `documented`
  unless the new source is itself the documentation (the credit, the
  interview, the ruling).
- Every change made from a source is logged in `ASSUMPTIONS.md` with the
  source named in prose, the same way `evidence` fields name theirs.
