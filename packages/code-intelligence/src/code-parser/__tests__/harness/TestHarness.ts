/**
 * TestHarness - Main entry point for comprehensive parser testing
 *
 * This is the primary interface for running all types of parser tests:
 * - Individual parser validation
 * - Golden file generation and comparison
 * - Performance benchmarking
 * - Regression testing
 * - Comprehensive test reporting
 */

import { join } from 'path';
import { ParserTestRunner } from './ParserTestRunner.js';
import { GoldenFileManager } from './GoldenFileManager.js';
import { PerformanceBenchmark } from './PerformanceBenchmark.js';
import { RegressionSuite } from './RegressionSuite.js';
import { ParserFactory } from '../../ParserFactory.js';
import type {
  TestHarnessOptions,
  TestSuite,
  TestResult,
  BenchmarkResult,
  RegressionTestResult
} from './types.js';

/**
 * Complete test harness results
 */
export interface TestHarnessResults {
  validationResults: Map<string, TestResult[]>;
  benchmarkResults: Map<string, BenchmarkResult[]>;
  regressionResults: Map<string, RegressionTestResult[]>;
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    regressions: number;
    improvements: number;
    averagePerformance: number;
  };
  reports: {
    validationReport: string;
    benchmarkReport: string;
    regressionReport: string;
    combinedReport: string;
  };
}

/**
 * Main test harness orchestrator
 */
export class TestHarness {
  private options: Required<TestHarnessOptions>;
  private parserFactory: ParserFactory;
  private testRunner: ParserTestRunner;
  private goldenFileManager: GoldenFileManager;
  private performanceBenchmark: PerformanceBenchmark;
  private regressionSuite: RegressionSuite;

  constructor(options: TestHarnessOptions = {}) {
    this.options = this.mergeWithDefaults(options);
    this.parserFactory = new ParserFactory();

    this.testRunner = new ParserTestRunner(this.options);
    this.goldenFileManager = new GoldenFileManager({
      goldenDir: this.options.goldenFileDir,
      version: this.options.goldenFileVersion,
      autoUpdate: this.options.updateGoldenFiles
    });
    this.performanceBenchmark = new PerformanceBenchmark({
      iterations: this.options.benchmarkIterations,
      memoryProfiling: this.options.memoryProfiling,
      reportDir: this.options.reportDir
    });
    this.regressionSuite = new RegressionSuite({
      includePerformanceTests: this.options.enableBenchmarks,
      reportDir: this.options.reportDir
    });
  }

  /**
   * Run the complete test harness
   */
  async runComplete(): Promise<TestHarnessResults> {
    console.error('🚀 Starting comprehensive parser test harness...');
    console.error(`Options: ${JSON.stringify(this.getOptionsInfo(), null, 2)}`);

    const results: TestHarnessResults = {
      validationResults: new Map(),
      benchmarkResults: new Map(),
      regressionResults: new Map(),
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        regressions: 0,
        improvements: 0,
        averagePerformance: 0
      },
      reports: {
        validationReport: '',
        benchmarkReport: '',
        regressionReport: '',
        combinedReport: ''
      }
    };

