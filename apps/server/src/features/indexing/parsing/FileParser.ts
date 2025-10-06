import { readFile, stat, access } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { dirname, extname, join, relative, resolve as resolvePath, sep } from 'path';
import {
  ParserFactory,
  Relationship,
  TSModuleResolver
} from '@felix/code-intelligence';
import type {
  IComponent,
  IRelationship,
  ParseDocumentOptions,
  ProgressCallback
} from '@felix/code-intelligence';
import { DatabaseManager } from '../../storage/DatabaseManager.js';
import { IgnorePatterns } from '../../../utils/IgnorePatterns.js';
import type { FileIndexingOptions, FileIndexingResult } from '../types.js';
import { RelationshipNormalizerService } from '../../relationships/services/RelationshipNormalizerService.js';
import { logger } from '../../../shared/logger.js';
import { StdLibCatalog } from '../../relationships/services/StdLibCatalog.js';

type AggregatedRelationshipMetadata = {
  mergedFromCount: number;
  highestOriginalConfidence: number;
  lowestOriginalConfidence: number;
  consensusScore: number;
  lastUpdated: number;
};

type AggregatedRelationship = {
  id?: string;
  sourceId: string;
  targetId: string;
  type: string;
  confidence: number;
  finalConfidence: number;
  metadata?: Record<string, any>;
  sources: Array<Record<string, any>>;
  aggregationMetadata: AggregatedRelationshipMetadata;
};

export class FileParser {
  constructor(
    private readonly dbManager: DatabaseManager,
    private readonly parserFactory: ParserFactory,
    private readonly options: FileIndexingOptions,
    private readonly ignorePatterns: IgnorePatterns | null
  ) {}

  async parseForIndex(filePath: string, onProgress?: ProgressCallback): Promise<FileIndexingResult> {
    try {
      const startTime = Date.now();
      const lower = filePath.toLowerCase();
      const ext = extname(filePath).toLowerCase();
      const isDbArtifact = lower.endsWith('.db') || lower.endsWith('.db-wal') || lower.endsWith('.db-shm') || lower.endsWith('.sqlite') || lower.endsWith('.sqlite3');
      const isExcludedExt = this.options.excludeExtensions?.some(e => e.toLowerCase() === ext);
      const isInExcludedDir = this.options.excludeDirectories?.some(dir =>
        filePath.includes(`${sep}${dir}${sep}`) ||
        filePath.includes(`${sep}${dir}/`) ||
        filePath.endsWith(`${sep}${dir}`)
      );

      if (this.ignorePatterns?.shouldIgnore(filePath) || isExcludedExt || isDbArtifact || isInExcludedDir || lower.includes(`${sep}.felix${sep}`)) {
        return {
          success: false,
          filePath,
          components: [],
          relationships: [],
          errors: [{ line: 0, column: 0, message: 'File ignored by ignore/exclude configuration', severity: 'info' }],
          language: 'unknown',
          processingTime: Date.now() - startTime
        };
      }

      const stats = await stat(filePath);
      const maxFileSize = this.options.maxFileSize ?? 1024 * 1024;
      if (stats.size > maxFileSize) {
        return {
          success: false,
          filePath,
          components: [],
          relationships: [],
          errors: [{ line: 0, column: 0, message: `File too large: ${stats.size} bytes`, severity: 'warning' }],
          language: 'unknown',
          processingTime: Date.now() - startTime
        };
      }

      const content = await readFile(filePath, 'utf-8');

      const parseOptions: ParseDocumentOptions = {
        workspaceRoot: this.dbManager.getProjectPath(),
        confidenceThreshold: 0.5
      };

      const docResult = await this.parserFactory.parseDocument(filePath, content, parseOptions);
      const docLanguage = docResult.metadata.languagesDetected?.[0] || docResult.components[0]?.language || 'unknown';
      const relationships = this.convertAggregatedRelationships(docResult.relationships);

      const { toProjectRelativePosix } = await import('../../../utils/PathUtils.js');
      const projectRoot = this.dbManager.getProjectPath();
      for (const component of docResult.components) {
        if (component.filePath) {
          component.filePath = toProjectRelativePosix(component.filePath, projectRoot);
        }
      }

      const ensuredRelationships = this.ensureContainmentRelationships(
        docResult.components,
        relationships
      );

      const normalized = await this.normalizeUnresolvedImportTargets(ensuredRelationships, filePath, docLanguage);
      const normalizer = new RelationshipNormalizerService();
      const relationshipsWithIds = normalizer.normalize(normalized);

      return {
        success: true,
        filePath,
        components: docResult.components,
        relationships: relationshipsWithIds,
        errors: [],
        language: docLanguage,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        filePath,
        components: [],
        relationships: [],
        errors: [{ line: 0, column: 0, message: String(error), severity: 'error' }],
        language: 'unknown',
        processingTime: 0
      };
    }
  }

