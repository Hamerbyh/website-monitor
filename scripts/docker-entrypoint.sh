#!/bin/sh
set -eu

if [ "${WAIT_FOR_DB:-true}" = "true" ]; then
  node ./scripts/wait-for-db.mjs
fi

if [ "${RUN_DB_PUSH:-false}" = "true" ]; then
  npm run db:push
fi

exec npm run start -- --hostname "${HOSTNAME:-0.0.0.0}" --port "${PORT:-3000}"
