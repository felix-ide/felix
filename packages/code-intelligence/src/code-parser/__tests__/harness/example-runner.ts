/**
 * Example test runner showing how to use the test harness programmatically
 */

import { TestHarness } from './TestHarness.js';
import { ParserTestRunner } from './ParserTestRunner.js';
import { GoldenFileManager } from './GoldenFileManager.js';
import { PerformanceBenchmark } from './PerformanceBenchmark.js';
import { RegressionSuite } from './RegressionSuite.js';

/**
 * Example 1: Run complete test suite
 */
async function runCompleteTestSuite() {
  console.log('🚀 Running complete test suite...');

  const harness = new TestHarness({
    parallel: true,
    verbose: true,
    enableBenchmarks: true,
    enableRegressionTests: true,
    generateReport: true,
    reportDir: './test-reports'
  });

  const results = await harness.runComplete();

  console.log('📊 Results Summary:');
  console.log(`Total Tests: ${results.summary.totalTests}`);
  console.log(`Passed: ${results.summary.passedTests}`);
  console.log(`Failed: ${results.summary.failedTests}`);
  console.log(`Success Rate: ${((results.summary.passedTests / results.summary.totalTests) * 100).toFixed(2)}%`);

  return results;
}

/**
 * Example 2: Run validation tests for specific languages
 */
async function runLanguageSpecificTests() {
  console.log('🔍 Running language-specific validation tests...');

  const harness = new TestHarness({
    includeLanguages: ['javascript', 'python'],
    parallel: true,
    verbose: false
  });

  const results = await harness.runValidationOnly();

  for (const [language, testResults] of results) {
    const passed = testResults.filter(r => r.success).length;
    console.log(`${language}: ${passed}/${testResults.length} tests passed`);
  }

  return results;
}

/**
 * Example 3: Performance benchmarking
 */
async function runPerformanceBenchmarks() {
  console.log('⚡ Running performance benchmarks...');

  const benchmark = new PerformanceBenchmark({
    iterations: 20,
    memoryProfiling: true,
    reportDir: './benchmark-reports'
  });

  // This would typically be called by the TestHarness
  // but can be used standalone for focused performance testing

  console.log('Performance benchmarking setup complete');
  console.log('Use TestHarness.runBenchmarksOnly() for full execution');
}

/**
 * Example 4: Golden file management
 */
async function manageGoldenFiles() {
  console.log('🏆 Managing golden files...');

  const goldenManager = new GoldenFileManager({
    goldenDir: './test-fixtures/golden',
    version: '2.0.0',
    autoUpdate: false,
    preserveHistory: true
  });

  // List existing golden files
  const goldenFiles = goldenManager.listGoldenFiles();
  console.log(`Found ${goldenFiles.length} golden files`);

  for (const file of goldenFiles.slice(0, 5)) { // Show first 5
    console.log(`  - ${file.language}/${file.testCase} (${file.lastModified.toISOString()})`);
  }

  return goldenFiles;
}

/**
 * Example 5: Custom regression testing
 */
async function runCustomRegressionTests() {
  console.log('🔄 Running custom regression tests...');

  const regressionSuite = new RegressionSuite({
    includeEdgeCases: true,
    includeLargeFiles: true,
    includeUnicodeTests: true,
    includeMultiLanguageTests: true,
    generateDetailedReports: true
  });

  const results = await regressionSuite.runFullRegressionSuite();

  let totalRegressions = 0;
  let totalImprovements = 0;

  for (const [language, regResults] of results) {
    const regressions = regResults.filter(r => r.status === 'regression').length;
    const improvements = regResults.filter(r => r.status === 'improvement').length;

    totalRegressions += regressions;
    totalImprovements += improvements;

    if (regressions > 0 || improvements > 0) {
      console.log(`${language}: ${regressions} regressions, ${improvements} improvements`);
    }
  }

  console.log(`Total: ${totalRegressions} regressions, ${totalImprovements} improvements`);
  return results;
}

/**
 * Example 6: Individual parser testing
 */
async function testIndividualParser() {
  console.log('🎯 Testing individual parser...');

  const testRunner = new ParserTestRunner({
    parallel: false,
    verbose: true,
    memoryProfiling: true
  });

  // Create a simple test case
  const testCase = {
    name: 'simple-function',
    description: 'Simple function parsing test',
    filePath: 'test.js',
    content: 'function hello(name) { return `Hello, ${name}!`; }',
    language: 'javascript',
    tags: ['function', 'template-literal']
  };

  // This would typically be part of a test suite
  console.log('Individual parser test setup complete');
  console.log('Test case created:', testCase.name);
}

/**
 * Example 7: Generate test reports
 */
async function generateCustomReports() {
  console.log('📊 Generating custom reports...');

  // Run a focused test suite
  const harness = new TestHarness({
    includeLanguages: ['javascript'],
    enableBenchmarks: true,
    generateReport: true,
    reportDir: './custom-reports'
  });

  const results = await harness.runComplete();

  // Generate custom analysis
  console.log('\n📈 Custom Analysis:');
  console.log('==================');

  for (const [language, testResults] of results.validationResults) {
    const totalDuration = testResults.reduce((sum, r) => sum + r.duration, 0);
    const avgDuration = totalDuration / testResults.length;
    const maxDuration = Math.max(...testResults.map(r => r.duration));

    console.log(`${language} Performance:`);
    console.log(`  - Average test duration: ${avgDuration.toFixed(2)}ms`);
    console.log(`  - Slowest test: ${maxDuration.toFixed(2)}ms`);
    console.log(`  - Total test time: ${totalDuration.toFixed(2)}ms`);
  }

  return results;
}

/**
 * Main example runner
 */
async function main() {
  const examples = [
    { name: 'Complete Test Suite', fn: runCompleteTestSuite },
    { name: 'Language-Specific Tests', fn: runLanguageSpecificTests },
    { name: 'Performance Benchmarks', fn: runPerformanceBenchmarks },
    { name: 'Golden File Management', fn: manageGoldenFiles },
    { name: 'Custom Regression Tests', fn: runCustomRegressionTests },
    { name: 'Individual Parser Testing', fn: testIndividualParser },
    { name: 'Custom Reports', fn: generateCustomReports }
  ];

  console.log('🎮 Test Harness Examples');
  console.log('========================');
  console.log('Available examples:');
  examples.forEach((example, index) => {
    console.log(`${index + 1}. ${example.name}`);
  });

  // Get example to run from command line argument
  const exampleIndex = parseInt(process.argv[2]) || 1;
  const selectedExample = examples[exampleIndex - 1];

  if (!selectedExample) {
    console.error(`Invalid example index: ${exampleIndex}`);
    console.log(`Please choose 1-${examples.length}`);
    process.exit(1);
  }

  console.log(`\n🏃‍♂️ Running: ${selectedExample.name}`);
  console.log('='.repeat(50));

  try {
    await selectedExample.fn();
    console.log('\n✅ Example completed successfully!');
  } catch (error) {
    console.error('\n❌ Example failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export functions for programmatic use
export {
  runCompleteTestSuite,
  runLanguageSpecificTests,
  runPerformanceBenchmarks,
  manageGoldenFiles,
  runCustomRegressionTests,
  testIndividualParser,
  generateCustomReports
};