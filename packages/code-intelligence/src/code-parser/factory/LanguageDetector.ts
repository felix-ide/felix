import { extname, basename } from 'path';
import { readFileSync } from 'fs';
import type { ILanguageParser } from '../interfaces/ILanguageParser.js';

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  parser: ILanguageParser;
  detectionMethod: 'extension' | 'shebang' | 'content' | 'filename';
}

export interface LanguageDetectorDeps {
  getPrimaryParser(language: string): ILanguageParser | undefined;
  getFallbackParser(language: string): ILanguageParser | undefined;
}

export class LanguageDetector {
  constructor(
    private readonly deps: LanguageDetectorDeps,
    private readonly extensionMap: Map<string, string>,
    private readonly shebangMap: Map<string, string>,
    private readonly filenameMap: Map<string, string>
  ) {}

  detectLanguage(filePath: string, content?: string): LanguageDetectionResult | null {
    if (this.shouldIgnoreFile(filePath)) {
      return null;
    }

    const ext = extname(filePath).toLowerCase();

    if (this.isJsonLike(ext)) {
      const detection = this.detectJsonLike(filePath, content);
      if (detection) {
        return detection;
      }
    }

    if (this.isNonCodeExtension(ext)) {
      return null;
    }

    const extensionResult = this.detectByExtension(filePath, content);
    if (extensionResult) {
      return extensionResult;
    }

    const filenameResult = this.detectByFilename(filePath);
    if (filenameResult) {
      return filenameResult;
    }

    const contentForAnalysis = content ?? this.safeReadFile(filePath);
    if (!contentForAnalysis) {
      return null;
    }

    const shebangResult = this.detectByShebang(contentForAnalysis);
    if (shebangResult) {
      return shebangResult;
    }

    return this.detectByContentAnalysis(contentForAnalysis);
  }

  detectPrimaryLanguage(filePath: string, content: string): string {
    const ext = extname(filePath).toLowerCase();
    const lang = this.extensionMap.get(ext);
    if (lang) {
      return lang;
    }

    const detection = this.detectLanguage(filePath, content);
    return detection?.language ?? 'javascript';
  }

  canParseFile(filePath: string): boolean {
    return this.detectLanguage(filePath) !== null;
  }

  getLanguageInfo(filePath: string): { language: string; confidence: number; method: string } | null {
    const detection = this.detectLanguage(filePath);
    if (!detection) return null;
    return {
      language: detection.language,
      confidence: detection.confidence,
      method: detection.detectionMethod
    };
  }

  private detectByExtension(filePath: string, content?: string): LanguageDetectionResult | null {
    const extension = extname(filePath).toLowerCase();
    const language = this.extensionMap.get(extension);
    if (!language) {
      return null;
    }

    const parser = this.deps.getPrimaryParser(language);
    if (!parser) {
      const fallback = this.deps.getFallbackParser(language);
      if (!fallback) {
        return null;
      }
      return {
        language,
        confidence: 0.85,
        parser: fallback,
        detectionMethod: 'extension'
      };
    }

    const contentSample = content ?? this.safeReadFile(filePath, 1000);
    if (parser.validateContent && contentSample && !parser.validateContent(contentSample)) {
      return null;
    }

    return {
      language,
      confidence: 0.95,
      parser,
      detectionMethod: 'extension'
    };
  }

  private detectByFilename(filePath: string): LanguageDetectionResult | null {
    const filename = basename(filePath).toLowerCase();
    const language = this.filenameMap.get(filename);
    if (!language) {
      return null;
    }

    const parser = this.deps.getPrimaryParser(language) ?? this.deps.getFallbackParser(language);
    if (!parser) {
      return null;
    }

    return {
      language,
      confidence: 0.7,
      parser,
      detectionMethod: 'filename'
    };
  }

  private detectByShebang(content: string): LanguageDetectionResult | null {
    const firstLine = content.split('\n')[0];
    if (!firstLine.startsWith('#!')) {
      return null;
    }

    for (const [interpreter, language] of this.shebangMap) {
      if (firstLine.includes(interpreter)) {
        const parser = this.deps.getPrimaryParser(language) ?? this.deps.getFallbackParser(language);
        if (!parser) {
          continue;
        }
        return {
          language,
          confidence: 0.9,
          parser,
          detectionMethod: 'shebang'
        };
      }
    }

    return null;
  }

