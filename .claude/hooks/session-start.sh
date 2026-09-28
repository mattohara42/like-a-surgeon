#!/bin/bash
# SessionStart hook for Lineage.
#
# This project has no dependencies to install: vanilla JS, no build step, and
# tooling that uses the Node stdlib only. So this hook does the other job a
# session start needs, which is telling the session the truth about where it
# is starting from.
#
# The failure mode it exists to prevent: a session's container is cloned once,
# at start. If `main` has moved since, or another session is working in
# parallel, nothing says so, and the session can spend its whole run building
# against a repo state that stopped existing hours ago. That has already
# happened here more than once.
#
# Everything network-touching is best-effort. A session that starts offline
# should start anyway, with a note, rather than fail.

set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

DEFAULT_BRANCH="main"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"

echo "=== Lineage session start ==="
echo "branch: ${CURRENT_BRANCH}"

if ! git fetch --quiet origin "${DEFAULT_BRANCH}" 2>/dev/null; then
  echo "WARNING: could not reach origin. Everything below is from the local"
  echo "clone and may be stale. Re-run 'git fetch origin main' before trusting"
  echo "anything about what is already built."
  exit 0
fi

BEHIND="$(git rev-list --count "HEAD..origin/${DEFAULT_BRANCH}" 2>/dev/null || echo 0)"
AHEAD="$(git rev-list --count "origin/${DEFAULT_BRANCH}..HEAD" 2>/dev/null || echo 0)"

echo "vs origin/${DEFAULT_BRANCH}: ${BEHIND} behind, ${AHEAD} ahead"

if [ "${BEHIND}" -gt 0 ]; then
  echo ""
  echo "!! THIS CHECKOUT IS ${BEHIND} COMMIT(S) BEHIND origin/${DEFAULT_BRANCH}."
  echo "   Read what landed before planning anything. Work designed against"
  echo "   the older tree may already exist, or may now conflict."
  echo ""
  git --no-pager log --oneline --no-decorate "HEAD..origin/${DEFAULT_BRANCH}" | head -20
  echo ""
  echo "   Files changed on ${DEFAULT_BRANCH} since this checkout:"
  git --no-pager diff --stat "HEAD...origin/${DEFAULT_BRANCH}" 2>/dev/null | tail -1
  echo ""
  echo "   Merge it in before starting: git merge origin/${DEFAULT_BRANCH}"
fi

# Other branches pushed recently. A branch ahead of main is very likely
# another session's work in flight, which is worth knowing before starting
# something that collides with it.
echo ""
echo "Other branches ahead of ${DEFAULT_BRANCH} (likely work in flight):"
FOUND_OTHER=0
while read -r sha ref; do
  [ -z "${ref}" ] && continue
  short="${ref#refs/heads/}"
  [ "${short}" = "${DEFAULT_BRANCH}" ] && continue
  [ "${short}" = "${CURRENT_BRANCH}" ] && continue
  if git merge-base --is-ancestor "${sha}" "origin/${DEFAULT_BRANCH}" 2>/dev/null; then
    continue   # already merged, not in flight
  fi
  echo "  - ${short}"
  FOUND_OTHER=1
done < <(git ls-remote --heads origin 2>/dev/null)
[ "${FOUND_OTHER}" -eq 0 ] && echo "  (none)"

# The data tree is the project's actual product, so a session should know
# whether it is currently valid before touching it. Errors matter; the
# warnings are expected while the roster is in progress (ASSUMPTIONS A26).
echo ""
if command -v node >/dev/null 2>&1; then
  VALIDATE_OUT="$(node tools/validate.js 2>&1 | tail -1)"
  echo "data: ${VALIDATE_OUT}"
else
  echo "data: node not found, skipped tools/validate.js"
fi

echo "============================="
