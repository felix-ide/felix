/**
 * RegressionSuite - Comprehensive regression testing for parser validation
 *
 * Features:
 * - Test each parser with various code samples
 * - Edge cases and error conditions
 * - Multi-language files (HTML with embedded JS/CSS)
 * - Large file handling
 * - Unicode and special characters
 * - Regression detection and reporting
 * - Comparison with previous versions
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, extname, basename } from 'path';
import type { ILanguageParser } from '../../interfaces/ILanguageParser.js';
import { ParserFactory } from '../../ParserFactory.js';
import { ParserTestRunner } from './ParserTestRunner.js';
import { GoldenFileManager } from './GoldenFileManager.js';
import { PerformanceBenchmark } from './PerformanceBenchmark.js';
import type {
  TestCase,
  TestResult,
  RegressionTestResult,
  RegressionIssue,
  RegressionImprovement,
  TestFixture,
  TestHarnessOptions
} from './types.js';

/**
 * Regression testing configuration
 */
export interface RegressionSuiteOptions {
  testDataDir: string;
  baselineDir: string;
  reportDir: string;
  includePerformanceTests: boolean;
  includeEdgeCases: boolean;
  includeLargeFiles: boolean;
  includeUnicodeTests: boolean;
  includeMultiLanguageTests: boolean;
  regressionThreshold: number;
  performanceRegressionThreshold: number;
  generateDetailedReports: boolean;
}

/**
 * Test category for organizing regression tests
 */
type TestCategory =
  | 'basic'
  | 'edge-cases'
  | 'large-files'
  | 'unicode'
  | 'multi-language'
  | 'performance'
  | 'error-handling'
  | 'malformed-syntax';

/**
 * Comprehensive regression test suite
 */
export class RegressionSuite {
  private options: RegressionSuiteOptions;
  private parserFactory: ParserFactory;
  private testRunner: ParserTestRunner;
  private goldenFileManager: GoldenFileManager;
  private performanceBenchmark: PerformanceBenchmark;

  constructor(options: Partial<RegressionSuiteOptions> = {}) {
    this.options = {
      testDataDir: join(process.cwd(), '__tests__', 'fixtures', 'regression'),
      baselineDir: join(process.cwd(), '__tests__', 'baselines'),
      reportDir: join(process.cwd(), 'regression-reports'),
      includePerformanceTests: true,
      includeEdgeCases: true,
      includeLargeFiles: true,
      includeUnicodeTests: true,
      includeMultiLanguageTests: true,
      regressionThreshold: 0.1, // 10% change threshold
      performanceRegressionThreshold: 0.2, // 20% performance degradation
      generateDetailedReports: true,
      ...options
    };

    this.parserFactory = new ParserFactory();
    this.testRunner = new ParserTestRunner({
      parallel: true,
      memoryProfiling: true,
      enableBenchmarks: this.options.includePerformanceTests
    });
    this.goldenFileManager = new GoldenFileManager({
      goldenDir: join(this.options.baselineDir, 'golden')
    });
    this.performanceBenchmark = new PerformanceBenchmark({
      reportDir: join(this.options.reportDir, 'performance')
    });

    this.ensureDirectories();
  }

  /**
   * Run full regression test suite for all parsers
   */
  async runFullRegressionSuite(): Promise<Map<string, RegressionTestResult[]>> {
    console.log('Starting comprehensive regression test suite...');

    const results = new Map<string, RegressionTestResult[]>();
    const supportedLanguages = this.getSupportedLanguages();

    for (const language of supportedLanguages) {
      console.log(`\nRunning regression tests for ${language}...`);

      const languageResults = await this.runLanguageRegressionTests(language);
      results.set(language, languageResults);

      this.logLanguageSummary(language, languageResults);
    }

    // Generate comprehensive report
    await this.generateRegressionReport(results);

    return results;
  }

  /**
   * Run regression tests for a specific language
   */
  async runLanguageRegressionTests(language: string): Promise<RegressionTestResult[]> {
    const parser = this.getParserForLanguage(language);
    if (!parser) {
      console.warn(`No parser found for language: ${language}`);
      return [];
    }

    // Generate test cases for all categories
    const testCases = await this.generateTestCases(language);
    console.log(`Generated ${testCases.length} test cases for ${language}`);

    const results: RegressionTestResult[] = [];

    // Run tests and compare with baselines
    for (const testCase of testCases) {
      const result = await this.runRegressionTest(testCase, parser);
      results.push(result);
    }

    return results;
  }