  private convertAggregatedRelationships(relationships: AggregatedRelationship[]): IRelationship[] {
    if (!Array.isArray(relationships)) {
      return [];
    }

    return relationships.map(rel => {
      const metadata = { ...(rel.metadata || {}) } as Record<string, any>;
      if (metadata.confidence === undefined) {
        metadata.confidence = rel.finalConfidence;
      }
      metadata.finalConfidence = rel.finalConfidence;
      metadata.aggregation = rel.aggregationMetadata;
      metadata.sources = rel.sources;

      return {
        id: Relationship.computeId(rel.type as any, rel.sourceId, rel.targetId, undefined),
        type: rel.type,
        sourceId: rel.sourceId,
        targetId: rel.targetId,
        metadata
      } as IRelationship;
    });
  }

  private ensureContainmentRelationships(components: IComponent[], relationships: IRelationship[]): IRelationship[] {
    try {
      const rels = Array.isArray(relationships) ? [...relationships] : [];
      const relKey = (r: any) => `${r.sourceId}|${r.type}|${r.targetId}`.toLowerCase();
      const seen = new Set(rels.map(relKey));

      const containers = components.filter((c: any) =>
        ['class', 'interface', 'enum', 'namespace', 'module', 'struct', 'trait', 'protocol', 'mixin'].includes(String(c.type))
      );
      const members = components.filter((c: any) =>
        ['method', 'property', 'constructor', 'accessor', 'function', 'variable', 'constant'].includes(String(c.type))
      );

      const push = (src: any, tgt: any, type: string, meta: any) => {
        const relationship = {
          id: Relationship.computeId(type, src.id, tgt.id, undefined),
          type,
          sourceId: src.id,
          targetId: tgt.id,
          metadata: meta
        } as IRelationship;
        const key = relKey(relationship);
        if (!seen.has(key)) {
          seen.add(key);
          rels.push(relationship);
        }
      };

      const componentMap = new Map(components.map((c: any) => [c.id, c]));
      let parentIdRelCount = 0;
      let missingParentCount = 0;
      for (const child of components) {
        if (!child.parentId) continue;
        const parent = componentMap.get(child.parentId);
        if (!parent) {
          missingParentCount++;
          logger.debug(`[FileParser] Missing parent: child.id=${child.id}, child.parentId=${child.parentId}`);
          continue;
        }

        parentIdRelCount++;
        let relType = 'contains';
        const parentType = String(parent.type);
        const childType = String(child.type);

        if (parentType === 'class') {
          if (childType === 'method' || childType === 'constructor') {
            relType = 'class-contains-method';
          } else if (childType === 'property' || childType === 'accessor') {
            relType = 'class-contains-property';
          } else {
            relType = 'class-contains-member';
          }
        } else if (parentType === 'interface') {
          if (childType === 'method') {
            relType = 'interface-contains-method';
          } else if (childType === 'property') {
            relType = 'interface-contains-property';
          } else {
            relType = 'interface-contains-member';
          }
        } else if (parentType === 'namespace') {
          if (childType === 'class') {
            relType = 'namespace-contains-class';
          } else if (childType === 'interface') {
            relType = 'namespace-contains-interface';
          } else {
            relType = 'namespace-contains-member';
          }
        }

        push(parent, child, relType, {
          baseType: 'contains',
          detection: 'parentId',
          parentType,
          childType
        });
      }

      logger.debug(`[FileParser] Created ${parentIdRelCount} contains relationships from parentId for ${components.length} components`);
      logger.debug('[FileParser] Missing parents:', missingParentCount);
      logger.debug('[FileParser] Total relationships before dedup:', rels.length);

      const fileComponent = components.find((c: any) => String(c.type) === 'file');
      if (fileComponent) {
        const containedIds = new Set(rels.filter(r => r.sourceId === fileComponent.id).map(r => r.targetId));
        for (const component of components) {
          if (component.id === fileComponent.id) continue;
          if (component.parentId) continue;
          if (containedIds.has(component.id)) continue;
          push(fileComponent, component, 'contains', { relationship: 'file-contains-component', componentType: component.type, componentName: component.name });
        }
      }

      const within = (child: any, parent: any) => {
        if (!child?.location || !parent?.location) return false;
        return (
          child.location.startLine >= parent.location.startLine &&
          child.location.endLine <= parent.location.endLine
        );
      };

      for (const parent of containers) {
        for (const child of members) {
          if (child.parentId) continue;
          if (child.id === parent.id) continue;
          if (!within(child, parent)) continue;

          let relType = 'class-contains-member';
          if (String(parent.type) === 'interface') {
            relType = 'interface-contains-member';
          }
          if (String(child.type) === 'method' || String(child.type) === 'constructor') {
            relType = String(parent.type) === 'interface' ? 'interface-contains-method' : 'class-contains-method';
          } else if (String(child.type) === 'property' || String(child.type) === 'accessor') {
            relType = String(parent.type) === 'interface' ? 'interface-contains-property' : 'class-contains-property';
          }

          push(parent, child, relType, { baseType: 'contains', detection: 'line-range-fallback' });
        }
      }

      logger.debug('[FileParser] Final contains relationships:', rels.length);
      return rels;
    } catch {
      return Array.isArray(relationships) ? relationships : [];
    }
  }