    try {
      // 1. Run validation tests
      console.error('\n📋 Running validation tests...');
      results.validationResults = await this.runValidationTests();

      // 2. Run performance benchmarks
      if (this.options.enableBenchmarks) {
        console.error('\n⚡ Running performance benchmarks...');
        results.benchmarkResults = await this.runPerformanceBenchmarks();
      }

      // 3. Run regression tests
      if (this.options.enableRegressionTests) {
        console.error('\n🔍 Running regression tests...');
        results.regressionResults = await this.runRegressionTests();
      }

      // 4. Generate summary and reports
      console.error('\n📊 Generating reports...');
      results.summary = this.calculateSummary(results);
      results.reports = await this.generateReports(results);

      // 5. Update golden files if requested
      if (this.options.updateGoldenFiles) {
        console.error('\n💾 Updating golden files...');
        await this.updateGoldenFiles(results.validationResults);
      }

      this.logFinalSummary(results);
      return results;

    } catch (error) {
      console.error('❌ Test harness failed:', error);
      throw error;
    }
  }

  /**
   * Run only validation tests
   */
  async runValidationOnly(): Promise<Map<string, TestResult[]>> {
    console.error('📋 Running validation tests only...');
    return await this.runValidationTests();
  }

  /**
   * Run only performance benchmarks
   */
  async runBenchmarksOnly(): Promise<Map<string, BenchmarkResult[]>> {
    console.error('⚡ Running performance benchmarks only...');
    return await this.runPerformanceBenchmarks();
  }

  /**
   * Run only regression tests
   */
  async runRegressionsOnly(): Promise<Map<string, RegressionTestResult[]>> {
    console.error('🔍 Running regression tests only...');
    return await this.runRegressionTests();
  }

  /**
   * Generate golden files for all test cases
   */
  async generateGoldenFiles(): Promise<void> {
    console.error('🏆 Generating golden files...');

    const validationResults = await this.runValidationTests();

    for (const [language, results] of validationResults) {
      const parser = this.parserFactory.getParser(language);
      if (!parser) continue;

      console.error(`Generating golden files for ${language}...`);

      for (const result of results) {
        if (result.parseResult) {
          const goldenFile = await this.goldenFileManager.generateGoldenFile(
            result.testCase,
            result.parseResult,
            parser
          );

          await this.goldenFileManager.saveGoldenFile(goldenFile);
          console.error(`  ✅ Generated: ${result.testCase.name}`);
        }
      }
    }

    console.error('✨ Golden file generation complete!');
  }

  // Private methods

  private async runValidationTests(): Promise<Map<string, TestResult[]>> {
    const results = new Map<string, TestResult[]>();
    const languages = this.getTargetLanguages();

    for (const language of languages) {
      console.error(`  Testing ${language} parser...`);

      const testSuite = this.createTestSuiteForLanguage(language);
      if (testSuite) {
        const testResults = await this.testRunner.runTestSuite(testSuite);
        results.set(language, testResults);

        const passed = testResults.filter(r => r.success).length;
        console.error(`    ${passed}/${testResults.length} tests passed`);
      }
    }

    return results;
  }

  private async runPerformanceBenchmarks(): Promise<Map<string, BenchmarkResult[]>> {
    const results = new Map<string, BenchmarkResult[]>();
    const languages = this.getTargetLanguages();

    for (const language of languages) {
      console.error(`  Benchmarking ${language} parser...`);

      const parser = this.parserFactory.getParser(language);
      if (parser) {
        const testCases = this.getTestCasesForLanguage(language);
        const benchmarkResults = await this.performanceBenchmark.benchmarkParser(parser, testCases);
        results.set(language, benchmarkResults);

        const avgTime = benchmarkResults.reduce((sum, r) => sum + r.metrics.avgParseTime, 0) / benchmarkResults.length;
        console.error(`    Average parse time: ${avgTime.toFixed(2)}ms`);
      }
    }

    return results;
  }

  private async runRegressionTests(): Promise<Map<string, RegressionTestResult[]>> {
    return await this.regressionSuite.runFullRegressionSuite();
  }

  private createTestSuiteForLanguage(language: string): TestSuite | null {
    const parser = this.parserFactory.getParser(language);
    if (!parser) return null;

    const testCases = this.getTestCasesForLanguage(language);
    if (testCases.length === 0) return null;

    return {
      name: `${language}-validation-suite`,
      description: `Validation test suite for ${language} parser`,
      language,
      parser,
      testCases
    };
  }

  private getTestCasesForLanguage(language: string): any[] {
    // Load test cases from fixtures directory
    const testCasesDir = this.options.goldenFileDir.replace('golden', 'test-files');
    return this.testRunner.loadTestCasesFromDirectory(testCasesDir, language);
  }

  private getTargetLanguages(): string[] {
    if (this.options.includeLanguages.length > 0) {
      return this.options.includeLanguages;
    }

    const allLanguages = ['javascript', 'typescript', 'python', 'php', 'java', 'html', 'css', 'json', 'markdown'];

    if (this.options.excludeLanguages.length > 0) {
      return allLanguages.filter(lang => !this.options.excludeLanguages.includes(lang));
    }

    return allLanguages;
  }

  private calculateSummary(results: TestHarnessResults): TestHarnessResults['summary'] {
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    for (const [, testResults] of results.validationResults) {
      totalTests += testResults.length;
      passedTests += testResults.filter(r => r.success).length;
      failedTests += testResults.filter(r => !r.success).length;
    }

    let regressions = 0;
    let improvements = 0;

    for (const [, regResults] of results.regressionResults) {
      regressions += regResults.filter(r => r.status === 'regression').length;
      improvements += regResults.filter(r => r.status === 'improvement').length;
    }

    let totalTime = 0;
    let benchmarkCount = 0;

    for (const [, benchResults] of results.benchmarkResults) {
      for (const bench of benchResults) {
        totalTime += bench.metrics.avgParseTime;
        benchmarkCount++;
      }
    }

    const averagePerformance = benchmarkCount > 0 ? totalTime / benchmarkCount : 0;

    return {
      totalTests,
      passedTests,
      failedTests,
      regressions,
      improvements,
      averagePerformance
    };
  }

  private async generateReports(results: TestHarnessResults): Promise<TestHarnessResults['reports']> {
    const validationReport = this.testRunner.generateReport(results.validationResults);

    const benchmarkReport = results.benchmarkResults.size > 0
      ? this.generateBenchmarkSummaryReport(results.benchmarkResults)
      : 'No benchmark results available.';

    const regressionReport = results.regressionResults.size > 0
      ? this.generateRegressionSummaryReport(results.regressionResults)
      : 'No regression results available.';

    const combinedReport = this.generateCombinedReport(results);

    return {
      validationReport,
      benchmarkReport,
      regressionReport,
      combinedReport
    };
  }

  private generateBenchmarkSummaryReport(results: Map<string, BenchmarkResult[]>): string {
    const report = ['# Performance Benchmark Summary', ''];

    for (const [language, benchResults] of results) {
      const avgTime = benchResults.reduce((sum, r) => sum + r.metrics.avgParseTime, 0) / benchResults.length;
      const avgMemory = benchResults.reduce((sum, r) => sum + r.metrics.avgMemoryUsage, 0) / benchResults.length;

      report.push(`## ${language}`);
      report.push(`- Average Parse Time: ${avgTime.toFixed(2)}ms`);
      report.push(`- Average Memory Usage: ${(avgMemory / 1024 / 1024).toFixed(2)}MB`);
      report.push(`- Test Cases: ${benchResults.length}`);
      report.push('');
    }

    return report.join('\n');
  }

  private generateRegressionSummaryReport(results: Map<string, RegressionTestResult[]>): string {
    const report = ['# Regression Test Summary', ''];

    let totalRegressions = 0;
    let totalImprovements = 0;

    for (const [language, regResults] of results) {
      const regressions = regResults.filter(r => r.status === 'regression').length;
      const improvements = regResults.filter(r => r.status === 'improvement').length;

      totalRegressions += regressions;
      totalImprovements += improvements;

      report.push(`## ${language}`);
      report.push(`- Regressions: ${regressions}`);
      report.push(`- Improvements: ${improvements}`);
      report.push(`- Total Tests: ${regResults.length}`);
      report.push('');
    }

    report.push(`## Overall: ${totalRegressions} regressions, ${totalImprovements} improvements`);

    return report.join('\n');
  }

  private generateCombinedReport(results: TestHarnessResults): string {
    const report = ['# Complete Parser Test Harness Report', ''];

    report.push(`Generated: ${new Date().toISOString()}`);
    report.push('');

    report.push('## Summary');
    report.push(`- Total Tests: ${results.summary.totalTests}`);
    report.push(`- Passed: ${results.summary.passedTests}`);
    report.push(`- Failed: ${results.summary.failedTests}`);
    report.push(`- Success Rate: ${((results.summary.passedTests / results.summary.totalTests) * 100).toFixed(2)}%`);
    report.push(`- Regressions: ${results.summary.regressions}`);
    report.push(`- Improvements: ${results.summary.improvements}`);
    report.push(`- Average Performance: ${results.summary.averagePerformance.toFixed(2)}ms`);
    report.push('');

    report.push('## Validation Results');
    report.push(results.reports.validationReport);
    report.push('');

    if (results.reports.benchmarkReport !== 'No benchmark results available.') {
      report.push('## Performance Results');
      report.push(results.reports.benchmarkReport);
      report.push('');
    }

    if (results.reports.regressionReport !== 'No regression results available.') {
      report.push('## Regression Results');
      report.push(results.reports.regressionReport);
      report.push('');
    }

    return report.join('\n');
  }

  private async updateGoldenFiles(validationResults: Map<string, TestResult[]>): Promise<void> {
    for (const [language, results] of validationResults) {
      const parser = this.parserFactory.getParser(language);
      if (parser) {
        await this.goldenFileManager.updateGoldenFiles(results, parser);
      }
    }
  }

  private logFinalSummary(results: TestHarnessResults): void {
    console.error('\n🎉 Test Harness Complete!');
    console.error('═'.repeat(50));
    console.error(`📊 Total Tests: ${results.summary.totalTests}`);
    console.error(`✅ Passed: ${results.summary.passedTests}`);
    console.error(`❌ Failed: ${results.summary.failedTests}`);
    console.error(`📈 Success Rate: ${((results.summary.passedTests / results.summary.totalTests) * 100).toFixed(2)}%`);

    if (results.summary.regressions > 0) {
      console.error(`🔴 Regressions: ${results.summary.regressions}`);
    }

    if (results.summary.improvements > 0) {
      console.error(`🟢 Improvements: ${results.summary.improvements}`);
    }

    if (results.summary.averagePerformance > 0) {
      console.error(`⚡ Avg Performance: ${results.summary.averagePerformance.toFixed(2)}ms`);
    }

    console.error('═'.repeat(50));
  }

  private getOptionsInfo(): any {
    return {
      parallel: this.options.parallel,
      enableBenchmarks: this.options.enableBenchmarks,
      enableRegressionTests: this.options.enableRegressionTests,
      updateGoldenFiles: this.options.updateGoldenFiles,
      includeLanguages: this.options.includeLanguages,
      excludeLanguages: this.options.excludeLanguages
    };
  }

  private mergeWithDefaults(options: TestHarnessOptions): Required<TestHarnessOptions> {
    return {
      timeout: 30000,
      parallel: true,
      maxConcurrency: 4,
      verbose: false,
      enableAllParsers: true,
      enabledParsers: [],
      parserOptions: {},
      updateGoldenFiles: false,
      goldenFileDir: join(process.cwd(), '__tests__', 'fixtures', 'golden'),
      goldenFileVersion: '1.0.0',
      enableBenchmarks: true,
      benchmarkIterations: 10,
      memoryProfiling: true,
      enableRegressionTests: true,
      baselineDir: join(process.cwd(), '__tests__', 'baseline'),
      regressionThreshold: 0.1,
      outputFormat: 'console',
      outputFile: '',
      generateReport: true,
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
}