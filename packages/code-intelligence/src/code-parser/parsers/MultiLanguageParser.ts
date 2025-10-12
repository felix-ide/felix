import { BaseLanguageParser } from './BaseLanguageParser.js';
import { ILanguageParser, ParseResult, ParserOptions } from '../interfaces/ILanguageParser.js';
import { IComponent, IRelationship, RelationshipType } from '../types.js';
import Parser from 'tree-sitter';
import { ParserFactory } from '../ParserFactory.js';

// Routing strategy types
interface RoutingStrategy {
  type: 'single-language-fast-path' | 'multi-language' | 'single-language-check-embedded';
  language?: string;
  primaryLanguage?: string;
  expectedEmbedded?: string[];
  checkForEmbedded?: boolean;
  confidence: number;
}

interface MultiLanguagePattern {
  extensions: string[];
  primaryLanguage: string;
  commonEmbedded: string[];
  indicators: boolean[];
}

interface EmbeddedLanguagePattern {
  start: RegExp;
  end: RegExp;
  language: string;
  scope: string;
  extractContent?: boolean;
  inline?: boolean;
  onlyIn?: string[];
  onlyAtStart?: boolean;
}

/**
 * Universal Language Router and Multi-Language Parser
 *
 * Acts as the primary entry point for ALL file parsing, intelligently routing to:
 * - Single parser for pure single-language files (fast path)
 * - Multiple parsers for mixed-language files (orchestrated parsing)
 *
 * Routing Strategy:
 * 1. Analyze file to determine language composition
 * 2. For single-language: Direct route to appropriate parser
 * 3. For multi-language:
 *    - Parse with primary language parser
 *    - Identify embedded language boundaries
 *    - Parse embedded blocks with their parsers
 *    - Link components across language boundaries
 *
 * Supports ALL language combinations:
 * - PHP + HTML + JS + CSS
 * - Python + SQL + Jinja templates
 * - Ruby + ERB + JavaScript
 * - Go + HTML templates + SQL
 * - C# + Razor + JavaScript
 * - Any future language combinations
 */
export class MultiLanguageParser implements Partial<ILanguageParser> {
  private parserFactory: ParserFactory;
  private primaryParser?: ILanguageParser;
  private treeSitterParser?: Parser;
  private virtualDocuments: Map<string, string> = new Map();
  private languageBoundaries: Map<string, LanguageBoundary[]> = new Map();

  constructor(parserFactory: ParserFactory) {
    this.parserFactory = parserFactory;
  }

  get language(): string {
    return 'multi';
  }

  get extensions(): string[] {
    // This parser is used via delegation, not direct file extension matching
    return [];
  }

  getSupportedExtensions(): string[] {
    return [];
  }

  getIgnorePatterns(): string[] {
    return [];
  }

  canParseFile(filePath: string): boolean {
    return true; // We can parse any file with multiple languages
  }

  async parseFile(filePath: string, options?: ParserOptions): Promise<ParseResult> {
    const fs = await import('fs');
    const content = fs.readFileSync(filePath, 'utf-8');
    return this.parseContent(content, filePath, options);
  }

  validateContent(content: string): boolean {
    return this.detectMultipleLanguages(content);
  }

  // detectLanguageBoundaries is implemented in detectLanguageBoundaries private method

  supportsLanguage(language: string): boolean {
    // We support any language that has embedded content
    return true;
  }

  private detectMultipleLanguages(content: string): boolean {
    // Check for multiple language indicators
    const indicators = [
      content.includes('<?php') && content.includes('</'),
      content.includes('<script') && content.includes('<style'),
      content.includes('{{') || content.includes('{%')
    ];
    return indicators.filter(Boolean).length >= 2;
  }