  /**
   * Generate test cases for all regression categories
   */
  async generateTestCases(language: string): Promise<TestCase[]> {
    const testCases: TestCase[] = [];

    // Basic test cases
    testCases.push(...await this.generateBasicTestCases(language));

    // Edge cases
    if (this.options.includeEdgeCases) {
      testCases.push(...await this.generateEdgeCaseTestCases(language));
    }

    // Large files
    if (this.options.includeLargeFiles) {
      testCases.push(...await this.generateLargeFileTestCases(language));
    }

    // Unicode tests
    if (this.options.includeUnicodeTests) {
      testCases.push(...await this.generateUnicodeTestCases(language));
    }

    // Multi-language tests
    if (this.options.includeMultiLanguageTests) {
      testCases.push(...await this.generateMultiLanguageTestCases(language));
    }

    return testCases;
  }

  /**
   * Run a single regression test
   */
  private async runRegressionTest(
    testCase: TestCase,
    parser: ILanguageParser
  ): Promise<RegressionTestResult> {
    // Run the test
    const currentResult = await this.testRunner.runTestCase(testCase, parser);

    // Load baseline/golden file
    const goldenFile = await this.goldenFileManager.loadGoldenFile(
      testCase.name,
      testCase.language
    );

    // Compare results
    const regressions: RegressionIssue[] = [];
    const improvements: RegressionImprovement[] = [];

    if (goldenFile) {
      const diffs = await this.goldenFileManager.compareWithGoldenFile(currentResult, goldenFile);

      // Analyze diffs for regressions and improvements
      for (const diff of diffs) {
        if (this.isDiffRegression(diff)) {
          regressions.push(this.convertDiffToRegression(diff));
        } else if (this.isDiffImprovement(diff)) {
          improvements.push(this.convertDiffToImprovement(diff));
        }
      }
    }

    // Determine overall status
    let status: RegressionTestResult['status'];
    if (!goldenFile) {
      status = 'new';
    } else if (regressions.length > 0) {
      status = 'regression';
    } else if (improvements.length > 0) {
      status = 'improvement';
    } else if (currentResult.success) {
      status = 'pass';
    } else {
      status = 'fail';
    }

    return {
      testCase: testCase.name,
      language: testCase.language,
      current: currentResult,
      goldenFile: goldenFile || undefined,
      regressions,
      improvements,
      status
    };
  }

  // Test case generation methods

  private async generateBasicTestCases(language: string): Promise<TestCase[]> {
    const testCases: TestCase[] = [];
    const fixtures = this.loadTestFixtures(language, 'basic');

    for (const fixture of fixtures) {
      testCases.push({
        name: `basic-${fixture.name}`,
        description: `Basic parsing test for ${fixture.name}`,
        filePath: fixture.filePath,
        content: fixture.content,
        language: fixture.language,
        tags: ['basic', 'regression']
      });
    }

    // Generate synthetic basic test cases if no fixtures found
    if (testCases.length === 0) {
      testCases.push(...this.generateSyntheticBasicTestCases(language));
    }

    return testCases;
  }

  private async generateEdgeCaseTestCases(language: string): Promise<TestCase[]> {
    const testCases: TestCase[] = [];

    // Empty file
    testCases.push({
      name: `edge-empty-file-${language}`,
      description: 'Empty file parsing',
      filePath: `empty.${this.getExtensionForLanguage(language)}`,
      content: '',
      language,
      tags: ['edge-case', 'regression']
    });

    // Single character
    testCases.push({
      name: `edge-single-char-${language}`,
      description: 'Single character file',
      filePath: `single.${this.getExtensionForLanguage(language)}`,
      content: 'a',
      language,
      tags: ['edge-case', 'regression']
    });

    // Deeply nested structures
    testCases.push({
      name: `edge-deep-nesting-${language}`,
      description: 'Deeply nested code structures',
      filePath: `deep.${this.getExtensionForLanguage(language)}`,
      content: this.generateDeeplyNestedCode(language),
      language,
      tags: ['edge-case', 'regression']
    });

    // Very long lines
    testCases.push({
      name: `edge-long-lines-${language}`,
      description: 'Very long lines of code',
      filePath: `longlines.${this.getExtensionForLanguage(language)}`,
      content: this.generateLongLinesCode(language),
      language,
      tags: ['edge-case', 'regression']
    });

    // Malformed syntax
    testCases.push({
      name: `edge-malformed-${language}`,
      description: 'Malformed syntax handling',
      filePath: `malformed.${this.getExtensionForLanguage(language)}`,
      content: this.generateMalformedCode(language),
      language,
      tags: ['edge-case', 'regression', 'error-handling']
    });

    return testCases;
  }

