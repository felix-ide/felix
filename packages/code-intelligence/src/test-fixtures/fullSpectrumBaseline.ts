import { ParserFactory } from '../code-parser/ParserFactory.js';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import { join } from 'path';
import { readFile, writeFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';

interface Totals {
  totalFiles: number;
  totalComponents: number;
  totalRelationships: number;
}

interface Metrics {
  fixtureVersion: string;
  generatedAt: string;
  totals: Totals;
  componentsByLanguage: Record<string, number>;
  componentsByType: Record<string, number>;
  relationshipsByType: Record<string, number>;
  files: Array<{
    file: string;
    components: number;
    relationships: number;
    processingTimeMs: number;
    languagesDetected: string[];
  }>;
  phaseTotals: {
    processingTimeMs: number;
  };
}

interface FileSnapshot {
  file: string;
  components: number;
  relationships: number;
  languagesDetected: string[];
}

interface ComparableMetrics {
  fixtureVersion: string;
  totals: Totals;
  componentsByLanguage: Record<string, number>;
  componentsByType: Record<string, number>;
  relationshipsByType: Record<string, number>;
  files: FileSnapshot[];
  phaseTotals: {
    processingTimeMs: number;
  };
}

const EXPECTED_METRICS: ComparableMetrics = {
  fixtureVersion: '1.0.0',
  totals: {
    totalFiles: 26,
    totalComponents: 213,
    totalRelationships: 396
  },
  componentsByLanguage: {
    css: 14,
    html: 3,
    java: 11,
    javascript: 54,
    json: 15,
    markdown: 45,
    mermaid: 1,
    php: 22,
    python: 47,
    text: 1
  },
  componentsByType: {
    class: 19,
    comment: 11,
    constructor: 1,
    embedded_script: 2,
    enum: 1,
    file: 25,
    function: 40,
    import: 22,
    interface: 9,
    method: 15,
    module: 4,
    namespace: 5,
    property: 17,
    section: 22,
    typedef: 2,
    variable: 18
  },
  relationshipsByType: {
    REFERENCES_FILE: 13,
    belongs_to: 1,
    calls: 29,
    'class-contains-method': 13,
    'class-contains-property': 4,
    contains: 171,
    exports: 1,
    extends: 3,
    flows_to: 1,
    implements: 5,
    imports_from: 27,
    in_namespace: 23,
    uses: 105
  },
  files: [
    { file: 'baseline-metrics.json', components: 9, relationships: 8, languagesDetected: ['json'] },
    { file: 'COVERAGE.md', components: 6, relationships: 5, languagesDetected: ['markdown'] },
    { file: 'docs/architecture.md', components: 0, relationships: 2, languagesDetected: ['index', 'mermaid'] },
    { file: 'docs/runbook.md', components: 14, relationships: 13, languagesDetected: ['json', 'mermaid'] },
    { file: 'README.md', components: 18, relationships: 18, languagesDetected: ['markdown'] },
    { file: 'src/css/reset.css', components: 2, relationships: 1, languagesDetected: ['css'] },
    { file: 'src/css/styles.css', components: 12, relationships: 12, languagesDetected: ['css'] },
    { file: 'src/html/index.html', components: 5, relationships: 7, languagesDetected: ['javascript'] },
    { file: 'src/java/src/app/GraphProcessor.java', components: 3, relationships: 3, languagesDetected: ['java'] },
    { file: 'src/java/src/app/Main.java', components: 8, relationships: 11, languagesDetected: ['java'] },
    { file: 'src/javascript/component.ts', components: 29, relationships: 57, languagesDetected: ['javascript'] },
    { file: 'src/javascript/main.js', components: 8, relationships: 37, languagesDetected: ['javascript'] },
    { file: 'src/javascript/utilities.js', components: 8, relationships: 24, languagesDetected: ['javascript'] },
    { file: 'src/javascript/widget.jsx', components: 4, relationships: 19, languagesDetected: ['javascript'] },
    { file: 'src/json/config.json', components: 5, relationships: 4, languagesDetected: ['json'] },
    { file: 'src/php_bridge.py', components: 3, relationships: 3, languagesDetected: ['python'] },
    { file: 'src/php/index.php', components: 7, relationships: 17, languagesDetected: ['javascript', 'php'] },
    { file: 'src/php/services/EmailService.php', components: 7, relationships: 19, languagesDetected: ['php'] },
    { file: 'src/php/services/NotifierInterface.php', components: 3, relationships: 4, languagesDetected: ['php'] },
    { file: 'src/php/templates/dashboard.php', components: 5, relationships: 8, languagesDetected: ['javascript'] },
    { file: 'src/python-bridge.js', components: 2, relationships: 3, languagesDetected: ['javascript'] },
    { file: 'src/python/app.py', components: 18, relationships: 55, languagesDetected: ['python'] },
    { file: 'src/python/async_worker.py', components: 7, relationships: 10, languagesDetected: ['python'] },
    { file: 'src/python/utils/graph.py', components: 19, relationships: 47, languagesDetected: ['python'] },
    { file: 'src/sql/schema.sql', components: 1, relationships: 0, languagesDetected: [] },
    { file: 'testdata/mixed.md', components: 10, relationships: 9, languagesDetected: ['markdown'] }
  ],
  phaseTotals: {
    processingTimeMs: 350
  }
};

const PHASE_TIME_TOLERANCE_MS = 120;

const fixtureRoot = fileURLToPath(new URL('../../test-fixtures/full-spectrum-project', import.meta.url));
const supportRoot = join(fixtureRoot, '..', 'full-spectrum-support');
const baselinePath = join(supportRoot, 'baseline-metrics.json');
const fixtureVersion = '1.0.0';

async function computeMetrics(): Promise<Metrics> {
  const factory = new ParserFactory();
  const pattern = '**/*.{md,markdown,js,ts,tsx,jsx,py,php,html,css,scss,sql,json,java}';
  const files = (await glob(pattern, { cwd: fixtureRoot, nodir: true })).sort();

  const totals: Totals = {
    totalFiles: files.length,
    totalComponents: 0,
    totalRelationships: 0
  };

  const componentsByLanguage: Record<string, number> = {};
  const componentsByType: Record<string, number> = {};
  const relationshipsByType: Record<string, number> = {};
  const filesMetrics: Metrics['files'] = [];

  let processingTimeMs = 0;

  for (const file of files) {
    const absolutePath = join(fixtureRoot, file);
    const result = await factory.parseDocument(absolutePath, undefined, {
      workspaceRoot: fixtureRoot
    });

    totals.totalComponents += result.components.length;
    totals.totalRelationships += result.relationships.length;

    processingTimeMs += result.metadata.processingTimeMs ?? 0;

    for (const component of result.components) {
      const language = component.language || 'unknown';
      incrementCount(componentsByLanguage, language);

      const type = component.type || 'unknown';
      incrementCount(componentsByType, type);
    }

    for (const relationship of result.relationships) {
      const type = relationship.type || 'unknown';
      incrementCount(relationshipsByType, type);
    }

    const languagesDetected = Array.isArray(result.metadata.languagesDetected)
      ? result.metadata.languagesDetected.slice().sort()
      : [];

    filesMetrics.push({
      file: file.replace(/\\/g, '/'),
      components: result.components.length,
      relationships: result.relationships.length,
      processingTimeMs: result.metadata.processingTimeMs ?? 0,
      languagesDetected
    });
  }

  filesMetrics.sort((a, b) => a.file.localeCompare(b.file));

  return {
    fixtureVersion,
    generatedAt: new Date().toISOString(),
    totals,
    componentsByLanguage: sortObjectKeys(componentsByLanguage),
    componentsByType: sortObjectKeys(componentsByType),
    relationshipsByType: sortObjectKeys(relationshipsByType),
    files: filesMetrics,
    phaseTotals: {
      processingTimeMs
    }
  };
}

function sortObjectKeys(input: Record<string, number>): Record<string, number> {
  const sorted: Record<string, number> = {};
  for (const key of Object.keys(input).sort()) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) continue;
    sorted[key] = input[key];
  }
  return sorted;
}

