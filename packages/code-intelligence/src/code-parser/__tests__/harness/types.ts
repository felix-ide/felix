/**
 * Type definitions for the test harness
 */

import type { IComponent, IRelationship, ParseResult, ParseError, ParseWarning } from '../../types.js';
import type { ILanguageParser } from '../../interfaces/ILanguageParser.js';

/**
 * Test case definition
 */
export interface TestCase {
  name: string;
  description: string;
  filePath: string;
  content: string;
  language: string;
  expectedComponents?: Partial<IComponent>[];
  expectedRelationships?: Partial<IRelationship>[];
  expectedErrors?: Partial<ParseError>[];
  expectedWarnings?: Partial<ParseWarning>[];
  tags?: string[];
  timeout?: number;
}

/**
 * Test result from running a single test case
 */
export interface TestResult {
  testCase: TestCase;
  success: boolean;
  parseResult?: ParseResult;
  actualComponents: IComponent[];
  actualRelationships: IRelationship[];
  actualErrors: ParseError[];
  actualWarnings: ParseWarning[];
  duration: number;
  memoryUsage?: number;
  differences?: TestDifference[];
  error?: Error;
}

/**
 * Difference found between expected and actual results
 */
export interface TestDifference {
  type: 'component' | 'relationship' | 'error' | 'warning';
  category: 'missing' | 'unexpected' | 'different';
  expected?: any;
  actual?: any;
  path?: string;
  message: string;
}

/**
 * Test suite containing multiple test cases
 */
export interface TestSuite {
  name: string;
  description: string;
  language: string;
  parser: ILanguageParser;
  testCases: TestCase[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

/**
 * Golden file definition for storing expected test outputs
 */
export interface GoldenFile {
  version: string;
  testCase: string;
  language: string;
  parser: string;
  timestamp: string;
  metadata: {
    filePath: string;
    fileSize: number;
    parsingLevel: 'semantic' | 'structural' | 'basic';
    backend: string;
  };
  expected: {
    components: IComponent[];
    relationships: IRelationship[];
    errors: ParseError[];
    warnings: ParseWarning[];
    parseMetadata: Record<string, any>;
  };
  checksums: {
    components: string;
    relationships: string;
    errors: string;
    warnings: string;
  };
}

/**
 * Performance benchmark result
 */
export interface BenchmarkResult {
  testName: string;
  language: string;
  parser: string;
  fileSize: number;
  iterations: number;
  metrics: {
    avgParseTime: number;
    minParseTime: number;
    maxParseTime: number;
    stdDeviation: number;
    avgMemoryUsage: number;
    peakMemoryUsage: number;
    componentsPerSecond: number;
    relationshipsPerSecond: number;
  };
  timestamp: string;
  environment: {
    nodeVersion: string;
    platform: string;
    arch: string;
    cpuModel: string;
    totalMemory: number;
  };
}

/**
 * Regression test result comparing against previous versions
 */
export interface RegressionTestResult {
  testCase: string;
  language: string;
  current: TestResult;
  baseline?: TestResult;
  goldenFile?: GoldenFile;
  regressions: RegressionIssue[];
  improvements: RegressionImprovement[];
  status: 'pass' | 'fail' | 'regression' | 'improvement' | 'new';
}

/**
 * Regression issue detected
 */
export interface RegressionIssue {
  type: 'performance' | 'accuracy' | 'error' | 'missing-feature';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  impact: string;
  currentValue: any;
  expectedValue: any;
}

/**
 * Improvement detected in regression testing
 */
export interface RegressionImprovement {
  type: 'performance' | 'accuracy' | 'error-reduction' | 'new-feature';
  description: string;
  impact: string;
  previousValue: any;
  currentValue: any;
}

/**
 * Options for test harness configuration
 */
export interface TestHarnessOptions {
  // General options
  timeout?: number;
  parallel?: boolean;
  maxConcurrency?: number;
  verbose?: boolean;

  // Parser options
  enableAllParsers?: boolean;
  enabledParsers?: string[];
  parserOptions?: Record<string, any>;

  // Golden file options
  updateGoldenFiles?: boolean;
  goldenFileDir?: string;
  goldenFileVersion?: string;

  // Performance options
  enableBenchmarks?: boolean;
  benchmarkIterations?: number;
  memoryProfiling?: boolean;

  // Regression testing options
  enableRegressionTests?: boolean;
  baselineDir?: string;
  regressionThreshold?: number;

  // Output options
  outputFormat?: 'json' | 'junit' | 'console';
  outputFile?: string;
  generateReport?: boolean;
  reportDir?: string;

  // Filter options
  includeTests?: string[];
  excludeTests?: string[];
  includeTags?: string[];
  excludeTags?: string[];
  includeLanguages?: string[];
  excludeLanguages?: string[];
}

/**
 * Test harness state and progress tracking
 */
export interface TestHarnessState {
  totalTests: number;
  completedTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  startTime: Date;
  currentTest?: string;
  estimatedTimeRemaining?: number;
}

/**
 * Validation rules for test results
 */
export interface ValidationRule {
  name: string;
  description: string;
  validator: (result: TestResult) => boolean;
  errorMessage: string;
  severity: 'error' | 'warning';
}

/**
 * Test fixture definition
 */
export interface TestFixture {
  name: string;
  language: string;
  content: string;
  filePath: string;
  description: string;
  tags: string[];
  complexity: 'simple' | 'medium' | 'complex';
  features: string[];
  expectedComponentCount?: number;
  expectedRelationshipCount?: number;
}