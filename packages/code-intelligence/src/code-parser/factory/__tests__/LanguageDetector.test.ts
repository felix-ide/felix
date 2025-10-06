import { describe, expect, it } from '@jest/globals';
import type { ILanguageParser } from '../../interfaces/ILanguageParser.js';
import { LanguageDetector, type LanguageDetectorDeps } from '../LanguageDetector.js';

describe('LanguageDetector', () => {
  const createStubParser = (language: string, extensions: string[] = [], options: { validate?: (content: string) => boolean } = {}) => {
    const parser: Partial<ILanguageParser> = {
      language,
      getSupportedExtensions: () => extensions,
      getIgnorePatterns: () => [],
      parseContent: async () => ({ components: [], relationships: [], metadata: {} as any }),
      validateContent: options.validate,
    };
    return parser as ILanguageParser;
  };

  const setup = (overrides: Partial<{ deps: LanguageDetectorDeps; extensionMap: Map<string, string>; shebangMap: Map<string, string>; filenameMap: Map<string, string> }> = {}) => {
    const extensionMap = overrides.extensionMap ?? new Map<string, string>();
    const shebangMap = overrides.shebangMap ?? new Map<string, string>();
    const filenameMap = overrides.filenameMap ?? new Map<string, string>();

    const primary = new Map<string, ILanguageParser>();
    const fallback = new Map<string, ILanguageParser>();

    const deps: LanguageDetectorDeps = overrides.deps ?? {
      getPrimaryParser: (language) => primary.get(language),
      getFallbackParser: (language) => fallback.get(language),
    };

    return {
      detector: new LanguageDetector(deps, extensionMap, shebangMap, filenameMap),
      primary,
      fallback,
      extensionMap,
      shebangMap,
      filenameMap,
    };
  };

  it('detects language via extension using the primary parser', () => {
    const { detector, primary, extensionMap } = setup();
    extensionMap.set('.ts', 'typescript');
    primary.set('typescript', createStubParser('typescript', ['.ts']));

    const result = detector.detectLanguage('/workspace/src/index.ts', 'const answer: number = 42;');
    expect(result).not.toBeNull();
    expect(result?.language).toBe('typescript');
    expect(result?.detectionMethod).toBe('extension');
  });

  it('falls back to secondary parser when no primary parser exists', () => {
    const { detector, fallback, extensionMap } = setup();
    extensionMap.set('.rs', 'rust');
    fallback.set('rust', createStubParser('rust', ['.rs']));

    const result = detector.detectLanguage('crates/lib.rs', 'fn main() { println!("hi"); }');
    expect(result).not.toBeNull();
    expect(result?.language).toBe('rust');
    expect(result?.parser.language).toBe('rust');
  });

  it('ignores files in node_modules by default', () => {
    const { detector, primary, extensionMap } = setup();
    extensionMap.set('.js', 'javascript');
    primary.set('javascript', createStubParser('javascript', ['.js']));

    const result = detector.detectLanguage('/workspace/node_modules/react/index.js', 'module.exports = {}');
    expect(result).toBeNull();
  });

  it('detects json content via validation when extension is ambiguous', () => {
    const { detector, primary } = setup();
    primary.set('json', createStubParser('json', [], { validate: (content) => content.trim().startsWith('{') }));

    const result = detector.detectLanguage('/tmp/config.json', '{ "foo": true }');
    expect(result).not.toBeNull();
    expect(result?.language).toBe('json');
    expect(result?.detectionMethod).toBe('content');
  });

  it('detects primary language using extension preference', () => {
    const { detector, primary, extensionMap } = setup();
    extensionMap.set('.py', 'python');
    primary.set('python', createStubParser('python', ['.py']));

    const language = detector.detectPrimaryLanguage('/workspace/app.py', 'print("hi")');
    expect(language).toBe('python');
  });

  it('reports language info and supports canParseFile helper', () => {
    const { detector, primary, extensionMap } = setup();
    extensionMap.set('.php', 'php');
    primary.set('php', createStubParser('php', ['.php']));

    expect(detector.canParseFile('src/server.php')).toBe(true);
    const info = detector.getLanguageInfo('src/server.php');
    expect(info).toEqual({ language: 'php', confidence: expect.any(Number), method: expect.any(String) });
  });
});