  private async generateLargeFileTestCases(language: string): Promise<TestCase[]> {
    const testCases: TestCase[] = [];

    // Generate large files of different sizes
    const sizes = [50_000, 100_000, 500_000]; // 50KB, 100KB, 500KB

    for (const size of sizes) {
      testCases.push({
        name: `large-${size}-${language}`,
        description: `Large file parsing (${size} chars)`,
        filePath: `large-${size}.${this.getExtensionForLanguage(language)}`,
        content: this.generateLargeFileContent(language, size),
        language,
        tags: ['large-file', 'regression', 'performance'],
        timeout: 60000 // 60 seconds for large files
      });
    }

    return testCases;
  }

  private async generateUnicodeTestCases(language: string): Promise<TestCase[]> {
    const testCases: TestCase[] = [];

    // Unicode identifiers
    testCases.push({
      name: `unicode-identifiers-${language}`,
      description: 'Unicode characters in identifiers',
      filePath: `unicode.${this.getExtensionForLanguage(language)}`,
      content: this.generateUnicodeIdentifiersCode(language),
      language,
      tags: ['unicode', 'regression']
    });

    // Unicode strings
    testCases.push({
      name: `unicode-strings-${language}`,
      description: 'Unicode characters in strings',
      filePath: `unicode-strings.${this.getExtensionForLanguage(language)}`,
      content: this.generateUnicodeStringsCode(language),
      language,
      tags: ['unicode', 'regression']
    });

    // Emoji in code
    testCases.push({
      name: `unicode-emoji-${language}`,
      description: 'Emoji characters in code',
      filePath: `emoji.${this.getExtensionForLanguage(language)}`,
      content: this.generateEmojiCode(language),
      language,
      tags: ['unicode', 'regression']
    });

    return testCases;
  }

  private async generateMultiLanguageTestCases(language: string): Promise<TestCase[]> {
    const testCases: TestCase[] = [];

    // Only generate multi-language tests for languages that support embedding
    if (language === 'html') {
      // HTML with embedded JavaScript and CSS
      testCases.push({
        name: 'multi-html-js-css',
        description: 'HTML with embedded JavaScript and CSS',
        filePath: 'multi.html',
        content: this.generateHtmlWithEmbeddedCode(),
        language: 'html',
        tags: ['multi-language', 'regression']
      });
    }

    if (language === 'php') {
      // PHP with embedded HTML
      testCases.push({
        name: 'multi-php-html',
        description: 'PHP with embedded HTML',
        filePath: 'multi.php',
        content: this.generatePhpWithHtml(),
        language: 'php',
        tags: ['multi-language', 'regression']
      });
    }

    return testCases;
  }

  // Code generation helpers

  private generateSyntheticBasicTestCases(language: string): TestCase[] {
    const templates = this.getBasicTemplates(language);
    return templates.map((template, index) => ({
      name: `synthetic-basic-${index}-${language}`,
      description: `Synthetic basic test case ${index}`,
      filePath: `synthetic-${index}.${this.getExtensionForLanguage(language)}`,
      content: template,
      language,
      tags: ['basic', 'synthetic', 'regression']
    }));
  }

  private getBasicTemplates(language: string): string[] {
    switch (language) {
      case 'javascript':
      case 'typescript':
        return [
          'function hello() { return "world"; }',
          'class MyClass { constructor() {} method() {} }',
          'const arrow = () => console.log("arrow");',
          'import { foo } from "./bar"; export default foo;'
        ];
      case 'python':
        return [
          'def hello():\n    return "world"',
          'class MyClass:\n    def __init__(self):\n        pass\n    def method(self):\n        pass',
          'from module import function\nfunction()',
          'x = lambda y: y * 2'
        ];
      case 'php':
        return [
          '<?php\nfunction hello() {\n    return "world";\n}',
          '<?php\nclass MyClass {\n    public function __construct() {}\n    public function method() {}\n}',
          '<?php\n$array = [1, 2, 3];\nforeach ($array as $item) { echo $item; }'
        ];
      case 'java':
        return [
          'public class Hello {\n    public static void main(String[] args) {\n        System.out.println("Hello");\n    }\n}',
          'public class MyClass {\n    private int field;\n    public MyClass() {}\n    public void method() {}\n}'
        ];
      default:
        return ['// Basic test case'];
    }
  }

