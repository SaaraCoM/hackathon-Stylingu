#!/bin/sh
# Arranca el ejecutor de trabajos y el servidor HTTP en el mismo contenedor.
# Cloudflare mantiene una sola instancia (max_instances: 1), así que no hay
# dos ejecutores compitiendo por la misma cola.
set -eu

node backend/src/jobs.js &
JOBS_PID=$!

node backend/src/server.js &
SERVER_PID=$!

stop() {
  kill -TERM "$SERVER_PID" "$JOBS_PID" 2>/dev/null || true
}

trap stop TERM INT

# Si el servidor muere, el contenedor debe reiniciarse; no dejamos vivo solo
# al ejecutor de trabajos.
set +e
wait "$SERVER_PID"
STATUS=$?
set -e

kill -TERM "$JOBS_PID" 2>/dev/null || true
wait "$JOBS_PID" 2>/dev/null || true
exit "$STATUS"