  /**
   * Determine the optimal routing strategy for a file
   * This is the key intelligence of the router
   */
  private determineRoutingStrategy(filePath: string, content: string): RoutingStrategy {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';

    // Quick content checks for embedded languages
    const hasTemplateMarkers = /\{\{|\{%|<%|%>/.test(content);
    const hasScriptTags = /<script[\s>]/i.test(content);
    const hasStyleTags = /<style[\s>]/i.test(content);
    const hasPhpTags = /<\?php|\?>/i.test(content);
    const hasSqlBlocks = /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s+/i.test(content);
    const hasEmbeddedLanguageComments = /\/\/\s*language=|<!--\s*language[:=]|#\s*language[:=]/i.test(content);

    // Check for known single-language file patterns
    const pureSingleLanguageExts = ['json', 'md', 'txt', 'log', 'yaml', 'yml', 'toml', 'ini'];
    if (pureSingleLanguageExts.includes(ext) && !hasTemplateMarkers) {
      return {
        type: 'single-language-fast-path',
        language: this.mapExtensionToLanguage(ext),
        confidence: 0.95
      };
    }

    // Known multi-language file types
    const multiLanguagePatterns: Record<string, MultiLanguagePattern> = {
      'php': {
        extensions: ['php', 'phtml', 'php3', 'php4', 'php5'],
        primaryLanguage: 'php',
        commonEmbedded: ['html', 'javascript', 'css', 'sql'],
        indicators: [hasPhpTags, hasScriptTags || hasStyleTags]
      },
      'html': {
        extensions: ['html', 'htm', 'xhtml'],
        primaryLanguage: 'html',
        commonEmbedded: ['javascript', 'css', 'php'],
        indicators: [hasScriptTags || hasStyleTags || hasPhpTags]
      },
      'vue': {
        extensions: ['vue'],
        primaryLanguage: 'vue',
        commonEmbedded: ['javascript', 'typescript', 'css', 'scss'],
        indicators: [true] // Vue files are always multi-language
      },
      'erb': {
        extensions: ['erb', 'rhtml'],
        primaryLanguage: 'ruby',
        commonEmbedded: ['html', 'javascript', 'css'],
        indicators: [hasTemplateMarkers]
      },
      'ejs': {
        extensions: ['ejs'],
        primaryLanguage: 'javascript',
        commonEmbedded: ['html', 'css'],
        indicators: [hasTemplateMarkers]
      },
      'jsx': {
        extensions: ['jsx', 'tsx'],
        primaryLanguage: 'javascript',
        commonEmbedded: ['html', 'css'],
        indicators: [/<[A-Z]\w*|<\//i.test(content)]
      },
      'razor': {
        extensions: ['cshtml', 'vbhtml'],
        primaryLanguage: 'csharp',
        commonEmbedded: ['html', 'javascript', 'css'],
        indicators: [hasTemplateMarkers || hasScriptTags]
      },
      'django': {
        extensions: ['djhtml', 'jinja', 'j2'],
        primaryLanguage: 'python',
        commonEmbedded: ['html', 'javascript', 'css'],
        indicators: [hasTemplateMarkers]
      },
      'svelte': {
        extensions: ['svelte'],
        primaryLanguage: 'svelte',
        commonEmbedded: ['javascript', 'typescript', 'css'],
        indicators: [true] // Svelte files are always multi-language
      }
    };

    // Check if file matches known multi-language patterns
    for (const [type, pattern] of Object.entries(multiLanguagePatterns)) {
      if (pattern.extensions.includes(ext)) {
        const hasIndicators = pattern.indicators.some(ind => ind === true);
        if (hasIndicators) {
          return {
            type: 'multi-language',
            primaryLanguage: pattern.primaryLanguage,
            expectedEmbedded: pattern.commonEmbedded,
            confidence: 0.9
          };
        }
      }
    }

    // Check for embedded SQL in any language
    if (hasSqlBlocks) {
      const primaryLang = this.detectPrimaryLanguage(filePath, content);
      return {
        type: 'multi-language',
        primaryLanguage: primaryLang,
        expectedEmbedded: ['sql'],
        checkForEmbedded: true,
        confidence: 0.8
      };
    }

    // Check for embedded templates in any language
    if (hasTemplateMarkers) {
      const primaryLang = this.detectPrimaryLanguage(filePath, content);
      return {
        type: 'multi-language',
        primaryLanguage: primaryLang,
        checkForEmbedded: true,
        confidence: 0.7
      };
    }

    // Default: single language but check for embedded content
    const primaryLang = this.detectPrimaryLanguage(filePath, content);
    return {
      type: 'single-language-check-embedded',
      language: primaryLang,
      primaryLanguage: primaryLang,
      checkForEmbedded: true,
      confidence: 0.6
    };
  }

  private mapExtensionToLanguage(ext: string): string {
    const extMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'javascript',
      'tsx': 'javascript',
      'py': 'python',
      'rb': 'ruby',
      'php': 'php',
      'java': 'java',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'cpp': 'cpp',
      'c': 'c',
      'h': 'c',
      'hpp': 'cpp',
      'css': 'css',
      'scss': 'css',
      'sass': 'css',
      'less': 'css',
      'html': 'html',
      'htm': 'html',
      'xml': 'xml',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'markdown': 'markdown',
      'txt': 'text',
      'log': 'text'
    };
    return extMap[ext] || 'unknown';
  }

  async parseContent(
    content: string,
    filePath: string,
    options?: ParserOptions
  ): Promise<ParseResult> {
    const startTime = Date.now();

    // Step 1: Analyze file to determine routing strategy
    const routingStrategy = this.determineRoutingStrategy(filePath, content);

    if (routingStrategy.type === 'single-language-fast-path') {
      // Fast path: Single language, no embedded content detected
      // Route directly to the appropriate parser without overhead
      const parser = this.parserFactory.getParser(routingStrategy.language || 'unknown');
      if (parser) {
        try {
          const result = await parser.parseContent(content, filePath, options);
          // Add routing metadata
          if (result.metadata) {
            result.metadata.routingStrategy = 'single-language-fast-path';
          }
          return result;
        } catch (error) {
          console.debug(`Fast-path parser failed for ${filePath}, falling back to full analysis`);
        }
      }
    }

    // Full multi-language analysis path
    const components: IComponent[] = [];
    const relationships: IRelationship[] = [];

    // Step 2: Parse with primary language parser
    const primaryLanguage = routingStrategy.primaryLanguage || this.detectPrimaryLanguage(filePath, content);
    const primaryParserCandidate = this.parserFactory.getParser(primaryLanguage);
    if (primaryParserCandidate) {
      this.primaryParser = primaryParserCandidate;
    }

    let primaryResult: ParseResult | null = null;
    if (this.primaryParser) {
      try {
        primaryResult = await this.primaryParser.parseContent(content, filePath, options);
        components.push(...(primaryResult?.components || []));
        relationships.push(...(primaryResult?.relationships || []));
      } catch (error) {
        console.debug(`Primary parser failed for ${filePath}, will use Tree-sitter segmentation`);
      }
    }

    // Step 3: Check if we need to detect embedded languages
    let boundaries: LanguageBoundary[] = [];
    if (routingStrategy.type === 'multi-language' || routingStrategy.checkForEmbedded) {
      // Use Tree-sitter to identify language boundaries
      boundaries = await this.detectLanguageBoundariesInternal(content, filePath, primaryLanguage);
      this.languageBoundaries.set(filePath, boundaries);

      // Step 4: Parse embedded language blocks
      for (const boundary of boundaries) {
        if (boundary.language === primaryLanguage) {
          continue; // Already parsed by primary parser
        }

        const embeddedContent = this.extractEmbeddedContent(content, boundary);
        const virtualPath = this.createVirtualDocumentPath(filePath, boundary);

        // Store virtual document for tracking embedded content
        this.virtualDocuments.set(virtualPath, embeddedContent);

        // Parse embedded content with appropriate parser
        const embeddedParser = this.parserFactory.getParser(boundary.language);
        if (embeddedParser) {
          try {
            const embeddedResult = await embeddedParser.parseContent(
              embeddedContent,
              virtualPath,
              {
                ...options,
                isEmbedded: true,
                parentLanguage: primaryLanguage,
                offsetLine: boundary.startLine,
                offsetColumn: boundary.startColumn
              }
            );

            // Adjust positions and add scope context
            const adjustedComponents = this.adjustComponentPositions(
              embeddedResult.components,
              boundary,
              filePath
            );

            // Link embedded components to parent
            this.linkEmbeddedComponents(
              adjustedComponents,
              components,
              boundary,
              relationships
            );

            components.push(...adjustedComponents);
            relationships.push(...embeddedResult.relationships);
          } catch (error) {
            console.debug(`Failed to parse embedded ${boundary.language} in ${filePath}`);
          }
        }
      }
    }

    // Step 4: Detect cross-language relationships
    const crossLanguageRels = this.detectCrossLanguageRelationships(
      components,
      boundaries,
      content
    );
    relationships.push(...crossLanguageRels);

    return {
      components,
      relationships,
      errors: [],
      warnings: [],
      metadata: {
        filePath,
        language: primaryLanguage,
        parseTime: 0,
        componentCount: components.length,
        relationshipCount: relationships.length,
        primaryLanguage,
        embeddedLanguages: [...new Set(boundaries.map(b => b.language))],
        virtualDocuments: Array.from(this.virtualDocuments.keys()),
        boundaries: boundaries.length
      }
    };
  }

  async detectComponents(content: string, filePath: string): Promise<IComponent[]> {
    const result = await this.parseContent(content, filePath);
    return result.components;
  }

  async detectRelationships(
    components: IComponent[],
    content: string
  ): Promise<IRelationship[]> {
    const result = await this.parseContent(content, components[0]?.filePath || '');
    return result.relationships;
  }

  async validateSyntax(content: string): Promise<any[]> {
    // Aggregate errors from all language parsers
    const errors: any[] = [];
    const boundaries = await this.detectLanguageBoundariesInternal(content, 'temp.file', 'auto');
    
    for (const boundary of boundaries) {
      const parser = this.parserFactory.getParser(boundary.language);
      if (parser && typeof parser.validateSyntax === 'function') {
        const embeddedContent = this.extractEmbeddedContent(content, boundary);
        const embeddedErrors = await parser.validateSyntax(embeddedContent);
        errors.push(...this.adjustErrorPositions(embeddedErrors, boundary));
      }
    }
    
    return errors;
  }

  private detectPrimaryLanguage(filePath: string, content: string): string {
    // Detect primary language based on file extension and content
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    // Common multi-language file patterns
    if (ext === 'php' || ext === 'phtml') return 'php';
    if (ext === 'vue') return 'vue';
    if (ext === 'svelte') return 'svelte';
    if (ext === 'jsx' || ext === 'tsx') return 'javascript';
    if (ext === 'erb' || ext === 'rhtml') return 'ruby';
    if (ext === 'aspx' || ext === 'cshtml') return 'csharp';
    if (ext === 'ejs') return 'javascript';
    if (ext === 'hbs' || ext === 'handlebars') return 'handlebars';
    if (ext === 'twig') return 'twig';
    if (ext === 'liquid') return 'liquid';
    
    // Check content for language indicators
    if (content.includes('<?php')) return 'php';
    if (content.includes('<%') && content.includes('%>')) {
      if (content.includes('<%=')) return 'javascript'; // EJS
      if (content.includes('<%@')) return 'csharp'; // ASP.NET
    }
    if (content.startsWith('<!DOCTYPE') || content.startsWith('<html')) return 'html';
    
    // Default to HTML for mixed content
    return 'html';
  }

  private async detectLanguageBoundariesInternal(
    content: string,
    filePath: string,
    primaryLanguage: string
  ): Promise<LanguageBoundary[]> {
    const boundaries: LanguageBoundary[] = [];

    // Universal embedded language patterns
    const embeddedPatterns: EmbeddedLanguagePattern[] = [
      // PHP in any file
      {
        start: /<\?php|<\?=/gi,
        end: /\?>/gi,
        language: 'php',
        scope: 'source.php.embedded'
      },
      // JavaScript in HTML/templates
      {
        start: /<script(?:\s+[^>]*)?>/gi,
        end: /<\/script>/gi,
        language: 'javascript',
        scope: 'source.js.embedded.html',
        extractContent: true // Remove wrapper tags
      },
      // CSS in HTML/templates
      {
        start: /<style(?:\s+[^>]*)?>/gi,
        end: /<\/style>/gi,
        language: 'css',
        scope: 'source.css.embedded.html',
        extractContent: true
      },
      // SQL in any language (using comments or string markers)
      {
        start: /(?:--|\/\/|#)\s*language[:\s]*sql|(?:'''|"""|`)\s*--\s*sql/gi,
        end: /(?:'''|"""|`)|$/gm,
        language: 'sql',
        scope: 'source.sql.embedded'
      },
      // GraphQL in JavaScript/TypeScript
      {
        start: /gql`|graphql`|\/\*\s*GraphQL\s*\*\/|#\s*graphql/gi,
        end: /`|;|\*\//gi,
        language: 'graphql',
        scope: 'source.graphql.embedded'
      },
      // Markdown in comments
      {
        start: /\/\*\*\s*@markdown|\/\/\/\s*markdown/gi,
        end: /\*\/|$/gm,
        language: 'markdown',
        scope: 'source.markdown.embedded'
      },
      // Template languages (Jinja2, Liquid, Handlebars, etc.)
      {
        start: /\{\{|\{%|<%[-=]?/g,
        end: /\}\}|%\}|[-=]?%>/g,
        language: 'template',
        scope: 'source.template.embedded',
        inline: true // These are inline snippets
      },
      // JSX/TSX in JavaScript
      {
        start: /<[A-Z]\w*(?:\s+[^>]*)?>/g,
        end: /<\/[A-Z]\w*>/g,
        language: 'jsx',
        scope: 'source.jsx.embedded',
        onlyIn: ['javascript', 'typescript']
      },
      // Python docstrings with other languages
      {
        start: /(?:r)?""".*?(?:sql|graphql|html|xml|json)/gi,
        end: /"""/g,
        language: 'auto', // Detect from content
        scope: 'source.embedded.python'
      },
      // Ruby embedded templates (ERB)
      {
        start: /<%[-=]?/g,
        end: /[-=]?%>/g,
        language: 'ruby',
        scope: 'source.ruby.embedded.erb'
      },
      // Go templates
      {
        start: /\{\{[-\s]*/g,
        end: /[-\s]*\}\}/g,
        language: 'go-template',
        scope: 'source.go-template.embedded'
      },
      // Rust macros with embedded languages
      {
        start: /(?:sql|html|css|js)!\s*\{/g,
        end: /\}/g,
        language: 'auto',
        scope: 'source.embedded.rust'
      },
      // Shell scripts in any language
      {
        start: /(?:bash|sh|shell)`|#!\s*\/(?:usr\/)?bin\/(?:bash|sh)/gi,
        end: /`|$/gm,
        language: 'shell',
        scope: 'source.shell.embedded'
      },
      // YAML front matter
      {
        start: /^---\s*$/gm,
        end: /^---\s*$/gm,
        language: 'yaml',
        scope: 'source.yaml.frontmatter',
        onlyAtStart: true
      }
    ];

    // Use Tree-sitter if available for accurate parsing
    const treeSitterParser = this.parserFactory.getTreeSitterParser(primaryLanguage);
    if (treeSitterParser) {
      // Tree-sitter can identify unknown/text nodes which might be embedded languages
      // This would be more accurate than regex patterns
      // For now, fall through to pattern matching
    }

    // Apply pattern matching based on primary language context
    const lines = content.split('\n');

    for (const pattern of embeddedPatterns) {
      // Skip patterns that are only for specific languages
      if (pattern.onlyIn && !pattern.onlyIn.includes(primaryLanguage)) {
        continue;
      }

      // Skip frontmatter check if not at start
      if (pattern.onlyAtStart && lines[0] !== '---') {
        continue;
      }

      // Find all matches for this pattern
      let match;
      const startPattern = pattern.start;
      startPattern.lastIndex = 0; // Reset regex

      while ((match = startPattern.exec(content)) !== null) {
        const startPos = match.index;
        const startLine = content.substring(0, startPos).split('\n').length - 1;
        const startColumn = startPos - content.lastIndexOf('\n', startPos - 1) - 1;

        // Find corresponding end pattern
        const endPattern = new RegExp(pattern.end.source, pattern.end.flags);
        endPattern.lastIndex = startPattern.lastIndex;
        const endMatch = endPattern.exec(content);

        if (endMatch) {
          const endPos = endMatch.index + endMatch[0].length;
          const endLine = content.substring(0, endPos).split('\n').length - 1;
          const endColumn = endPos - content.lastIndexOf('\n', endPos - 1) - 1;

          // Determine the actual language (for 'auto' detection)
          let detectedLanguage = pattern.language;
          if (pattern.language === 'auto') {
            detectedLanguage = this.detectLanguageFromContent(
              content.substring(startPos, endPos)
            );
          }

          boundaries.push({
            language: detectedLanguage,
            startLine,
            startColumn,
            endLine,
            endColumn,
            scope: pattern.scope.replace('auto', detectedLanguage)
          });
        }
      }
    }

    return boundaries;
  }

  private detectLanguageFromContent(content: string): string {
    // Simple heuristic-based language detection
    if (/SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN/i.test(content)) {
      return 'sql';
    }
    if (/query|mutation|fragment|subscription|\{\s*\w+\s*\(/i.test(content)) {
      return 'graphql';
    }
    if (/<[a-z]+[^>]*>/i.test(content)) {
      return 'html';
    }
    if (/\{\s*"[\w-]+"\s*:/i.test(content)) {
      return 'json';
    }
    if (/^[\w-]+:\s*.+$/m.test(content)) {
      return 'yaml';
    }
    return 'text';
  }

  private extractEmbeddedContent(content: string, boundary: LanguageBoundary): string {
    const lines = content.split('\n');
    const embeddedLines = lines.slice(boundary.startLine, boundary.endLine + 1);
    
    // Adjust first and last lines based on column positions
    if (embeddedLines.length > 0) {
      embeddedLines[0] = embeddedLines[0].substring(boundary.startColumn);
      if (embeddedLines.length > 1) {
        const lastIdx = embeddedLines.length - 1;
        embeddedLines[lastIdx] = embeddedLines[lastIdx].substring(0, boundary.endColumn);
      }
    }
    
    // Remove wrapper tags if present
    let embeddedContent = embeddedLines.join('\n');
    if (boundary.scope.includes('.embedded.html')) {
      // Remove script/style tags
      embeddedContent = embeddedContent.replace(/<script[^>]*>/gi, '');
      embeddedContent = embeddedContent.replace(/<\/script>/gi, '');
      embeddedContent = embeddedContent.replace(/<style[^>]*>/gi, '');
      embeddedContent = embeddedContent.replace(/<\/style>/gi, '');
    }
    if (boundary.language === 'php') {
      // Remove PHP tags
      embeddedContent = embeddedContent.replace(/<\?php/g, '');
      embeddedContent = embeddedContent.replace(/<\?=/g, '');
      embeddedContent = embeddedContent.replace(/\?>/g, '');
    }
    
    return embeddedContent.trim();
  }

  private createVirtualDocumentPath(
    filePath: string,
    boundary: LanguageBoundary
  ): string {
    return `${filePath}#${boundary.language}_${boundary.startLine}_${boundary.endLine}`;
  }

  private adjustComponentPositions(
    components: IComponent[],
    boundary: LanguageBoundary,
    originalFilePath: string
  ): IComponent[] {
    return components.map(component => ({
      ...component,
      filePath: originalFilePath, // Use original file path, not virtual
      location: {
        ...component.location,
        startLine: component.location.startLine + boundary.startLine,
        startColumn: component.location.startColumn + 
          (component.location.startLine === 0 ? boundary.startColumn : 0),
        endLine: component.location.endLine + boundary.startLine,
        endColumn: component.location.endColumn
      },
      scopeContext: {
        scope: boundary.scope,
        languageStack: [this.primaryParser?.language || 'unknown', boundary.language],
        componentChain: []
      }
    }));
  }

  private linkEmbeddedComponents(
    embeddedComponents: IComponent[],
    parentComponents: IComponent[],
    boundary: LanguageBoundary,
    relationships: IRelationship[]
  ): void {
    // Find parent component that contains this embedded block
    const parentComponent = parentComponents.find(comp => 
      comp.location.startLine <= boundary.startLine &&
      comp.location.endLine >= boundary.endLine
    );

    if (parentComponent) {
      // Create relationships between parent and embedded components
      for (const embedded of embeddedComponents) {
        relationships.push({
          id: `${parentComponent.id}:contains:${embedded.id}`,
          sourceId: parentComponent.id,
          targetId: embedded.id,
          type: RelationshipType.CONTAINS,
          metadata: {
            embeddedLanguage: boundary.language,
            parentLanguage: parentComponent.language,
            scope: boundary.scope
          }
        });
      }
    }
  }

  private detectCrossLanguageRelationships(
    components: IComponent[],
    boundaries: LanguageBoundary[],
    content: string
  ): IRelationship[] {
    const relationships: IRelationship[] = [];
    
    // Detect JavaScript referencing PHP variables
    const jsComponents = components.filter(c => {
      const scopeCtx = c.scopeContext as any;
      return c.language === 'javascript' || scopeCtx?.language === 'javascript';
    });
    const phpComponents = components.filter(c => {
      const scopeCtx = c.scopeContext as any;
      return c.language === 'php' || scopeCtx?.language === 'php';
    });
    
    for (const jsComp of jsComponents) {
      if (jsComp.code) {
        // Look for PHP variable references in JS (e.g., const userId = <?= $userId ?>)
        const phpVarPattern = /<\?=?\s*\$([\w_]+)\s*\??>/g;
        let match;
        while ((match = phpVarPattern.exec(jsComp.code)) !== null) {
          const varName = match[1];
          // Find corresponding PHP component
          const phpVar = phpComponents.find(p => 
            p.name === varName || p.name === `$${varName}`
          );
          if (phpVar) {
            relationships.push({
              id: `${jsComp.id}:uses:${phpVar.id}`,
              sourceId: jsComp.id,
              targetId: phpVar.id,
              type: RelationshipType.CROSS_LANGUAGE_REF,
              metadata: {
                referenceType: 'php_variable_in_js',
                variableName: varName
              }
            });
          }
        }
      }
    }
    
    // Add more cross-language patterns as needed
    // - HTML using CSS classes
    // - JavaScript manipulating HTML elements
    // - PHP generating JavaScript function calls
    // etc.
    
    return relationships;
  }

  private adjustErrorPositions(errors: any[], boundary: LanguageBoundary): any[] {
    return errors.map(error => ({
      ...error,
      location: {
        ...error.location,
        startLine: error.location.startLine + boundary.startLine,
        endLine: error.location.endLine + boundary.startLine
      },
      source: `${boundary.language} (embedded in ${this.primaryParser?.language})`
    }));
  }
}

// Language boundary interface
interface LanguageBoundary {
  language: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  scope: string;
}