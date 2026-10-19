#!/bin/sh
# prints the CHANGELOG.md section of one version, fails when it has none
set -eu

notes=$(awk -v heading="## [$1]" '
  /^## / { if (found) exit; found = index($0, heading) == 1; next }
  found
' CHANGELOG.md)

[ -n "$notes" ] || { echo "CHANGELOG.md has no section for $1" >&2; exit 1; }
printf '%s\n' "$notes"