  private detectByContentAnalysis(content: string): LanguageDetectionResult | null {
    const heuristics: Array<{ match: (c: string) => boolean; language: string; confidence: number }> = [
      { match: (c) => this.isJavaScriptContent(c), language: 'javascript', confidence: 0.65 },
      { match: (c) => this.isTypeScriptContent(c), language: 'typescript', confidence: 0.65 },
      { match: (c) => this.isPythonContent(c), language: 'python', confidence: 0.6 },
      { match: (c) => this.isPhpContent(c), language: 'php', confidence: 0.6 },
      { match: (c) => this.isJavaContent(c), language: 'java', confidence: 0.6 },
      { match: (c) => this.isCSharpContent(c), language: 'csharp', confidence: 0.6 },
      { match: (c) => this.isMarkdownContent(c), language: 'markdown', confidence: 0.6 },
      { match: (c) => this.isHtmlContent(c), language: 'html', confidence: 0.6 },
      { match: (c) => this.isDocumentationContent(c), language: 'documentation', confidence: 0.6 }
    ];

    for (const heuristic of heuristics) {
      if (heuristic.match(content)) {
        const parser = this.deps.getPrimaryParser(heuristic.language) ?? this.deps.getFallbackParser(heuristic.language);
        if (!parser) {
          continue;
        }
        return {
          language: heuristic.language,
          confidence: heuristic.confidence,
          parser,
          detectionMethod: 'content'
        };
      }
    }

    return null;
  }

  private detectJsonLike(filePath: string, content?: string): LanguageDetectionResult | null {
    const resolvedContent = content ?? this.safeReadFile(filePath) ?? undefined;
    if (!resolvedContent) {
      return null;
    }

    const jsonParser = this.deps.getPrimaryParser('json');
    if (jsonParser?.validateContent && jsonParser.validateContent(resolvedContent)) {
      return {
        language: 'json',
        confidence: 0.95,
        parser: jsonParser,
        detectionMethod: 'content'
      };
    }

    const jsParser = this.deps.getPrimaryParser('javascript');
    if (jsParser?.validateContent && jsParser.validateContent(resolvedContent)) {
      return {
        language: 'javascript',
        confidence: 0.9,
        parser: jsParser,
        detectionMethod: 'content'
      };
    }

    for (const [language, parser] of this.extensionMap.entries()) {
      void language;
      const candidate = this.deps.getPrimaryParser(parser);
      if (!candidate || candidate.language === 'json' || candidate.language === 'javascript') {
        continue;
      }
      if (candidate.validateContent && candidate.validateContent(resolvedContent)) {
        return {
          language: candidate.language,
          confidence: 0.85,
          parser: candidate,
          detectionMethod: 'content'
        };
      }
    }

    return null;
  }

  private safeReadFile(filePath: string, limitBytes?: number): string | null {
    try {
      const data = readFileSync(filePath, 'utf-8');
      return typeof limitBytes === 'number' ? data.slice(0, limitBytes) : data;
    } catch {
      return null;
    }
  }

  private shouldIgnoreFile(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    const ignorePatterns = [
      '/coverage/',
      '/coverage-unit/',
      '/coverage-integration/',
      '/.nyc_output/',
      '/node_modules/',
      '/dist/',
      '/build/',
      '/.git/',
      '/vendor/',
      '/.idea/',
      '/.vscode/',
      '/tmp/',
      '/temp/',
      '/cache/'
    ];

    if (ignorePatterns.some(pattern => normalized.includes(pattern))) {
      return true;
    }

    const ext = extname(filePath).toLowerCase();
    const ignored = [
      '.db', '.sqlite', '.sqlite3',
      '.zip', '.tar', '.gz', '.rar', '.7z',
      '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
      '.pdf', '.doc', '.docx',
      '.exe', '.dll', '.so', '.dylib',
      '.pyc', '.pyo',
      '.class',
      '.o', '.obj',
      '.map',
      '.lock'
    ];

    return ignored.includes(ext);
  }

  private isJsonLike(ext: string): boolean {
    return ['.json', '.jsonc', '.json5'].includes(ext);
  }

  private isNonCodeExtension(ext: string): boolean {
    return ['.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.txt', '.log'].includes(ext);
  }

