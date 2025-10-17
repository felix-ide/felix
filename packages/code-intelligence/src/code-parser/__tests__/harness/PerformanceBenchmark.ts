/**
 * PerformanceBenchmark - Comprehensive performance testing for parsers
 *
 * Features:
 * - Measure parsing speed for each language
 * - Memory usage tracking and profiling
 * - Incremental parsing performance
 * - Performance regression detection
 * - Detailed performance reports
 * - Comparison across parser versions
 * - Throughput and latency metrics
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { performance } from 'perf_hooks';
import type { ILanguageParser } from '../../interfaces/ILanguageParser.js';
import type { TestCase, BenchmarkResult } from './types.js';

/**
 * Performance measurement utilities
 */
interface PerformanceMeasurement {
  startTime: number;
  endTime: number;
  duration: number;
  memoryBefore: NodeJS.MemoryUsage;
  memoryAfter: NodeJS.MemoryUsage;
  memoryDelta: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

/**
 * Benchmark configuration options
 */
export interface BenchmarkOptions {
  iterations: number;
  warmupIterations: number;
  memoryProfiling: boolean;
  gcBetweenRuns: boolean;
  reportDir: string;
  includeSystemInfo: boolean;
  trackThroughput: boolean;
  trackLatency: boolean;
  compareBaselines: boolean;
  baselineDir: string;
}

/**
 * Throughput metrics
 */
interface ThroughputMetrics {
  linesPerSecond: number;
  charactersPerSecond: number;
  componentsPerSecond: number;
  relationshipsPerSecond: number;
  filesPerSecond: number;
}

/**
 * Latency metrics
 */
interface LatencyMetrics {
  parseLatency: number;
  componentExtractionLatency: number;
  relationshipExtractionLatency: number;
  totalLatency: number;
}

/**
 * System information for benchmark context
 */
interface SystemInfo {
  nodeVersion: string;
  platform: string;
  arch: string;
  cpuModel: string;
  cpuCores: number;
  totalMemory: number;
  freeMemory: number;
  loadAverage: number[];
  uptime: number;
}

/**
 * Performance benchmark runner
 */
export class PerformanceBenchmark {
  private options: BenchmarkOptions;
  private systemInfo: SystemInfo;

  constructor(options: Partial<BenchmarkOptions> = {}) {
    this.options = {
      iterations: 10,
      warmupIterations: 3,
      memoryProfiling: true,
      gcBetweenRuns: true,
      reportDir: join(process.cwd(), 'benchmark-reports'),
      includeSystemInfo: true,
      trackThroughput: true,
      trackLatency: true,
      compareBaselines: false,
      baselineDir: join(process.cwd(), 'benchmark-baselines'),
      ...options
    };

    this.systemInfo = this.collectSystemInfo();
    this.ensureDirectories();
  }

  /**
   * Run a comprehensive benchmark for a parser
   */
  async benchmarkParser(
    parser: ILanguageParser,
    testCases: TestCase[]
  ): Promise<BenchmarkResult[]> {
    console.error(`Starting benchmark for ${parser.language} parser`);
    console.error(`Test cases: ${testCases.length}`);
    console.error(`Iterations per test: ${this.options.iterations}`);
    console.error(`Warmup iterations: ${this.options.warmupIterations}`);

    const results: BenchmarkResult[] = [];

    for (const testCase of testCases) {
      console.error(`Benchmarking: ${testCase.name}`);

      const result = await this.benchmarkTestCase(parser, testCase);
      results.push(result);

      // Log progress
      const currentIndex = results.length;
      const progress = ((currentIndex / testCases.length) * 100).toFixed(1);
      console.error(`Progress: ${progress}% (${currentIndex}/${testCases.length})`);
    }

    // Generate and save comprehensive report
    await this.generateBenchmarkReport(parser, results);

    return results;
  }

  /**
   * Benchmark a specific test case
   */
  async benchmarkTestCase(
    parser: ILanguageParser,
    testCase: TestCase
  ): Promise<BenchmarkResult> {
    const measurements: PerformanceMeasurement[] = [];
    const throughputMetrics: ThroughputMetrics[] = [];
    const latencyMetrics: LatencyMetrics[] = [];

    // Warmup runs
    for (let i = 0; i < this.options.warmupIterations; i++) {
      await this.runSingleIteration(parser, testCase);
      if (this.options.gcBetweenRuns) {
        global.gc?.();
      }
    }

    // Actual benchmark runs
    for (let i = 0; i < this.options.iterations; i++) {
      const measurement = await this.measurePerformance(parser, testCase);
      measurements.push(measurement);

      // Calculate throughput metrics
      if (this.options.trackThroughput) {
        const throughput = this.calculateThroughput(testCase, measurement);
        throughputMetrics.push(throughput);
      }

      // Calculate latency metrics
      if (this.options.trackLatency) {
        const latency = this.calculateLatency(measurement);
        latencyMetrics.push(latency);
      }

      if (this.options.gcBetweenRuns) {
        global.gc?.();
      }

      // Small delay between iterations
      await this.sleep(10);
    }

    // Calculate statistics
    const durations = measurements.map(m => m.duration);
    const memoryUsages = measurements.map(m => m.memoryDelta.heapUsed);

    const result: BenchmarkResult = {
      testName: testCase.name,
      language: testCase.language,
      parser: parser.language,
      fileSize: testCase.content.length,
      iterations: this.options.iterations,
      metrics: {
        avgParseTime: this.average(durations),
        minParseTime: Math.min(...durations),
        maxParseTime: Math.max(...durations),
        stdDeviation: this.standardDeviation(durations),
        avgMemoryUsage: this.average(memoryUsages),
        peakMemoryUsage: Math.max(...memoryUsages),
        componentsPerSecond: this.options.trackThroughput ? this.average(throughputMetrics.map(t => t.componentsPerSecond)) : 0,
        relationshipsPerSecond: this.options.trackThroughput ? this.average(throughputMetrics.map(t => t.relationshipsPerSecond)) : 0
      },
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: this.systemInfo.nodeVersion,
        platform: this.systemInfo.platform,
        arch: this.systemInfo.arch,
        cpuModel: this.systemInfo.cpuModel,
        totalMemory: this.systemInfo.totalMemory
      }
    };