function incrementCount(map: Record<string, number>, key: string): void {
  const previous = Object.prototype.hasOwnProperty.call(map, key) ? map[key] : 0;
  map[key] = previous + 1;
}

function stripNonComparable(metrics: Metrics): ComparableMetrics {
  return {
    fixtureVersion: metrics.fixtureVersion,
    totals: metrics.totals,
    componentsByLanguage: sortObjectKeys(metrics.componentsByLanguage),
    componentsByType: sortObjectKeys(metrics.componentsByType),
    relationshipsByType: sortObjectKeys(metrics.relationshipsByType),
    files: metrics.files
      .map(({ file, components, relationships, languagesDetected }) => ({
        file,
        components,
        relationships,
        languagesDetected: [...languagesDetected].sort()
      }))
      .sort((a, b) => a.file.localeCompare(b.file)),
    phaseTotals: {
      processingTimeMs: metrics.phaseTotals.processingTimeMs
    }
  };
}

function formatDiff(current: ComparableMetrics, expected: ComparableMetrics): string {
  const messages: string[] = [];

  if (current.fixtureVersion !== expected.fixtureVersion) {
    messages.push(`fixtureVersion expected ${expected.fixtureVersion} but got ${current.fixtureVersion}`);
  }

  if (current.totals.totalComponents !== expected.totals.totalComponents) {
    messages.push(`totalComponents expected ${expected.totals.totalComponents} but got ${current.totals.totalComponents}`);
  }
  if (current.totals.totalRelationships !== expected.totals.totalRelationships) {
    messages.push(`totalRelationships expected ${expected.totals.totalRelationships} but got ${current.totals.totalRelationships}`);
  }
  if (current.totals.totalFiles !== expected.totals.totalFiles) {
    messages.push(`totalFiles expected ${expected.totals.totalFiles} but got ${current.totals.totalFiles}`);
  }

  const languageKeys = new Set([...Object.keys(expected.componentsByLanguage), ...Object.keys(current.componentsByLanguage)]);
  for (const language of languageKeys) {
    const expectedValue = expected.componentsByLanguage[language] ?? 0;
    const actualValue = current.componentsByLanguage[language] ?? 0;
    if (expectedValue !== actualValue) {
      messages.push(`componentsByLanguage.${language} expected ${expectedValue} but got ${actualValue}`);
    }
  }

  const typeKeys = new Set([...Object.keys(expected.componentsByType), ...Object.keys(current.componentsByType)]);
  for (const type of typeKeys) {
    const expectedValue = expected.componentsByType[type] ?? 0;
    const actualValue = current.componentsByType[type] ?? 0;
    if (expectedValue !== actualValue) {
      messages.push(`componentsByType.${type} expected ${expectedValue} but got ${actualValue}`);
    }
  }

  const relationshipKeys = new Set([...Object.keys(expected.relationshipsByType), ...Object.keys(current.relationshipsByType)]);
  for (const type of relationshipKeys) {
    const expectedValue = expected.relationshipsByType[type] ?? 0;
    const actualValue = current.relationshipsByType[type] ?? 0;
    if (expectedValue !== actualValue) {
      messages.push(`relationshipsByType.${type} expected ${expectedValue} but got ${actualValue}`);
    }
  }

  const expectedFiles = new Map<string, FileSnapshot>(expected.files.map(entry => [entry.file, entry]));
  const currentFiles = new Map<string, FileSnapshot>(current.files.map(entry => [entry.file, entry]));

  for (const [file, expectedEntry] of expectedFiles.entries()) {
    const actualEntry = currentFiles.get(file);
    if (!actualEntry) {
      messages.push(`file ${file} missing (expected components ${expectedEntry.components})`);
      continue;
    }

    if (expectedEntry.components !== actualEntry.components) {
      messages.push(`file ${file} components expected ${expectedEntry.components} but got ${actualEntry.components}`);
    }
    if (expectedEntry.relationships !== actualEntry.relationships) {
      messages.push(`file ${file} relationships expected ${expectedEntry.relationships} but got ${actualEntry.relationships}`);
    }
    const expectedLanguages = expectedEntry.languagesDetected.join(',');
    const actualLanguages = actualEntry.languagesDetected.join(',');
    if (expectedLanguages !== actualLanguages) {
      messages.push(`file ${file} languages expected [${expectedLanguages}] but got [${actualLanguages}]`);
    }
    currentFiles.delete(file);
  }

  for (const file of currentFiles.keys()) {
    messages.push(`file ${file} unexpected in results`);
  }

  const expectedPhase = expected.phaseTotals.processingTimeMs;
  const actualPhase = current.phaseTotals.processingTimeMs;
  if (Math.abs(actualPhase - expectedPhase) > PHASE_TIME_TOLERANCE_MS) {
    messages.push(`phaseTotals.processingTimeMs expected ~${expectedPhase}±${PHASE_TIME_TOLERANCE_MS} but got ${actualPhase}`);
  }

  return messages.join('\n');
}

