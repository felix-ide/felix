/**
 * InitialLinker - Service for detecting low-confidence relationships between files
 *
 * This service handles:
 * - Shell script relationships (source, include, awk -f, sed -f)
 * - Makefile includes and dependencies
 * - Dockerfile COPY/ADD/FROM relationships for local files
 * - Markdown/Text relative links and enhanced doc→code links
 * - Generic path references validated within workspace
 * - Integration with the enhanced markdown parser for special linking
 */

import { existsSync, statSync, readFileSync } from 'fs';
import { resolve, join, dirname, relative, isAbsolute, extname } from 'path';
import { MarkdownParser } from '../parsers/MarkdownParser.js';
import { RelationshipType } from '../types.js';

export interface InitialRelationship {
  sourceFile: string;
  targetFile: string;
  type: 'INCLUDES' | 'DEPENDS_ON' | 'REFERENCES_FILE' | 'REFERENCES_SYMBOL' | 'USES' | 'COPIES';
  confidence: number;
  metadata: {
    lineNumber?: number;
    context?: string;
    pattern?: string;
    linkType?: string;
    symbolName?: string;
    reason?: string;
  };
}

export interface LinkingResult {
  relationships: InitialRelationship[];
  metadata: {
    linkerTypes: string[];
    filesProcessed: number;
    relationshipsFound: number;
    processingTimeMs: number;
    errors: string[];
  };
}

export class InitialLinker {
  private static instance: InitialLinker | null = null;
  private workspaceRoot: string = '';
  private markdownParser: MarkdownParser;

  constructor() {
    this.markdownParser = new MarkdownParser();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): InitialLinker {
    if (!this.instance) {
      this.instance = new InitialLinker();
    }
    return this.instance;
  }

  /**
   * Set the workspace root for validating path references
   */
  setWorkspaceRoot(rootPath: string): void {
    this.workspaceRoot = resolve(rootPath);
  }

  /**
   * Extract relationships from a file based on its content and type
   */
  async extractRelationships(filePath: string, content?: string): Promise<LinkingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const relationships: InitialRelationship[] = [];
    const linkerTypes: string[] = [];

    try {
      // Read content if not provided
      if (!content) {
        content = readFileSync(filePath, 'utf-8');
      }

      const fileExt = extname(filePath).toLowerCase();
      const fileName = filePath.split('/').pop()?.toLowerCase() || '';

      // Apply appropriate linkers based on file type
      if (this.isShellScript(filePath, content)) {
        linkerTypes.push('shell');
        relationships.push(...await this.extractShellRelationships(filePath, content));
      }

      if (this.isMakefile(fileName)) {
        linkerTypes.push('makefile');
        relationships.push(...await this.extractMakefileRelationships(filePath, content));
      }

      if (this.isDockerfile(fileName)) {
        linkerTypes.push('dockerfile');
        relationships.push(...await this.extractDockerfileRelationships(filePath, content));
      }

      if (this.isMarkdownFile(fileExt)) {
        linkerTypes.push('markdown');
        relationships.push(...await this.extractMarkdownRelationships(filePath, content));
      }

      if (this.isTextFile(fileExt)) {
        linkerTypes.push('text');
        relationships.push(...await this.extractTextRelationships(filePath, content));
      }

      // Always apply generic path detection
      linkerTypes.push('generic');
      relationships.push(...await this.extractGenericPathReferences(filePath, content));

    } catch (error) {
      errors.push(`Error processing ${filePath}: ${error}`);
    }

    const processingTimeMs = Date.now() - startTime;

