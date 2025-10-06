#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")"/.. && pwd)"
PID_FILE="${ROOT_DIR}/.sidecar-dev.pid"
HOST=${SIDECAR_BIND_HOST:-127.0.0.1}
PORT=${SIDECAR_BIND_PORT:-8088}

kill_if_pid() {
  local pid="$1"
  if [ -z "$pid" ]; then return 1; fi
  if ps -p "$pid" >/dev/null 2>&1; then
    echo "Stopping sidecar PID $pid"
    kill "$pid" || true
    for i in $(seq 1 20); do
      sleep 0.1
      ps -p "$pid" >/dev/null 2>&1 || { echo "Stopped."; return 0; }
    done
    echo "Force killing $pid"
    kill -9 "$pid" || true
    return 0
  fi
  return 1
}

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE" || true)
  if kill_if_pid "$PID"; then
    rm -f "$PID_FILE"
    exit 0
  fi
fi

# Fallback: find by port
PID_BY_PORT=$(lsof -ti tcp:"$PORT" 2>/dev/null || true)
if [ -n "$PID_BY_PORT" ]; then
  kill_if_pid "$PID_BY_PORT" || true
fi

exit 0

