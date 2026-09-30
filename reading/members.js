// A scene's members, shared by the map (main.js) and the card view
// (cards/app.js).
//
// A scene's members are the artists that name it, plus whoever the scene
// lists itself. Both directions, because the two are not kept in sync
// (BACKLOG, "Observed problems") and a reader should not lose a member
// to that gap.

export function createSceneMembers(nodes, nodesById) {
  return function sceneMembers(sceneId) {
    const ids = new Set(nodesById.get(sceneId)?.raw.memberIds ?? []);
    for (const node of nodes) {
      if (node.kind === 'artist' && node.raw.scenes?.includes(sceneId)) ids.add(node.id);
    }
    return [...ids]
      .map((id) => nodesById.get(id))
      .filter(Boolean)
      .sort((a, b) => (a.startYear ?? 0) - (b.startYear ?? 0));
  };
}
