#!/bin/bash
echo "🔨 Testing TypeScript build..."
cd "$(dirname "$0")"
npm run build
echo "Build exit code: $?"