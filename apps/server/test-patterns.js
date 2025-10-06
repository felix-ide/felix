#!/usr/bin/env node

import { getChokidarIgnorePatterns } from './dist/cli/helpers.js';

const patterns = getChokidarIgnorePatterns();

console.log('Total patterns:', patterns.length);
console.log('\nPatterns:');
patterns.forEach((p, i) => {
  if (typeof p === 'function') {
    console.log(`${i}: [FUNCTION]`);
  } else {
    console.log(`${i}: ${p}`);
  }
});

// Test specific paths
const testPaths = [
  'mcp-permission-server/mcp-debug.log',
  'mcp-debug.log',
  'test.log',
  'node_modules/foo.js',
  '.git/config',
  'dist/index.js',
  '.felix.index.db',
  '.felix.index.db-wal'
];

console.log('\nTesting paths:');
testPaths.forEach(path => {
  const ignored = patterns.some(pattern => {
    if (typeof pattern === 'function') {
      return pattern(path);
    } else if (pattern instanceof RegExp) {
      return pattern.test(path);
    } else {
      // Simple glob matching
      const glob = pattern.replace(/\*/g, '.*');
      return new RegExp(glob).test(path);
    }
  });
  console.log(`${path}: ${ignored ? 'IGNORED' : 'WATCHED'}`);
});