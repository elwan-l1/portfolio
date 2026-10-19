#!/bin/sh
# start command of the Infomaniak Node.js site (`sh current/serve.sh`), run from the site folder.
# serves the release `current` points to, restarts it when a deploy moves the link or the server
# exits, and stays stopped while the link is missing. .running exists while a server runs.

rm -f .running
trap 'kill "$pid" 2>/dev/null; rm -f .running; exit 0' INT TERM

while :; do
  release=$(readlink current) || { sleep 2; continue; }
  echo "$release" > .running
  node --env-file=.env "$release/.output/server/index.mjs" &
  pid=$!
  while kill -0 "$pid" 2>/dev/null && [ "$(readlink current)" = "$release" ]; do sleep 2; done
  kill "$pid" 2>/dev/null
  wait "$pid"
  rm -f .running
done