    return {
      relationships: this.deduplicateRelationships(relationships),
      metadata: {
        linkerTypes: [...new Set(linkerTypes)],
        filesProcessed: 1,
        relationshipsFound: relationships.length,
        processingTimeMs,
        errors
      }
    };
  }

  /**
   * Extract shell script relationships (source, includes, tool arguments)
   */
  private async extractShellRelationships(filePath: string, content: string): Promise<InitialRelationship[]> {
    const relationships: InitialRelationship[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Source and . (dot) commands
      const sourceMatch = line.match(/(?:source\s+|^\s*\.\s+)([^\s;]+)/);
      if (sourceMatch) {
        const targetPath = this.resolveFilePath(filePath, sourceMatch[1]);
        if (targetPath) {
          relationships.push({
            sourceFile: filePath,
            targetFile: targetPath,
            type: 'INCLUDES',
            confidence: 0.85,
            metadata: {
              lineNumber,
              context: line.trim(),
              pattern: 'shell_source',
              reason: 'Shell source/dot command'
            }
          });
        }
      }

      // AWK script files
      const awkMatch = line.match(/awk\s+(?:-f\s+|--file=)([^\s;]+)/);
      if (awkMatch) {
        const targetPath = this.resolveFilePath(filePath, awkMatch[1]);
        if (targetPath) {
          relationships.push({
            sourceFile: filePath,
            targetFile: targetPath,
            type: 'DEPENDS_ON',
            confidence: 0.80,
            metadata: {
              lineNumber,
              context: line.trim(),
              pattern: 'awk_file',
              reason: 'AWK script file dependency'
            }
          });
        }
      }

      // SED script files
      const sedMatch = line.match(/sed\s+(?:-f\s+|--file=)([^\s;]+)/);
      if (sedMatch) {
        const targetPath = this.resolveFilePath(filePath, sedMatch[1]);
        if (targetPath) {
          relationships.push({
            sourceFile: filePath,
            targetFile: targetPath,
            type: 'DEPENDS_ON',
            confidence: 0.80,
            metadata: {
              lineNumber,
              context: line.trim(),
              pattern: 'sed_file',
              reason: 'SED script file dependency'
            }
          });
        }
      }

      // Include statements (common in shell frameworks)
      const includeMatch = line.match(/include\s+([^\s;]+)/);
      if (includeMatch) {
        const targetPath = this.resolveFilePath(filePath, includeMatch[1]);
        if (targetPath) {
          relationships.push({
            sourceFile: filePath,
            targetFile: targetPath,
            type: 'INCLUDES',
            confidence: 0.75,
            metadata: {
              lineNumber,
              context: line.trim(),
              pattern: 'shell_include',
              reason: 'Shell include statement'
            }
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Extract Makefile relationships (includes, dependencies)
   */
  private async extractMakefileRelationships(filePath: string, content: string): Promise<InitialRelationship[]> {
    const relationships: InitialRelationship[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Include statements
      const includeMatch = line.match(/^(?:include|sinclude|-include)\s+(.+)$/);
      if (includeMatch) {
        const includePaths = includeMatch[1].split(/\s+/);
        for (const includePath of includePaths) {
          const targetPath = this.resolveFilePath(filePath, includePath);
          if (targetPath) {
            relationships.push({
              sourceFile: filePath,
              targetFile: targetPath,
              type: 'INCLUDES',
              confidence: 0.90,
              metadata: {
                lineNumber,
                context: line.trim(),
                pattern: 'makefile_include',
                reason: 'Makefile include directive'
              }
            });
          }
        }
      }

      // Variable references to files
      const varFileMatch = line.match(/(\w+)\s*[:?]?=\s*([^\s]+\.[\w]+)/);
      if (varFileMatch) {
        const targetPath = this.resolveFilePath(filePath, varFileMatch[2]);
        if (targetPath) {
          relationships.push({
            sourceFile: filePath,
            targetFile: targetPath,
            type: 'REFERENCES_FILE',
            confidence: 0.70,
            metadata: {
              lineNumber,
              context: line.trim(),
              pattern: 'makefile_variable',
              reason: 'Makefile variable references file'
            }
          });
        }
      }

      // Dependency lines (target: dependencies)
      const depMatch = line.match(/^([^:]+):\s*(.+)$/);
      if (depMatch && !line.includes('=')) {
        const dependencies = depMatch[2].split(/\s+/);
        for (const dep of dependencies) {
          if (dep.includes('.') && !dep.includes('$')) {
            const targetPath = this.resolveFilePath(filePath, dep);
            if (targetPath) {
              relationships.push({
                sourceFile: filePath,
                targetFile: targetPath,
                type: 'DEPENDS_ON',
                confidence: 0.85,
                metadata: {
                  lineNumber,
                  context: line.trim(),
                  pattern: 'makefile_dependency',
                  reason: 'Makefile dependency'
                }
              });
            }
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Extract Dockerfile relationships (COPY, ADD, FROM local files)
   */
  private async extractDockerfileRelationships(filePath: string, content: string): Promise<InitialRelationship[]> {
    const relationships: InitialRelationship[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // COPY and ADD instructions
      const copyMatch = line.match(/^(?:COPY|ADD)\s+(?:--\w+[=\s]\w+\s+)*(.+?)\s+(.+)$/i);
      if (copyMatch) {
        const sourcePaths = copyMatch[1].split(/\s+/);
        for (const sourcePath of sourcePaths) {
          // Skip URLs and ignore paths with variables
          if (!sourcePath.startsWith('http') && !sourcePath.includes('$')) {
            const targetPath = this.resolveFilePath(filePath, sourcePath);
            if (targetPath) {
              relationships.push({
                sourceFile: filePath,
                targetFile: targetPath,
                type: 'COPIES',
                confidence: 0.90,
                metadata: {
                  lineNumber,
                  context: line.trim(),
                  pattern: 'dockerfile_copy',
                  reason: 'Dockerfile COPY/ADD instruction'
                }
              });
            }
          }
        }
      }

      // FROM with local build contexts (rare but possible)
      const fromMatch = line.match(/^FROM\s+.*\s+AS\s+(\w+)/i);
      if (fromMatch) {
        // This is mainly for multi-stage builds referencing local contexts
        // We'll track these but with lower confidence
      }

      // Local file references in RUN commands
      const runFileMatch = line.match(/^RUN\s+.*?([./][\w./]+\.\w+)/i);
      if (runFileMatch) {
        const targetPath = this.resolveFilePath(filePath, runFileMatch[1]);
        if (targetPath) {
          relationships.push({
            sourceFile: filePath,
            targetFile: targetPath,
            type: 'USES',
            confidence: 0.60,
            metadata: {
              lineNumber,
              context: line.trim(),
              pattern: 'dockerfile_run_file',
              reason: 'File reference in RUN command'
            }
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Extract Markdown relationships using enhanced parser
   */
  private async extractMarkdownRelationships(filePath: string, content: string): Promise<InitialRelationship[]> {
    const relationships: InitialRelationship[] = [];

    try {
      // Use the enhanced markdown parser to detect components and relationships
      const components = this.markdownParser.detectComponents(content, filePath);
      const mdRelationships = this.markdownParser.detectRelationships(components, content);

      // Convert markdown parser relationships to InitialRelationships
      for (const rel of mdRelationships) {
        if (rel.type === RelationshipType.REFERENCES || rel.type === RelationshipType.USES) {
          // Try to resolve the target as a file path
          const targetPath = this.resolveFilePath(filePath, rel.targetId);
          if (targetPath) {
            relationships.push({
              sourceFile: filePath,
              targetFile: targetPath,
              type: 'REFERENCES_FILE',
              confidence: 0.75,
              metadata: {
                context: rel.metadata?.context || '',
                pattern: 'markdown_enhanced',
                reason: 'Enhanced markdown parser detected relationship'
              }
            });
          }
        }
      }

      // Extract standard markdown links
      const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
      let match;

      while ((match = linkRegex.exec(content)) !== null) {
        const linkText = match[1];
        const linkUrl = match[2];

        // Skip external URLs
        if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://')) {
          continue;
        }

        // Skip anchors and fragments
        if (linkUrl.startsWith('#')) {
          continue;
        }

        const targetPath = this.resolveFilePath(filePath, linkUrl);
        if (targetPath) {
          relationships.push({
            sourceFile: filePath,
            targetFile: targetPath,
            type: 'REFERENCES_FILE',
            confidence: 0.80,
            metadata: {
              context: linkText,
              pattern: 'markdown_link',
              reason: 'Markdown link reference'
            }
          });
        }
      }

      // Extract image references
      const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
      while ((match = imageRegex.exec(content)) !== null) {
        const altText = match[1];
        const imagePath = match[2];

        if (!imagePath.startsWith('http://') && !imagePath.startsWith('https://')) {
          const targetPath = this.resolveFilePath(filePath, imagePath);
          if (targetPath) {
            relationships.push({
              sourceFile: filePath,
              targetFile: targetPath,
              type: 'REFERENCES_FILE',
              confidence: 0.85,
              metadata: {
                context: altText,
                pattern: 'markdown_image',
                reason: 'Markdown image reference'
              }
            });
          }
        }
      }

    } catch (error) {
      console.debug('Enhanced markdown parsing failed, using fallback:', error);
    }

    return relationships;
  }

  /**
   * Extract text file relationships (simple path references)
   */
  private async extractTextRelationships(filePath: string, content: string): Promise<InitialRelationship[]> {
    const relationships: InitialRelationship[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Look for file paths in documentation
      const pathMatches = line.match(/(?:file|path|script|config):\s*([^\s,;]+)/gi);
      if (pathMatches) {
        for (const match of pathMatches) {
          const pathPart = match.split(':')[1]?.trim();
          if (pathPart) {
            const targetPath = this.resolveFilePath(filePath, pathPart);
            if (targetPath) {
              relationships.push({
                sourceFile: filePath,
                targetFile: targetPath,
                type: 'REFERENCES_FILE',
                confidence: 0.60,
                metadata: {
                  lineNumber,
                  context: line.trim(),
                  pattern: 'text_file_reference',
                  reason: 'File reference in documentation'
                }
              });
            }
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Extract generic path references that could be files
   */
  private async extractGenericPathReferences(filePath: string, content: string): Promise<InitialRelationship[]> {
    const relationships: InitialRelationship[] = [];

    // Pattern for potential file paths
    const pathPatterns = [
      /\.\/[\w./\-]+\.\w+/g,      // ./relative/path.ext
      /\.\.\/[\w./\-]+\.\w+/g,    // ../relative/path.ext
      /\/src\/[\w./\-]+\.\w+/g,   // /src/absolute/path.ext
      /\/[\w./\-]+\.\w{2,4}/g     // /absolute/path.ext
    ];

    for (const pattern of pathPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const potentialPath = match[0];

        // Skip some common false positives
        if (this.isLikelyFalsePositive(potentialPath)) {
          continue;
        }

        const targetPath = this.resolveFilePath(filePath, potentialPath);
        if (targetPath) {
          relationships.push({
            sourceFile: filePath,
            targetFile: targetPath,
            type: 'REFERENCES_FILE',
            confidence: 0.50, // Lower confidence for generic detection
            metadata: {
              context: potentialPath,
              pattern: 'generic_path',
              reason: 'Generic path pattern match'
            }
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Check if a path is likely a false positive
   */
  private isLikelyFalsePositive(path: string): boolean {
    const falsePositives = [
      /\.(min|map)\.js$/,     // Minified/source map files
      /^https?:\/\//,         // URLs
      /^ftp:\/\//,           // FTP URLs
      /\.(git|svn|hg)/,      // Version control
      /node_modules/,         // Dependencies
      /\.tmp$/,              // Temporary files
      /\.(log|cache)$/       // Log/cache files
    ];

    return falsePositives.some(pattern => pattern.test(path));
  }

  /**
   * Resolve a relative or absolute file path
   */
  private resolveFilePath(sourcePath: string, targetPath: string): string | null {
    try {
      let resolvedPath: string;

      if (isAbsolute(targetPath)) {
        resolvedPath = targetPath;
      } else {
        // Resolve relative to the source file's directory
        const sourceDir = dirname(sourcePath);
        resolvedPath = resolve(sourceDir, targetPath);
      }

      // Validate that the path exists and is within workspace
      if (this.workspaceRoot && !resolvedPath.startsWith(this.workspaceRoot)) {
        return null; // Outside workspace
      }

      if (existsSync(resolvedPath) && statSync(resolvedPath).isFile()) {
        return resolvedPath;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if file is a shell script
   */
  private isShellScript(filePath: string, content: string): boolean {
    const ext = extname(filePath).toLowerCase();
    const shellExts = ['.sh', '.bash', '.zsh', '.fish', '.ksh'];

    if (shellExts.includes(ext)) {
      return true;
    }

    // Check shebang
    if (content.startsWith('#!') && /\b(bash|sh|zsh|fish|ksh)\b/.test(content.split('\n')[0])) {
      return true;
    }

    return false;
  }

  /**
   * Check if file is a Makefile
   */
  private isMakefile(fileName: string): boolean {
    const makefileNames = ['makefile', 'Makefile', 'GNUmakefile'];
    return makefileNames.includes(fileName) || fileName.endsWith('.mk');
  }

  /**
   * Check if file is a Dockerfile
   */
  private isDockerfile(fileName: string): boolean {
    return fileName === 'dockerfile' || fileName === 'Dockerfile' || fileName.startsWith('Dockerfile.');
  }

  /**
   * Check if file is a Markdown file
   */
  private isMarkdownFile(ext: string): boolean {
    const markdownExts = ['.md', '.markdown', '.mdown', '.mkd', '.mkdn', '.mdx'];
    return markdownExts.includes(ext);
  }

  /**
   * Check if file is a text file
   */
  private isTextFile(ext: string): boolean {
    const textExts = ['.txt', '.rst', '.log', '.cfg', '.conf', '.ini'];
    return textExts.includes(ext);
  }

  /**
   * Remove duplicate relationships
   */
  private deduplicateRelationships(relationships: InitialRelationship[]): InitialRelationship[] {
    const seen = new Map<string, InitialRelationship>();

    for (const rel of relationships) {
      const key = `${rel.sourceFile}:${rel.targetFile}:${rel.type}`;
      const existing = seen.get(key);

      if (!existing || rel.confidence > existing.confidence) {
        seen.set(key, rel);
      }
    }

    return Array.from(seen.values());
  }
}

// Export default instance for convenience
export const initialLinker = InitialLinker.getInstance();