async function main() {
  const mode = process.argv[2] ?? 'verify';
  const metrics = await computeMetrics();
  const comparableCurrent = stripNonComparable(metrics);
  const diff = formatDiff(comparableCurrent, EXPECTED_METRICS);

  if (mode === 'update') {
    if (!existsSync(supportRoot)) {
      mkdirSync(supportRoot, { recursive: true });
    }
    await writeFile(baselinePath, JSON.stringify(metrics, null, 2) + '\n', 'utf-8');
    if (diff) {
      console.warn('Baseline file updated, but metrics differ from EXPECTED_METRICS. Update the constant before committing.');
      console.warn(diff);
    } else {
      console.log(`Baseline metrics updated at ${baselinePath}`);
    }
    process.exit(0);
  }

  if (diff) {
    console.error('Fixture metrics diverge from expected values.');
    console.error(diff);
    console.error('If this change is intentional, update EXPECTED_METRICS and rerun the baseline updater.');
    process.exit(1);
  }

  if (existsSync(baselinePath)) {
    const baselineRaw = await readFile(baselinePath, 'utf-8');
    const baselineComparable = stripNonComparable(JSON.parse(baselineRaw));
    const baselineDiff = formatDiff(baselineComparable, EXPECTED_METRICS);
    if (baselineDiff) {
      console.warn('baseline-metrics.json is stale relative to EXPECTED_METRICS. Run the update command to refresh it.');
      console.warn(baselineDiff);
    }
  } else {
    console.warn('baseline-metrics.json not found. Run "npm -w @felix/code-intelligence run baseline:update" to generate it.');
  }

  console.log('Fixture metrics match EXPECTED_METRICS.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Failed to evaluate fixture baseline:', error);
  process.exit(1);
});