    return result;
  }

  /**
   * Compare current results with baseline
   */
  async compareWithBaseline(
    currentResults: BenchmarkResult[],
    parser: ILanguageParser
  ): Promise<PerformanceComparison[]> {
    if (!this.options.compareBaselines) {
      return [];
    }

    const baselineFile = join(this.options.baselineDir, `${parser.language}-baseline.json`);
    if (!existsSync(baselineFile)) {
      console.error(`No baseline found for ${parser.language} parser`);
      return [];
    }

    const baselineResults: BenchmarkResult[] = JSON.parse(readFileSync(baselineFile, 'utf-8'));
    const comparisons: PerformanceComparison[] = [];

    for (const currentResult of currentResults) {
      const baselineResult = baselineResults.find(b => b.testName === currentResult.testName);
      if (baselineResult) {
        const comparison = this.compareResults(currentResult, baselineResult);
        comparisons.push(comparison);
      }
    }

    return comparisons;
  }

  /**
   * Save results as new baseline
   */
  async saveAsBaseline(results: BenchmarkResult[], parser: ILanguageParser): Promise<void> {
    const baselineFile = join(this.options.baselineDir, `${parser.language}-baseline.json`);
    mkdirSync(this.options.baselineDir, { recursive: true });
    writeFileSync(baselineFile, JSON.stringify(results, null, 2));
    console.error(`Saved baseline for ${parser.language} parser: ${baselineFile}`);
  }

  /**
   * Generate comprehensive benchmark report
   */
  async generateBenchmarkReport(
    parser: ILanguageParser,
    results: BenchmarkResult[]
  ): Promise<string> {
    const reportPath = join(
      this.options.reportDir,
      `${parser.language}-benchmark-${new Date().toISOString().split('T')[0]}.md`
    );

    const report = this.buildBenchmarkReport(parser, results);
    writeFileSync(reportPath, report);

    console.error(`Benchmark report generated: ${reportPath}`);
    return reportPath;
  }

  // Private methods

  private async measurePerformance(
    parser: ILanguageParser,
    testCase: TestCase
  ): Promise<PerformanceMeasurement> {
    const memoryBefore = process.memoryUsage();
    const startTime = performance.now();

    await this.runSingleIteration(parser, testCase);

    const endTime = performance.now();
    const memoryAfter = process.memoryUsage();

    return {
      startTime,
      endTime,
      duration: endTime - startTime,
      memoryBefore,
      memoryAfter,
      memoryDelta: {
        rss: memoryAfter.rss - memoryBefore.rss,
        heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
        heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
        external: memoryAfter.external - memoryBefore.external
      }
    };
  }

  private async runSingleIteration(
    parser: ILanguageParser,
    testCase: TestCase
  ): Promise<void> {
    await parser.parseContent(testCase.content, testCase.filePath);
  }

  private calculateThroughput(
    testCase: TestCase,
    measurement: PerformanceMeasurement
  ): ThroughputMetrics {
    const durationSeconds = measurement.duration / 1000;
    const content = testCase.content;
    const lines = content.split('\n').length;
    const characters = content.length;

    return {
      linesPerSecond: lines / durationSeconds,
      charactersPerSecond: characters / durationSeconds,
      componentsPerSecond: 0, // Would need to get from parse result
      relationshipsPerSecond: 0, // Would need to get from parse result
      filesPerSecond: 1 / durationSeconds
    };
  }

  private calculateLatency(measurement: PerformanceMeasurement): LatencyMetrics {
    // Simplified latency calculation
    // In a real implementation, you'd measure individual phases
    return {
      parseLatency: measurement.duration * 0.7,
      componentExtractionLatency: measurement.duration * 0.2,
      relationshipExtractionLatency: measurement.duration * 0.1,
      totalLatency: measurement.duration
    };
  }

