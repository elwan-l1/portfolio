#!/bin/sh
# runs on the Infomaniak Node.js site over SSH, from the site folder, after a release is unpacked.
# stops the site, dumps the database, migrates from inside Infomaniak (it accepts no outside
# connection), switches `current` and checks the site answers. a failure after the stop restores
# the previous release, and the dump too once it exists.
set -eu

release="releases/$1"
site_url=$2
previous=$(readlink current || true)
dump="db-backups/$(date +%Y%m%d-%H%M%S)-$1.sql"

(cd "$release" && npm install --omit=dev --no-audit --no-fund --loglevel=error)

# client options from DATABASE_URL, so the password stays out of the process list.
# the dumps hold the same secrets, so everything written from here is private
umask 077
database=$(node --env-file=.env -e '
  const url = new URL(process.env.DATABASE_URL);
  const options = [
    "[client]",
    `host=${url.hostname}`,
    `port=${url.port || 3306}`,
    `user=${decodeURIComponent(url.username)}`,
    `password=${decodeURIComponent(url.password)}`,
  ];
  require("node:fs").writeFileSync(".my.cnf", options.join("\n") + "\n");
  console.log(decodeURIComponent(url.pathname.slice(1)));
')
db() { mysql --defaults-extra-file=.my.cnf "$database" "$@"; }

restart_previous() {
  echo "deploy failed, back on ${previous:-no release}" >&2
  rm -f "$dump.part"
  [ "$release" = "$previous" ] || rm -rf "$release"
  [ -z "$previous" ] || ln -sfn "$previous" current
}

restore() {
  echo "restoring $dump" >&2
  {
    echo "SET FOREIGN_KEY_CHECKS = 0;"
    db -N -e "SELECT CONCAT('DROP TABLE \`', table_name, '\`;') FROM information_schema.tables WHERE table_schema = DATABASE()"
  } | db
  db < "$dump"
}

trap restart_previous EXIT

# serve.sh stops the server once the link is gone and clears .running when it has exited
rm -f current
tries=0
while [ -e .running ]; do
  tries=$((tries + 1))
  [ "$tries" -le 30 ] || { echo "server still running after 30 s" >&2; exit 1; }
  sleep 1
done

mkdir -p db-backups
mysqldump --defaults-extra-file=.my.cnf --single-transaction --no-tablespaces "$database" > "$dump.part"
mv "$dump.part" "$dump"

trap 'restore; restart_previous' EXIT

(cd "$release" && node --env-file=../../.env node_modules/prisma/build/index.js migrate deploy)
ln -sfn "$release" current

if [ -z "$previous" ]; then
  trap - EXIT
  echo "first release, now set the site start command to: sh current/serve.sh"
  exit 0
fi

tries=0
until node -e 'fetch(process.argv[1]).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))' "$site_url"; do
  tries=$((tries + 1))
  [ "$tries" -le 30 ] || { echo "$site_url did not answer after 60 s" >&2; exit 1; }
  sleep 2
done

trap - EXIT

# keep the three newest releases and the ten newest dumps
ls -1t releases | tail -n +4 | while read -r old; do rm -rf "releases/$old"; done
ls -1t db-backups | tail -n +11 | while read -r old; do rm -f "db-backups/$old"; done
