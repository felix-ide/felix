#!/bin/bash

# Update all imports to use the code-intelligence package

echo "Updating imports to use @felix/code-intelligence..."

# Update TypeScript files
find src -name "*.ts" -type f -exec sed -i '' \
  -e "s|from '@felix/code-analysis-types'|from '@felix/code-intelligence'|g" \
  -e "s|from '@felix/code-parser'|from '@felix/code-intelligence'|g" \
  -e "s|from '@felix/felix-server'|from '@felix/code-intelligence/semantic-intelligence'|g" \
  -e "s|from '@felix/knowledge-graph'|from '@felix/code-intelligence'|g" \
  -e "s|from '@felix/architectural-intelligence'|from '@felix/code-intelligence'|g" \
  {} \;

# Update test files
find tests -name "*.ts" -type f -exec sed -i '' \
  -e "s|from '@felix/code-analysis-types'|from '@felix/code-intelligence'|g" \
  -e "s|from '@felix/code-parser'|from '@felix/code-intelligence'|g" \
  -e "s|from '@felix/felix-server'|from '@felix/code-intelligence/semantic-intelligence'|g" \
  -e "s|from '@felix/knowledge-graph'|from '@felix/code-intelligence'|g" \
  -e "s|from '@felix/architectural-intelligence'|from '@felix/code-intelligence'|g" \
  {} \;

echo "Import updates complete!"
