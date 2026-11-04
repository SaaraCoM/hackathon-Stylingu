#!/bin/bash
set -eu
bin=$(mktemp -d)
trap 'rm -f "$bin/node"; rmdir "$bin"' EXIT
cat > "$bin/node" <<'STUB'
#!/bin/bash
if [ "${1##*/}" = "$FAIL_PROCESS" ]; then sleep .1; exit 7; fi
trap 'exit 0' TERM INT
while true; do sleep .1; done
STUB
chmod +x "$bin/node"
for process in jobs.js server.js; do
  set +e
  FAIL_PROCESS="$process" PATH="$bin:$PATH" bash docker/entrypoint.sh
  status=$?
  set -e
  test "$status" -eq 7
done
echo 'PASS: either child failure stops the container and preserves its exit code.'
