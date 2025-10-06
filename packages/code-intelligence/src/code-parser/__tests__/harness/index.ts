/**
 * Test Harness for Parser Stack Overhaul
 *
 * This comprehensive test harness validates all parsers and ensures:
 * - Parser test runner with validation capabilities
 * - Golden file generation and management
 * - Regression test suite for all languages
 * - Performance benchmarks for parser operations
 */

export { ParserTestRunner } from './ParserTestRunner.js';
export { GoldenFileManager } from './GoldenFileManager.js';
export { PerformanceBenchmark } from './PerformanceBenchmark.js';
export { RegressionSuite } from './RegressionSuite.js';
export { TestHarness } from './TestHarness.js';

export type {
  TestResult,
  TestSuite,
  TestCase,
  GoldenFile,
  BenchmarkResult,
  RegressionTestResult,
  TestHarnessOptions
} from './types.js';