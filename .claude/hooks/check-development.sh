#!/usr/bin/env bash
# Session-start check for the HUB team (run automatically by Claude Code).
# Reports whether origin/development has commits that the current branch does not have yet.
# It only reads: it never merges, changes files or pushes. It always exits 0.

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

# Remove characters that would break the JSON output.
clean() { tr -d '"\\' | tr '\r\n\t' '   '; }

# Print JSON: a short message for the person, and instructions for Claude.
emit() {
  printf '{"systemMessage":"%s","hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' \
    "$(printf '%s' "$1" | clean)" "$(printf '%s' "$2" | clean)"
}

branch="$(git branch --show-current 2>/dev/null)"
[ -z "$branch" ] && branch="(detached HEAD)"

# Fetch quietly; do not hang if there is no network or no login.
if ! GIT_TERMINAL_PROMPT=0 timeout 20 git fetch --quiet origin development >/dev/null 2>&1; then
  emit "HUB check: could not reach GitHub, so development was not checked." \
       "SessionStart HUB check: git fetch of origin/development failed (offline or not logged in). Tell the user the check could not run and suggest running: git fetch origin. Then follow the Start of every session steps in AGENTS.md."
  exit 0
fi

behind="$(git rev-list --count HEAD..origin/development 2>/dev/null || echo 0)"
dirty=""
[ -n "$(git status --porcelain --untracked-files=no 2>/dev/null)" ] && dirty=" The working tree has uncommitted changes, so ask the user to commit or stash before merging."

if [ "${behind:-0}" -gt 0 ]; then
  list="$(git log --format='%an: %s' HEAD..origin/development --no-merges -n 8 2>/dev/null | sed 's/^/- /')"
  emit "HUB check: development has ${behind} new commit(s) that ${branch} does not have yet." \
       "SessionStart HUB check: current branch is ${branch}. origin/development has ${behind} commit(s) not in this branch. Recent ones: ${list} Before any other work, tell the user briefly what arrived, then follow the Start of every session steps in AGENTS.md (merge development into their _Merge branch, handle conflicts by the rules, check the build).${dirty}"
else
  emit "HUB check: ${branch} is up to date with development." \
       "SessionStart HUB check: current branch ${branch} already contains everything in origin/development. No merge is needed."
fi
exit 0
