# Parser Test Harness

A comprehensive test harness for validating all parsers in the Parser Stack Overhaul project. This harness provides automated validation, performance benchmarking, regression testing, and golden file management.

## Features

### 🔍 Parser Validation
- Automated testing of all language parsers
- Component and relationship extraction validation
- Error handling and edge case testing
- Parallel test execution for performance

### 🏆 Golden File Management
- Generate expected outputs for test cases
- Store and retrieve golden files with versioning
- Automatic checksum verification
- Update mechanisms for improved parsers

### ⚡ Performance Benchmarking
- Measure parsing speed for each language
- Memory usage tracking and profiling
- Throughput and latency metrics
- Performance regression detection

### 🔄 Regression Testing
- Comprehensive test suite for all edge cases
- Large file handling validation
- Unicode and special character support
- Multi-language file testing (HTML with JS/CSS)

## Quick Start

```bash
# Run the complete test suite
npm run test:harness

# Run only validation tests
npm run test:harness:validation

# Run performance benchmarks
npm run test:harness:benchmarks

# Run regression tests
npm run test:harness:regression

# Generate golden files
npm run test:harness:golden
```

## Usage Examples

### Basic Validation
```bash
# Test all parsers
npm run test:harness:validation

# Test specific languages
npm run test:harness -- --languages javascript,python

# Exclude specific languages
npm run test:harness -- --exclude java,php
```

### Performance Testing
```bash
# Run benchmarks with custom iterations
npm run test:harness:benchmarks -- --iterations 20

# Test only JavaScript parser performance
npm run test:harness:js -- --mode benchmarks
```

### Golden File Management
```bash
# Generate golden files for all tests
npm run test:harness:golden

# Update existing golden files
npm run test:harness:update
```

### Advanced Options
```bash
# Run in verbose mode
npm run test:harness -- --verbose

# Sequential execution (no parallel)
npm run test:harness -- --no-parallel

# Custom report directory
npm run test:harness -- --report-dir ./custom-reports
```

## Command Line Options

| Option | Short | Description |
|--------|-------|-------------|
| `--mode` | `-m` | Test mode: complete, validation, benchmarks, regression, golden |
| `--languages` | `-l` | Comma-separated list of languages to test |
| `--exclude` | `-e` | Comma-separated list of languages to exclude |
| `--parallel` | `-p` | Run tests in parallel (default: true) |
| `--no-parallel` | | Run tests sequentially |
| `--verbose` | `-v` | Enable verbose output |
| `--update-golden` | `-u` | Update golden files |
| `--report-dir` | `-r` | Output directory for reports |
| `--iterations` | `-i` | Number of benchmark iterations (default: 10) |
| `--help` | `-h` | Show help message |

## Architecture

### Core Components

1. **ParserTestRunner** - Main test execution engine
   - Validates parser outputs against expected results
   - Supports parallel and sequential execution
   - Provides detailed diff reporting

2. **GoldenFileManager** - Test fixture management
   - Generates and stores expected test outputs
   - Version tracking and migration support
   - Checksum verification for integrity

3. **PerformanceBenchmark** - Performance testing
   - Measures parsing speed and memory usage
   - Tracks throughput and latency metrics
   - Compares against baseline performance

4. **RegressionSuite** - Comprehensive testing
   - Tests edge cases and error conditions
   - Validates large file handling
   - Supports multi-language file testing

5. **TestHarness** - Main orchestrator
   - Coordinates all testing components
   - Generates comprehensive reports
   - Provides unified CLI interface

### Test Categories

#### Basic Tests
- Standard code structure parsing
- Component extraction validation
- Relationship detection verification

#### Edge Cases
- Empty files and single characters
- Deeply nested code structures
- Very long lines of code
- Malformed syntax handling

#### Large Files
- Files ranging from 50KB to 500KB
- Performance validation for large codebases
- Memory usage optimization verification