  private generateDeeplyNestedCode(language: string): string {
    switch (language) {
      case 'javascript':
        return Array(50).fill(0).map((_, i) => '  '.repeat(i) + `if (condition${i}) {`).join('\n') +
               '\n' + '    console.log("deeply nested");' +
               '\n' + Array(50).fill(0).map((_, i) => '  '.repeat(49 - i) + '}').join('\n');
      case 'python':
        return Array(30).fill(0).map((_, i) => '    '.repeat(i) + `if condition${i}:`).join('\n') +
               '\n' + '    '.repeat(30) + 'print("deeply nested")';
      default:
        return '// Deeply nested code';
    }
  }

  private generateLongLinesCode(language: string): string {
    switch (language) {
      case 'javascript':
        return `const veryLongVariableName${'x'.repeat(1000)} = "very long string ${'content '.repeat(200)}";`;
      case 'python':
        return `very_long_variable_name_${'x'.repeat(1000)} = "very long string ${'content '.repeat(200)}"`;
      default:
        return `// Very long line: ${'x'.repeat(1000)}`;
    }
  }

  private generateMalformedCode(language: string): string {
    switch (language) {
      case 'javascript':
        return 'function broken( { return "missing closing paren and brace"';
      case 'python':
        return 'def broken(\n    return "missing closing paren and colon"';
      case 'php':
        return '<?php\nfunction broken( {\n    return "missing closing paren";';
      default:
        return '// Malformed code: missing syntax elements';
    }
  }

  private generateLargeFileContent(language: string, targetSize: number): string {
    const template = this.getBasicTemplates(language)[0];
    const templateSize = template.length;
    const repetitions = Math.ceil(targetSize / templateSize);

    return Array(repetitions).fill(template).join('\n\n');
  }

  private generateUnicodeIdentifiersCode(language: string): string {
    switch (language) {
      case 'javascript':
        return 'const π = 3.14159; const ñombre = "name"; const 变量 = "variable";';
      case 'python':
        return 'π = 3.14159\nñombre = "name"\n变量 = "variable"';
      default:
        return '// Unicode identifiers: π, ñombre, 变量';
    }
  }

  private generateUnicodeStringsCode(language: string): string {
    const unicodeString = '"Hello 世界! 🌍 Ñandú café"';
    switch (language) {
      case 'javascript':
        return `const message = ${unicodeString};`;
      case 'python':
        return `message = ${unicodeString}`;
      default:
        return `// Unicode string: ${unicodeString}`;
    }
  }

  private generateEmojiCode(language: string): string {
    switch (language) {
      case 'javascript':
        return 'const 🚀 = "rocket"; function 🎯() { return "target"; }';
      case 'python':
        return '🚀 = "rocket"\ndef 🎯():\n    return "target"';
      default:
        return '// Emoji: 🚀 🎯';
    }
  }

  private generateHtmlWithEmbeddedCode(): string {
    return `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial; }
        .highlight { background: yellow; }
    </style>
</head>
<body>
    <h1>Multi-language Test</h1>
    <script>
        function greet(name) {
            return "Hello, " + name;
        }
        console.log(greet("World"));
    </script>
</body>
</html>`;
  }

  private generatePhpWithHtml(): string {
    return `<?php
$name = "World";
?>
<!DOCTYPE html>
<html>
<body>
    <h1><?php echo "Hello, " . $name; ?></h1>
    <?php
    for ($i = 1; $i <= 5; $i++) {
        echo "<p>Item $i</p>";
    }
    ?>
</body>
</html>`;
  }

  // Utility methods

  private getSupportedLanguages(): string[] {
    return ['javascript', 'typescript', 'python', 'php', 'java', 'html', 'css', 'json', 'markdown'];
  }