  private isJavaScriptContent(content: string): boolean {
    const patterns = [
      /\bfunction\s+\w+\s*\(/,
      /\bconst\s+\w+\s*=/,
      /\blet\s+\w+\s*=/,
      /\bvar\s+\w+\s*=/,
      /\bclass\s+\w+/,
      /\bimport\s+.*\bfrom\b/,
      /\bexport\s+(?:default\s+)?(?:class|function|const|let|var)/,
      /\b(?:async|await)\b/,
      /=>\s*\{/,
      /\binterface\s+\w+/,
      /\btype\s+\w+\s*=/,
      /:\s*(?:string|number|boolean|any|void|unknown|never)/
    ];
    return patterns.some(pattern => pattern.test(content));
  }

  private isTypeScriptContent(content: string): boolean {
    const patterns = [
      /:\s*(?:string|number|boolean|any|void|unknown|never|Record<|Partial<|Readonly<)/,
      /\binterface\s+\w+/,
      /\btype\s+\w+\s*=/,
      /\benum\s+\w+/,
      /\bas\s+const\b/,
      /\bsatisfies\s+/,
      /\bimplements\s+\w+/
    ];
    return patterns.some(pattern => pattern.test(content));
  }

  private isPythonContent(content: string): boolean {
    const strongPatterns = [
      /\bdef\s+\w+\s*\([^)]*\)\s*:/,
      /\bclass\s+\w+.*:\s*$/m,
      /\bif\s+__name__\s*==\s*['"']__main__['"]:/,
      /\bfrom\s+\w+\s+import\b/,
      /^\s*import\s+\w+/m,
      /\belif\s+.*:/,
      /\bexcept\s+\w*\s*:/
    ];
    return strongPatterns.some(pattern => pattern.test(content));
  }

  private isPhpContent(content: string): boolean {
    const patterns = [
      /<\?php/,
      /<\?=/,
      /\bnamespace\s+\w+/,
      /\buse\s+\w+/,
      /\$this->/,
      /\bextends\s+\w+/,
      /\bimplements\s+\w+/
    ];
    return patterns.some(pattern => pattern.test(content));
  }

  private isJavaContent(content: string): boolean {
    const patterns = [
      /\bpackage\s+[\w.]+\s*;/,
      /\bpublic\s+class\s+\w+/,
      /\bpublic\s+static\s+void\s+main\s*\(/,
      /\bSystem\.out\.println\s*\(/,
      /@Override/
    ];
    return patterns.some(pattern => pattern.test(content));
  }

  private isCSharpContent(content: string): boolean {
    const patterns = [
      /\bnamespace\s+[\w.]+\s*{/,
      /\busing\s+[\w.]+\s*;/,
      /\bConsole\.WriteLine\s*\(/,
      /\bpublic\s+class\s+\w+/,
      /\basync\s+\w+/
    ];
    return patterns.some(pattern => pattern.test(content));
  }

  private isMarkdownContent(content: string): boolean {
    const patterns = [
      /^#{1,6}\s+/m,
      /```[a-zA-Z0-9_-]*\n[\s\S]*?```/,
      /^\s*[-*+]\s+/m,
      /^\s*\d+\.\s+/m,
      /^>\s+/m
    ];
    return patterns.some(pattern => pattern.test(content));
  }

  private isHtmlContent(content: string): boolean {
    const patterns = [
      /<!DOCTYPE html>/i,
      /<html[\s>]/i,
      /<head[\s>]/i,
      /<body[\s>]/i,
      /<div[\s>]/i
    ];
    return patterns.some(pattern => pattern.test(content));
  }

  private isDocumentationContent(content: string): boolean {
    const rstPatterns = [
      /^\s*={3,}\s*$/m,
      /^\s*-{3,}\s*$/m,
      /^\s*\*{3,}\s*$/m,
      /^\s*`[^`]+`_/m,
      /^\s*\.{2}\s+/m
    ];
    const docPatterns = [
      /^#+\s+[A-Z]/m,
      /^=+$/m,
      /^-{3,}$/m,
      /^\w+:$/m,
      /^\s*\*\s+/m,
      /^\s*\d+\.\s+/m,
      /^NOTE:/mi,
      /^WARNING:/mi,
      /^IMPORTANT:/mi,
      /^TIP:/mi,
      /^EXAMPLE:/mi
    ];

    const rstMatches = rstPatterns.filter(pattern => pattern.test(content)).length;
    const docMatches = docPatterns.filter(pattern => pattern.test(content)).length;
    if (rstMatches >= 2) return true;
    if (docMatches >= 3) return true;

    const structurePatterns = [
      /^\d+\./m,
      /^[A-Z][^\n]*\n[=-]{3,}/m,
      /^[\*\-\+]\s+/m,
      /^\s*\d+\.\s+/m,
      /^\s*[a-z]\.\s+/m
    ];
    const structureMatches = structurePatterns.filter(pattern => pattern.test(content)).length;
    return docMatches >= 2 && structureMatches >= 2;
  }
}