#### Unicode Tests
- Unicode characters in identifiers
- Unicode strings and comments
- Emoji characters in code

#### Multi-Language Tests
- HTML with embedded JavaScript and CSS
- PHP with embedded HTML
- Mixed-language boundary detection

## File Structure

```
__tests__/harness/
├── README.md                   # This file
├── index.ts                    # Main exports
├── types.ts                    # Type definitions
├── cli.ts                      # Command line interface
├── TestHarness.ts             # Main orchestrator
├── ParserTestRunner.ts        # Test execution engine
├── GoldenFileManager.ts       # Golden file management
├── PerformanceBenchmark.ts    # Performance testing
└── RegressionSuite.ts         # Regression testing

__tests__/fixtures/
├── test-files/                # Test input files
│   ├── javascript/
│   ├── python/
│   ├── php/
│   └── html/
└── golden/                    # Expected outputs
    ├── javascript/
    ├── python/
    ├── php/
    └── html/
```

## Adding New Test Cases

### Manual Test Cases
Add test files to the appropriate language directory in `__tests__/fixtures/test-files/`:

```
__tests__/fixtures/test-files/javascript/my-test.js
```

### Automatic Test Generation
The harness automatically generates test cases for:
- Basic language constructs
- Edge cases and error conditions
- Unicode and special characters
- Large file scenarios

### Custom Test Fixtures
Create structured test fixtures in your test files:

```javascript
// Add descriptive comments for test categorization
/**
 * @test-category: async-functions
 * @test-complexity: medium
 * @test-features: promises, async-await, error-handling
 */
async function exampleFunction() {
  // Test implementation
}
```

## Reports and Output

### Validation Reports
- Test pass/fail status for each parser
- Detailed diff reports for failures
- Component and relationship extraction summaries

### Performance Reports
- Average, minimum, and maximum parse times
- Memory usage statistics
- Throughput metrics (characters/second, components/second)
- Performance comparison charts

### Regression Reports
- Changes in parser behavior over time
- Performance regression detection
- Improvement tracking and validation

### Combined Reports
- Comprehensive overview of all test results
- Cross-parser performance comparisons
- Trend analysis and recommendations

## Integration with CI/CD

The test harness is designed for seamless CI/CD integration:

```yaml
# Example GitHub Actions workflow
- name: Run Parser Tests
  run: |
    npm run build
    npm run test:harness:validation

- name: Performance Benchmarks
  run: npm run test:harness:benchmarks -- --iterations 5

- name: Check for Regressions
  run: npm run test:harness:regression
```

## Configuration

### Environment Variables
- `TEST_HARNESS_PARALLEL` - Enable/disable parallel execution
- `TEST_HARNESS_ITERATIONS` - Default benchmark iterations
- `TEST_HARNESS_REPORT_DIR` - Default report directory

### Custom Configuration
Create a `test-harness.config.js` file for advanced configuration:

```javascript
export default {
  timeout: 60000,
  parallel: true,
  maxConcurrency: 8,
  enableBenchmarks: true,
  benchmarkIterations: 20,
  memoryProfiling: true,
  reportFormat: 'html'
};
```

## Troubleshooting

### Common Issues

1. **Tests timing out**
   - Increase timeout: `--timeout 60000`
   - Run sequentially: `--no-parallel`

2. **Memory issues with large files**
   - Reduce concurrency: `--max-concurrency 2`
   - Disable memory profiling

3. **Golden file mismatches**
   - Update golden files: `--update-golden`
   - Check for parser improvements

### Debug Mode
Enable verbose logging for detailed debugging:

```bash
npm run test:harness -- --verbose
```

## Contributing

When adding new parsers or modifying existing ones:

1. Run the full test suite to ensure no regressions
2. Add appropriate test cases for new language features
3. Update golden files if parser output has legitimately improved
4. Add performance benchmarks for new parsers

## License

This test harness is part of the Parser Stack Overhaul project and follows the same licensing terms.