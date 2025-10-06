// Unit-test-safe export surface for apps that do not need parsers.
// Exposes types and services that don't depend on import.meta / Tree-sitter.

export * from '../src/code-analysis-types/index.ts';
export * from '../src/semantic-intelligence/index.ts';
export * from '../src/architecture-intelligence/index.ts';
export * from '../src/knowledge-graph/index.ts';
