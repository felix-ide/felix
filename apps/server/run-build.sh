#!/bin/bash
cd "$(dirname "$0")"
echo "🔨 Building TypeScript..."
npx tsc
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🎯 Now you can test the CLI:"
    echo "  npx felix create-index ./src --verbose"
    echo "  npx felix search 'MarkdownParser'"
    echo "  npx felix stats"
else
    echo "❌ Build failed"
    exit 1
fi