  private getParserForLanguage(language: string): ILanguageParser | null {
    try {
      return this.parserFactory.getParser(language);
    } catch (error) {
      return null;
    }
  }

  private getExtensionForLanguage(language: string): string {
    const extensionMap: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      php: 'php',
      java: 'java',
      html: 'html',
      css: 'css',
      json: 'json',
      markdown: 'md'
    };
    return extensionMap[language] || 'txt';
  }

  private loadTestFixtures(language: string, category: string): TestFixture[] {
    const fixtureDir = join(this.options.testDataDir, language, category);
    if (!existsSync(fixtureDir)) {
      return [];
    }

    const fixtures: TestFixture[] = [];
    const files = readdirSync(fixtureDir);

    for (const file of files) {
      const filePath = join(fixtureDir, file);
      try {
        const content = readFileSync(filePath, 'utf-8');
        fixtures.push({
          name: basename(file, extname(file)),
          language,
          content,
          filePath,
          description: `Test fixture from ${file}`,
          tags: [category],
          complexity: 'medium',
          features: []
        });
      } catch (error) {
        console.warn(`Failed to load fixture ${filePath}:`, error);
      }
    }

    return fixtures;
  }

  private isDiffRegression(diff: any): boolean {
    // Simplified regression detection
    return diff.type === 'removed' || (diff.type === 'modified' && diff.category === 'component');
  }

  private isDiffImprovement(diff: any): boolean {
    // Simplified improvement detection
    return diff.type === 'added' && diff.category === 'component';
  }

  private convertDiffToRegression(diff: any): RegressionIssue {
    return {
      type: 'accuracy',
      severity: 'major',
      description: diff.description || diff.message,
      impact: 'Parser output has changed unexpectedly',
      currentValue: diff.newValue,
      expectedValue: diff.oldValue
    };
  }

  private convertDiffToImprovement(diff: any): RegressionImprovement {
    return {
      type: 'accuracy',
      description: diff.description || diff.message,
      impact: 'Parser output has improved',
      previousValue: diff.oldValue,
      currentValue: diff.newValue
    };
  }

  private ensureDirectories(): void {
    mkdirSync(this.options.testDataDir, { recursive: true });
    mkdirSync(this.options.baselineDir, { recursive: true });
    mkdirSync(this.options.reportDir, { recursive: true });
  }

  private logLanguageSummary(language: string, results: RegressionTestResult[]): void {
    const total = results.length;
    const passed = results.filter(r => r.status === 'pass').length;
    const regressions = results.filter(r => r.status === 'regression').length;
    const improvements = results.filter(r => r.status === 'improvement').length;
    const newTests = results.filter(r => r.status === 'new').length;

    console.log(`${language} Summary:`);
    console.log(`  Total: ${total}`);
    console.log(`  Passed: ${passed}`);
    console.log(`  Regressions: ${regressions}`);
    console.log(`  Improvements: ${improvements}`);
    console.log(`  New: ${newTests}`);
  }

  private async generateRegressionReport(results: Map<string, RegressionTestResult[]>): Promise<void> {
    const reportPath = join(this.options.reportDir, `regression-report-${new Date().toISOString().split('T')[0]}.md`);

    const report = [];
    report.push('# Regression Test Report');
    report.push('');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push('');

    let totalRegressions = 0;
    let totalImprovements = 0;

    for (const [language, languageResults] of results) {
      const regressions = languageResults.filter(r => r.status === 'regression').length;
      const improvements = languageResults.filter(r => r.status === 'improvement').length;

      totalRegressions += regressions;
      totalImprovements += improvements;

      report.push(`## ${language}`);
      report.push(`- Total Tests: ${languageResults.length}`);
      report.push(`- Regressions: ${regressions}`);
      report.push(`- Improvements: ${improvements}`);
      report.push('');

      if (regressions > 0) {
        report.push('### Regressions:');
        languageResults.filter(r => r.status === 'regression').forEach(result => {
          report.push(`- **${result.testCase}**: ${result.regressions.length} issues`);
        });
        report.push('');
      }
    }

    report.push('## Overall Summary');
    report.push(`- Total Regressions: ${totalRegressions}`);
    report.push(`- Total Improvements: ${totalImprovements}`);

    writeFileSync(reportPath, report.join('\n'));
    console.log(`Regression report generated: ${reportPath}`);
  }
}