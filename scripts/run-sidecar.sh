#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."/python-sidecar
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
export SIDECAR_BIND_HOST=${SIDECAR_BIND_HOST:-127.0.0.1}
export SIDECAR_BIND_PORT=${SIDECAR_BIND_PORT:-8088}
python app.py

