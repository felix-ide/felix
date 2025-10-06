/**
 * ParserTestRunner - Comprehensive test runner for validating all parsers
 *
 * Features:
 * - Automated validation of parsing results
 * - Support for all language parsers
 * - Comparison against expected results
 * - Detailed diff reporting
 * - Parallel test execution
 * - Progress tracking and reporting
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { ParserFactory } from '../../ParserFactory.js';
import type { ILanguageParser } from '../../interfaces/ILanguageParser.js';
import type { IComponent, IRelationship, ParseResult } from '../../types.js';
import type {
  TestCase,
  TestResult,
  TestSuite,
  TestDifference,
  TestHarnessOptions,
  TestHarnessState,
  ValidationRule
} from './types.js';

/**
 * Test runner for parser validation
 */
export class ParserTestRunner {
  private parserFactory: ParserFactory;
  private state: TestHarnessState;
  private validationRules: ValidationRule[];
  private options: Required<TestHarnessOptions>;

  constructor(options: TestHarnessOptions = {}) {
    this.parserFactory = new ParserFactory();
    this.options = this.mergeWithDefaults(options);
    this.state = this.initializeState();
    this.validationRules = this.getDefaultValidationRules();
  }

  /**
   * Run a complete test suite
   */
  async runTestSuite(testSuite: TestSuite): Promise<TestResult[]> {
    console.log(`Running test suite: ${testSuite.name}`);
    console.log(`Description: ${testSuite.description}`);
    console.log(`Language: ${testSuite.language}`);
    console.log(`Test cases: ${testSuite.testCases.length}`);

    // Setup
    if (testSuite.setup) {
      await testSuite.setup();
    }

    try {
      this.state.totalTests = testSuite.testCases.length;
      this.state.startTime = new Date();

      // Filter test cases based on options
      const filteredTestCases = this.filterTestCases(testSuite.testCases);

      // Run tests
      const results = this.options.parallel
        ? await this.runTestCasesParallel(filteredTestCases, testSuite.parser)
        : await this.runTestCasesSequential(filteredTestCases, testSuite.parser);

      this.updateFinalState(results);
      this.logSummary(results);

      return results;
    } finally {
      // Teardown
      if (testSuite.teardown) {
        await testSuite.teardown();
      }
    }
  }

  /**
   * Run multiple test suites
   */
  async runTestSuites(testSuites: TestSuite[]): Promise<Map<string, TestResult[]>> {
    const results = new Map<string, TestResult[]>();

    for (const testSuite of testSuites) {
      if (this.shouldRunLanguage(testSuite.language)) {
        const suiteResults = await this.runTestSuite(testSuite);
        results.set(testSuite.name, suiteResults);
      } else {
        console.log(`Skipping test suite ${testSuite.name} (language: ${testSuite.language})`);
      }
    }

    return results;
  }