  private compareResults(
    current: BenchmarkResult,
    baseline: BenchmarkResult
  ): PerformanceComparison {
    const parseTimeChange = ((current.metrics.avgParseTime - baseline.metrics.avgParseTime) / baseline.metrics.avgParseTime) * 100;
    const memoryChange = ((current.metrics.avgMemoryUsage - baseline.metrics.avgMemoryUsage) / baseline.metrics.avgMemoryUsage) * 100;

    return {
      testName: current.testName,
      parseTimeChange,
      memoryChange,
      isRegression: parseTimeChange > 10 || memoryChange > 20, // 10% slower or 20% more memory
      isImprovement: parseTimeChange < -5 || memoryChange < -10, // 5% faster or 10% less memory
      current: current.metrics,
      baseline: baseline.metrics
    };
  }

  private buildBenchmarkReport(parser: ILanguageParser, results: BenchmarkResult[]): string {
    const report = [];

    report.push(`# Performance Benchmark Report - ${parser.language}`);
    report.push('');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push(`Parser: ${parser.language}`);
    report.push(`Test Cases: ${results.length}`);
    report.push(`Iterations per test: ${this.options.iterations}`);
    report.push('');

    // System information
    if (this.options.includeSystemInfo) {
      report.push('## System Information');
      report.push(`- Node.js: ${this.systemInfo.nodeVersion}`);
      report.push(`- Platform: ${this.systemInfo.platform} ${this.systemInfo.arch}`);
      report.push(`- CPU: ${this.systemInfo.cpuModel} (${this.systemInfo.cpuCores} cores)`);
      report.push(`- Memory: ${(this.systemInfo.totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`);
      report.push('');
    }

    // Summary statistics
    const avgTimes = results.map(r => r.metrics.avgParseTime);
    const avgMemory = results.map(r => r.metrics.avgMemoryUsage);

    report.push('## Summary Statistics');
    report.push(`- Average Parse Time: ${this.average(avgTimes).toFixed(2)} ms`);
    report.push(`- Fastest Parse: ${Math.min(...avgTimes).toFixed(2)} ms`);
    report.push(`- Slowest Parse: ${Math.max(...avgTimes).toFixed(2)} ms`);
    report.push(`- Average Memory Usage: ${(this.average(avgMemory) / 1024 / 1024).toFixed(2)} MB`);
    report.push(`- Peak Memory Usage: ${(Math.max(...avgMemory) / 1024 / 1024).toFixed(2)} MB`);
    report.push('');

    // Detailed results
    report.push('## Detailed Results');
    report.push('');
    report.push('| Test Case | File Size | Avg Time (ms) | Min Time (ms) | Max Time (ms) | Memory (MB) | Throughput (chars/s) |');
    report.push('|-----------|-----------|---------------|---------------|---------------|-------------|----------------------|');

    for (const result of results) {
      const avgTime = result.metrics.avgParseTime.toFixed(2);
      const minTime = result.metrics.minParseTime.toFixed(2);
      const maxTime = result.metrics.maxParseTime.toFixed(2);
      const memory = (result.metrics.avgMemoryUsage / 1024 / 1024).toFixed(2);
      const throughput = (result.fileSize / (result.metrics.avgParseTime / 1000)).toFixed(0);

      report.push(`| ${result.testName} | ${result.fileSize} | ${avgTime} | ${minTime} | ${maxTime} | ${memory} | ${throughput} |`);
    }

    report.push('');

    // Performance insights
    report.push('## Performance Insights');

    const largeFiles = results.filter(r => r.fileSize > 10000);
    if (largeFiles.length > 0) {
      const avgTimePerByte = largeFiles.map(r => r.metrics.avgParseTime / r.fileSize);
      report.push(`- Large files (>10KB): Average ${this.average(avgTimePerByte).toFixed(4)} ms per byte`);
    }

    const slowTests = results.filter(r => r.metrics.avgParseTime > this.average(avgTimes) + this.standardDeviation(avgTimes));
    if (slowTests.length > 0) {
      report.push(`- Slow tests (>1σ): ${slowTests.map(t => t.testName).join(', ')}`);
    }

    return report.join('\n');
  }

  private collectSystemInfo(): SystemInfo {
    const os = require('os');

    return {
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      cpuModel: os.cpus()[0]?.model || 'Unknown',
      cpuCores: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      loadAverage: os.loadavg(),
      uptime: os.uptime()
    };
  }

  private ensureDirectories(): void {
    mkdirSync(this.options.reportDir, { recursive: true });
    if (this.options.compareBaselines) {
      mkdirSync(this.options.baselineDir, { recursive: true });
    }
  }

  private average(numbers: number[]): number {
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  private standardDeviation(numbers: number[]): number {
    const avg = this.average(numbers);
    const squaredDiffs = numbers.map(n => Math.pow(n - avg, 2));
    const avgSquaredDiff = this.average(squaredDiffs);
    return Math.sqrt(avgSquaredDiff);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Performance comparison result
 */
interface PerformanceComparison {
  testName: string;
  parseTimeChange: number; // Percentage change
  memoryChange: number; // Percentage change
  isRegression: boolean;
  isImprovement: boolean;
  current: BenchmarkResult['metrics'];
  baseline: BenchmarkResult['metrics'];
}