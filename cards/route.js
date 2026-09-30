// Which view a page load gets (Q39), and the address of each card (Q40).
//
// A card's address is a hash, `#/artist/kraftwerk` or
// `#/edge/e-kraftwerk-planetrock`, so it works from file:// as well as the
// hosted site, the phone's back gesture steps back a card, and a reader can
// send someone the card they are on.

// 'cards' or 'map'. `?view=cards` or `?view=map` wins; otherwise the width.
export function chooseView(search, widthPx, maxWidthPx) {
  const asked = new URLSearchParams(search).get('view');
  if (asked === 'cards' || asked === 'map') return asked;
  return widthPx < maxWidthPx ? 'cards' : 'map';
}

const NODE_KINDS = new Set(['artist', 'machine', 'scene', 'label']);

// '#/artist/kraftwerk' -> { kind: 'node', id: 'kraftwerk' }, or null for
// anything else. Whether the id exists is the caller's question.
export function parseRoute(hash) {
  const match = /^#\/([a-z]+)\/(.+)$/.exec(hash ?? '');
  if (!match) return null;
  let id;
  try {
    id = decodeURIComponent(match[2]);
  } catch {
    return null;
  }
  if (match[1] === 'edge') return { kind: 'edge', id };
  if (NODE_KINDS.has(match[1])) return { kind: 'node', id };
  return null;
}

// The address for a target. A node's address names its kind, so the link
// reads as what it is.
export function routeFor(target, nodesById) {
  const word = target.kind === 'edge' ? 'edge' : nodesById.get(target.id)?.kind ?? 'artist';
  return `#/${word}/${encodeURIComponent(target.id)}`;
}