  /**
   * Run a single test case
   */
  async runTestCase(testCase: TestCase, parser: ILanguageParser): Promise<TestResult> {
    const startTime = Date.now();
    let memoryBefore: number | undefined;

    if (this.options.memoryProfiling) {
      memoryBefore = process.memoryUsage().heapUsed;
    }

    try {
      // Update progress
      this.state.currentTest = testCase.name;
      if (this.options.verbose) {
        console.log(`Running test: ${testCase.name}`);
      }

      // Parse the content
      const parseResult = await this.parseWithTimeout(
        parser,
        testCase.content,
        testCase.filePath,
        testCase.timeout || this.options.timeout
      );

      // Calculate duration
      const duration = Date.now() - startTime;

      // Calculate memory usage
      let memoryUsage: number | undefined;
      if (this.options.memoryProfiling && memoryBefore !== undefined) {
        memoryUsage = process.memoryUsage().heapUsed - memoryBefore;
      }

      // Validate results
      const differences = this.compareResults(testCase, parseResult);
      const success = differences.length === 0 && this.validateWithRules(parseResult);

      const result: TestResult = {
        testCase,
        success,
        parseResult,
        actualComponents: parseResult.components,
        actualRelationships: parseResult.relationships,
        actualErrors: parseResult.errors,
        actualWarnings: parseResult.warnings,
        duration,
        memoryUsage,
        differences
      };

      // Update state
      this.state.completedTests++;
      if (success) {
        this.state.passedTests++;
      } else {
        this.state.failedTests++;
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      const result: TestResult = {
        testCase,
        success: false,
        actualComponents: [],
        actualRelationships: [],
        actualErrors: [],
        actualWarnings: [],
        duration,
        error: error as Error
      };

      this.state.completedTests++;
      this.state.failedTests++;

      return result;
    }
  }

  /**
   * Load test cases from a directory
   */
  loadTestCasesFromDirectory(directory: string, language: string): TestCase[] {
    const testCases: TestCase[] = [];
    const glob = require('glob');

    // Find all test files
    const testFiles = glob.sync(join(directory, '**/*.{js,ts,py,php,java,html,css,json,md}'));

    for (const filePath of testFiles) {
      if (this.shouldIncludeFile(filePath)) {
        const testCase = this.createTestCaseFromFile(filePath, language);
        if (testCase) {
          testCases.push(testCase);
        }
      }
    }

    return testCases;
  }

  /**
   * Create a test suite for a specific language
   */
  createTestSuiteForLanguage(language: string, testCasesDir: string): TestSuite | null {
    const parser = this.getParserForLanguage(language);
    if (!parser) {
      console.warn(`No parser found for language: ${language}`);
      return null;
    }

    const testCases = this.loadTestCasesFromDirectory(testCasesDir, language);
    if (testCases.length === 0) {
      console.warn(`No test cases found for language: ${language}`);
      return null;
    }

    return {
      name: `${language}-parser-tests`,
      description: `Comprehensive test suite for ${language} parser`,
      language,
      parser,
      testCases
    };
  }

  /**
   * Generate a comprehensive test report
   */
  generateReport(results: Map<string, TestResult[]>): string {
    const report = [];
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;

    report.push('# Parser Test Harness Report');
    report.push('');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push('');

    // Summary
    for (const [suiteName, suiteResults] of results) {
      const passed = suiteResults.filter(r => r.success).length;
      const failed = suiteResults.filter(r => !r.success).length;

      totalTests += suiteResults.length;
      totalPassed += passed;
      totalFailed += failed;

      report.push(`## ${suiteName}`);
      report.push(`- Total: ${suiteResults.length}`);
      report.push(`- Passed: ${passed}`);
      report.push(`- Failed: ${failed}`);
      report.push(`- Success Rate: ${((passed / suiteResults.length) * 100).toFixed(2)}%`);
      report.push('');

      // Failed tests details
      const failedTests = suiteResults.filter(r => !r.success);
      if (failedTests.length > 0) {
        report.push('### Failed Tests:');
        for (const test of failedTests) {
          report.push(`- **${test.testCase.name}**: ${test.error?.message || 'Validation failed'}`);
          if (test.differences && test.differences.length > 0) {
            for (const diff of test.differences) {
              report.push(`  - ${diff.type}: ${diff.message}`);
            }
          }
        }
        report.push('');
      }
    }

    // Overall summary
    report.push('## Overall Summary');
    report.push(`- Total Tests: ${totalTests}`);
    report.push(`- Passed: ${totalPassed}`);
    report.push(`- Failed: ${totalFailed}`);
    report.push(`- Overall Success Rate: ${((totalPassed / totalTests) * 100).toFixed(2)}%`);

    return report.join('\n');
  }

  // Private methods

  private mergeWithDefaults(options: TestHarnessOptions): Required<TestHarnessOptions> {
    return {
      timeout: 30000,
      parallel: false,
      maxConcurrency: 4,
      verbose: false,
      enableAllParsers: true,
      enabledParsers: [],
      parserOptions: {},
      updateGoldenFiles: false,
      goldenFileDir: join(process.cwd(), '__tests__', 'fixtures', 'golden'),
      goldenFileVersion: '1.0.0',
      enableBenchmarks: false,
      benchmarkIterations: 10,
      memoryProfiling: false,
      enableRegressionTests: false,
      baselineDir: join(process.cwd(), '__tests__', 'baseline'),
      regressionThreshold: 0.1,
      outputFormat: 'console',
      outputFile: '',
      generateReport: false,
      reportDir: join(process.cwd(), 'test-reports'),
      includeTests: [],
      excludeTests: [],
      includeTags: [],
      excludeTags: [],
      includeLanguages: [],
      excludeLanguages: [],
      ...options
    };
  }

  private initializeState(): TestHarnessState {
    return {
      totalTests: 0,
      completedTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      startTime: new Date()
    };
  }

  private getDefaultValidationRules(): ValidationRule[] {
    return [
      {
        name: 'components-not-empty',
        description: 'Parse result should contain at least one component',
        validator: (result) => result.actualComponents.length > 0,
        errorMessage: 'No components found in parse result',
        severity: 'warning'
      },
      {
        name: 'no-critical-errors',
        description: 'Parse result should not contain critical errors',
        validator: (result) => !result.actualErrors.some(e => e.severity === 'error'),
        errorMessage: 'Critical errors found in parse result',
        severity: 'error'
      },
      {
        name: 'valid-component-structure',
        description: 'All components should have required properties',
        validator: (result) => result.actualComponents.every(c =>
          c.id && c.name && c.type && c.language && c.filePath
        ),
        errorMessage: 'Invalid component structure found',
        severity: 'error'
      }
    ];
  }

  private async runTestCasesSequential(testCases: TestCase[], parser: ILanguageParser): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const testCase of testCases) {
      const result = await this.runTestCase(testCase, parser);
      results.push(result);

      if (this.options.verbose) {
        console.log(`Completed ${this.state.completedTests}/${this.state.totalTests} tests`);
      }
    }

