#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

pushd "$ROOT_DIR" >/dev/null
perl -0pi -e "s|from '@felix/felix-server'|from '../nlp/index.js'|g" src/nlp/index.ts
popd >/dev/null