  private async normalizeUnresolvedImportTargets(
    relationships: IRelationship[],
    filePath: string,
    language?: string
  ): Promise<IRelationship[]> {
    try {
      const lang = String(language || '').toLowerCase();
      const workspaceRoot = this.dbManager.getProjectPath();
      const ignore = this.ignorePatterns;
      const tsResolver = new TSModuleResolver();

      const classify = (spec: string): 'path' | 'bare' | 'namespace' | 'junk' => {
        if (!spec) return 'junk';
        const s = spec.trim();
        if (s.startsWith('{') || s.startsWith('[') || s.includes('|class:') || s.includes('class:') || s.includes('file:')) return 'junk';
        if (s.startsWith('./') || s.startsWith('../') || s.startsWith('/') || s.includes('\\')) {
          if (s.includes('\\') && !s.includes('/')) return 'namespace';
          return 'path';
        }
        if (/[\n\r]/.test(s)) return 'junk';
        return 'bare';
      };

      const toModuleKey = (absPath: string): string => {
        const relPath = relative(workspaceRoot, absPath).split('\\').join('/');
        return relPath.replace(/\.[^.]+$/, '');
      };

      const tryDistSrcProbe = async (absPath: string): Promise<string | null> => {
        try {
          if (absPath.includes('/dist/')) {
            const srcJs = absPath.replace('/dist/', '/src/');
            if (!ignore?.shouldIgnore(srcJs) && await this.safeExists(srcJs)) return srcJs;
            if (srcJs.endsWith('.js')) {
              const srcTs = srcJs.replace(/\.js$/, '.ts');
              const srcTsx = srcJs.replace(/\.js$/, '.tsx');
              if (!ignore?.shouldIgnore(srcTs) && await this.safeExists(srcTs)) return srcTs;
              if (!ignore?.shouldIgnore(srcTsx) && await this.safeExists(srcTsx)) return srcTsx;
            }
          }
        } catch {}
        return null;
      };

      const mapped: IRelationship[] = [];

      for (const r of relationships) {
        try {
          if (!r || !r.type || !r.targetId) {
            mapped.push(r);
            continue;
          }

          const type = String(r.type).toLowerCase();
          const target = String(r.targetId);
          const meta = { ...(r.metadata || {}) } as any;

          const looksImport =
            type === 'imports' ||
            type === 'imports_from' ||
            meta.importType ||
            meta.importKind;

          if (!looksImport) {
            mapped.push(r);
            continue;
          }

          if (target.startsWith('RESOLVE:')) {
            const spec0 = target.slice('RESOLVE:'.length);
            const classif = classify(spec0);
            meta.classification = meta.classification || classif;
            if (StdLibCatalog.isStdlib(language || '', spec0)) {
              meta.isExternal = true;
            }

            if (!meta.isExternal && classif === 'bare' && (lang === 'typescript' || lang === 'javascript')) {
              try {
                const resolved = await tsResolver.resolveModule(spec0, filePath, workspaceRoot);
                if (resolved && resolved.resolvedPath && resolved.resolvedPath.startsWith(workspaceRoot) && !ignore?.shouldIgnore(resolved.resolvedPath)) {
                  meta.resolutionMethod = resolved.resolutionMethod;
                  meta.resolvedPath = resolved.resolvedPath;
                  meta.moduleKey = toModuleKey(resolved.resolvedPath);
                } else if (resolved && resolved.isExternal === true) {
                  meta.isExternal = true;
                }
              } catch {}
            }

            if (!meta.isExternal && classif === 'path') {
              let abs = resolvePath(dirname(filePath), spec0);
              if (ignore?.shouldIgnore(abs)) {
                meta.isIgnored = true;
              }
              if (!await this.safeExists(abs)) {
                const probed = await tryDistSrcProbe(abs);
                if (probed) abs = probed;
                if (!await this.safeExists(abs) && abs.endsWith('.js')) {
                  const ts = abs.replace(/\.js$/, '.ts');
                  const tsx = abs.replace(/\.js$/, '.tsx');
                  if (await this.safeExists(ts)) {
                    abs = ts;
                  } else if (await this.safeExists(tsx)) {
                    abs = tsx;
                  }
                }
              }
              if (await this.safeExists(abs) && !ignore?.shouldIgnore(abs)) {
                meta.resolvedPath = meta.resolvedPath || abs;
                meta.moduleKey = meta.moduleKey || toModuleKey(abs);
              }
            }

            if (meta.needsResolution !== false) meta.needsResolution = true;
            mapped.push({ ...r, metadata: meta });
            continue;
          }

          if (target.startsWith('MODULE:')) {
            const spec = target.replace('MODULE:', '') ;
            meta.specifier = meta.specifier || spec;
            meta.importKind = meta.importKind || meta.importType || (meta.itemName ? 'named' : 'module');
            meta.importedName = meta.importedName || meta.itemName;
            meta.needsResolution = true;
            meta.classification = meta.classification || classify(spec);
            if (StdLibCatalog.isStdlib(language || '', spec)) meta.isExternal = true;
            mapped.push({ ...r, targetId: `RESOLVE:${spec}`, metadata: meta });
            continue;
          }

          if (target.startsWith('CLASS:')) {
            const spec = target.replace('CLASS:', '');
            meta.specifier = meta.specifier || spec;
            meta.importKind = meta.importKind || 'use';
            meta.needsResolution = true;
            meta.classification = meta.classification || classify(spec);
            mapped.push({ ...r, targetId: `RESOLVE:${spec}`, metadata: meta });
            continue;
          }

          if (target.startsWith('FILE:')) {
            const spec = target.replace('FILE:', '');
            meta.specifier = meta.specifier || spec;
            meta.importKind = meta.importKind || meta.importType || 'include';
            meta.needsResolution = true;
            meta.classification = meta.classification || 'path';
            mapped.push({ ...r, targetId: `RESOLVE:${spec}`, metadata: meta });
            continue;
          }

          if (target.startsWith('UNRESOLVED:')) {
            const spec = target.replace('UNRESOLVED:', '');
            meta.specifier = meta.specifier || spec;
            meta.needsResolution = true;
            meta.classification = meta.classification || classify(spec);
            mapped.push({ ...r, targetId: `RESOLVE:${spec}`, metadata: meta });
            continue;
          }

          mapped.push(r);
        } catch {
          mapped.push(r);
        }
      }

      return mapped;
    } catch {
      return relationships;
    }
  }

  private async safeExists(path: string): Promise<boolean> {
    if (!path) return false;
    try {
      await access(path, fsConstants.F_OK);
      const stats = await stat(path);
      return stats.isFile();
    } catch {
      return false;
    }
  }
}