    return results;
  }

  private async runTestCasesParallel(testCases: TestCase[], parser: ILanguageParser): Promise<TestResult[]> {
    const chunks = this.chunkArray(testCases, this.options.maxConcurrency);
    const results: TestResult[] = [];

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(testCase => this.runTestCase(testCase, parser))
      );
      results.push(...chunkResults);
    }

    return results;
  }

  private async parseWithTimeout(
    parser: ILanguageParser,
    content: string,
    filePath: string,
    timeout: number
  ): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Parse timeout after ${timeout}ms`));
      }, timeout);

      parser.parseContent(content, filePath)
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private compareResults(testCase: TestCase, parseResult: ParseResult): TestDifference[] {
    const differences: TestDifference[] = [];

    // Compare components
    if (testCase.expectedComponents) {
      differences.push(...this.compareComponents(testCase.expectedComponents, parseResult.components));
    }

    // Compare relationships
    if (testCase.expectedRelationships) {
      differences.push(...this.compareRelationships(testCase.expectedRelationships, parseResult.relationships));
    }

    // Compare errors
    if (testCase.expectedErrors) {
      differences.push(...this.compareErrors(testCase.expectedErrors, parseResult.errors));
    }

    // Compare warnings
    if (testCase.expectedWarnings) {
      differences.push(...this.compareWarnings(testCase.expectedWarnings, parseResult.warnings));
    }

    return differences;
  }

  private compareComponents(expected: Partial<IComponent>[], actual: IComponent[]): TestDifference[] {
    const differences: TestDifference[] = [];

    // Check for missing components
    for (const expectedComponent of expected) {
      const found = actual.find(c =>
        c.name === expectedComponent.name &&
        c.type === expectedComponent.type
      );

      if (!found) {
        differences.push({
          type: 'component',
          category: 'missing',
          expected: expectedComponent,
          message: `Missing component: ${expectedComponent.name} (${expectedComponent.type})`
        });
      }
    }

    return differences;
  }

  private compareRelationships(expected: Partial<IRelationship>[], actual: IRelationship[]): TestDifference[] {
    const differences: TestDifference[] = [];

    // Check for missing relationships
    for (const expectedRelationship of expected) {
      const found = actual.find(r =>
        r.type === expectedRelationship.type &&
        r.sourceId === expectedRelationship.sourceId &&
        r.targetId === expectedRelationship.targetId
      );

      if (!found) {
        differences.push({
          type: 'relationship',
          category: 'missing',
          expected: expectedRelationship,
          message: `Missing relationship: ${expectedRelationship.type} from ${expectedRelationship.sourceId} to ${expectedRelationship.targetId}`
        });
      }
    }

    return differences;
  }

  private compareErrors(expected: Partial<any>[], actual: any[]): TestDifference[] {
    // Simplified comparison for now
    return [];
  }

  private compareWarnings(expected: Partial<any>[], actual: any[]): TestDifference[] {
    // Simplified comparison for now
    return [];
  }

  private validateWithRules(parseResult: ParseResult): boolean {
    for (const rule of this.validationRules) {
      const testResult: TestResult = {
        testCase: {} as TestCase,
        success: false,
        actualComponents: parseResult.components,
        actualRelationships: parseResult.relationships,
        actualErrors: parseResult.errors,
        actualWarnings: parseResult.warnings,
        duration: 0
      };

      if (!rule.validator(testResult)) {
        if (rule.severity === 'error') {
          return false;
        }
      }
    }
    return true;
  }

  private filterTestCases(testCases: TestCase[]): TestCase[] {
    return testCases.filter(testCase => {
      // Filter by test name
      if (this.options.includeTests.length > 0) {
        const included = this.options.includeTests.some(pattern =>
          testCase.name.includes(pattern)
        );
        if (!included) return false;
      }

      if (this.options.excludeTests.length > 0) {
        const excluded = this.options.excludeTests.some(pattern =>
          testCase.name.includes(pattern)
        );
        if (excluded) return false;
      }

      // Filter by tags
      if (this.options.includeTags.length > 0) {
        const hasIncludedTag = this.options.includeTags.some(tag =>
          testCase.tags?.includes(tag)
        );
        if (!hasIncludedTag) return false;
      }

      if (this.options.excludeTags.length > 0) {
        const hasExcludedTag = this.options.excludeTags.some(tag =>
          testCase.tags?.includes(tag)
        );
        if (hasExcludedTag) return false;
      }

      return true;
    });
  }

  private shouldRunLanguage(language: string): boolean {
    if (this.options.includeLanguages.length > 0) {
      return this.options.includeLanguages.includes(language);
    }

    if (this.options.excludeLanguages.length > 0) {
      return !this.options.excludeLanguages.includes(language);
    }

    return true;
  }

  private shouldIncludeFile(filePath: string): boolean {
    const basename = require('path').basename(filePath);

    // Skip hidden files, test files, and common non-source files
    if (basename.startsWith('.') ||
        basename.includes('.test.') ||
        basename.includes('.spec.') ||
        basename.includes('.min.')) {
      return false;
    }

    return true;
  }

  private createTestCaseFromFile(filePath: string, language: string): TestCase | null {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const name = basename(filePath, extname(filePath));

      return {
        name: `${language}-${name}`,
        description: `Test case for ${basename(filePath)}`,
        filePath,
        content,
        language,
        tags: [language, 'auto-generated']
      };
    } catch (error) {
      console.warn(`Failed to create test case from ${filePath}:`, error);
      return null;
    }
  }

  private getParserForLanguage(language: string): ILanguageParser | null {
    try {
      return this.parserFactory.getParser(language);
    } catch (error) {
      return null;
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private updateFinalState(results: TestResult[]): void {
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    this.state.passedTests = passed;
    this.state.failedTests = failed;
    this.state.completedTests = results.length;
  }

  private logSummary(results: TestResult[]): void {
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const total = results.length;

    console.log('\n--- Test Summary ---');
    console.log(`Total: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(2)}%`);

    if (failed > 0) {
      console.log('\nFailed Tests:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`  - ${result.testCase.name}: ${result.error?.message || 'Validation failed'}`);
      });
    }
  }
}