// Outbound links: the only URLs the app ever builds (docs/m3-architecture.md
// section 7). YouTube search only (Q14), because it is free and needs no
// account. The app itself still makes no network request: these are plain
// links that open in a new tab when the reader chooses to follow them.
//
// Labelled "Search YouTube" rather than "Listen", because a search does not
// promise the right recording, and the map should not claim more than it
// knows.

import { CONFIG } from '../config.js';
import { COPY } from './copy.js';
import { h } from './dom.js';
import { pick } from './registers.js';

// What to search for, for one side of an edge's trackPair (Q17, A78):
// absent -> "artist title", a string -> that query, false -> no link.
export function trackPairQuery(side) {
  if (!side || side.search === false) return null;
  if (typeof side.search === 'string') return side.search;
  return [side.artist, side.title].filter(Boolean).join(' ') || null;
}

export function youtubeLink(query, register) {
  if (!query) return null;
  const label = pick(COPY.links.youtube, register);
  return h(
    'a',
    {
      class: 'search-link',
      href: `${CONFIG.links.youtubeSearchUrl}${encodeURIComponent(query)}`,
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': `${label}: ${query} (${pick(COPY.links.newTab, register)})`,
    },
    `${label} ↗`,
  );
}
