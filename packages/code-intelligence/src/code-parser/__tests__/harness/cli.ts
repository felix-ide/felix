#!/usr/bin/env node

/**
 * CLI for running the parser test harness
 */

import { TestHarness } from './TestHarness.js';
import type { TestHarnessOptions } from './types.js';

interface CliOptions {
  mode: 'complete' | 'validation' | 'benchmarks' | 'regression' | 'golden';
  languages?: string[];
  exclude?: string[];
  parallel?: boolean;
  verbose?: boolean;
  updateGolden?: boolean;
  reportDir?: string;
  iterations?: number;
  help?: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    mode: 'complete'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--mode':
      case '-m':
        options.mode = args[++i] as CliOptions['mode'];
        break;

      case '--languages':
      case '-l':
        options.languages = args[++i].split(',');
        break;

      case '--exclude':
      case '-e':
        options.exclude = args[++i].split(',');
        break;

      case '--parallel':
      case '-p':
        options.parallel = true;
        break;

      case '--no-parallel':
        options.parallel = false;
        break;

      case '--verbose':
      case '-v':
        options.verbose = true;
        break;

      case '--update-golden':
      case '-u':
        options.updateGolden = true;
        break;

      case '--report-dir':
      case '-r':
        options.reportDir = args[++i];
        break;

      case '--iterations':
      case '-i':
        options.iterations = parseInt(args[++i]);
        break;

      case '--help':
      case '-h':
        options.help = true;
        break;

      default:
        console.warn(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
Parser Test Harness CLI

Usage: npm run test:harness [options]

Options:
  -m, --mode <mode>         Test mode: complete, validation, benchmarks, regression, golden
  -l, --languages <langs>   Comma-separated list of languages to test
  -e, --exclude <langs>     Comma-separated list of languages to exclude
  -p, --parallel            Run tests in parallel (default: true)
      --no-parallel         Run tests sequentially
  -v, --verbose             Enable verbose output
  -u, --update-golden       Update golden files
  -r, --report-dir <dir>    Output directory for reports
  -i, --iterations <num>    Number of benchmark iterations (default: 10)
  -h, --help               Show this help message

Examples:
  npm run test:harness                                    # Run complete test suite
  npm run test:harness -- --mode validation              # Run only validation tests
  npm run test:harness -- --mode benchmarks --iterations 20  # Run benchmarks with 20 iterations
  npm run test:harness -- --languages javascript,python  # Test only JS and Python
  npm run test:harness -- --exclude java,php             # Exclude Java and PHP
  npm run test:harness -- --update-golden                # Update golden files
`);
}

async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  console.log('🚀 Parser Test Harness CLI');
  console.log(`Mode: ${options.mode}`);

  // Convert CLI options to TestHarnessOptions
  const harnessOptions: TestHarnessOptions = {
    parallel: options.parallel ?? true,
    verbose: options.verbose ?? false,
    updateGoldenFiles: options.updateGolden ?? false,
    includeLanguages: options.languages ?? [],
    excludeLanguages: options.exclude ?? [],
    reportDir: options.reportDir,
    benchmarkIterations: options.iterations ?? 10,
    enableBenchmarks: options.mode === 'complete' || options.mode === 'benchmarks',
    enableRegressionTests: options.mode === 'complete' || options.mode === 'regression',
    generateReport: true
  };

  const harness = new TestHarness(harnessOptions);

  try {
    let results: any;

    switch (options.mode) {
      case 'complete':
        results = await harness.runComplete();
        break;

      case 'validation':
        results = await harness.runValidationOnly();
        console.log(`Validation complete. Tested ${results.size} languages.`);
        break;

      case 'benchmarks':
        results = await harness.runBenchmarksOnly();
        console.log(`Benchmarks complete. Tested ${results.size} languages.`);
        break;

      case 'regression':
        results = await harness.runRegressionsOnly();
        console.log(`Regression tests complete. Tested ${results.size} languages.`);
        break;

      case 'golden':
        await harness.generateGoldenFiles();
        console.log('Golden file generation complete.');
        break;

      default:
        console.error(`Unknown mode: ${options.mode}`);
        process.exit(1);
    }

    console.log('\n✅ Test harness completed successfully!');

  } catch (error) {
    console.error('\n❌ Test harness failed:', error);
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

export { main as runCli };