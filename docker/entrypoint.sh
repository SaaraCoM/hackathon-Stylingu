#!/bin/bash
# Exit when either child fails so the host can restart the whole service.
set -eu

node backend/src/jobs.js &
JOBS_PID=$!

node backend/src/server.js &
SERVER_PID=$!

stop() {
  kill -TERM "$SERVER_PID" "$JOBS_PID" 2>/dev/null || true
}

trap stop TERM INT

set +e
wait -n "$SERVER_PID" "$JOBS_PID"
STATUS=$?
stop
wait "$SERVER_PID" 2>/dev/null || true
wait "$JOBS_PID" 2>/dev/null || true
exit "$STATUS"
