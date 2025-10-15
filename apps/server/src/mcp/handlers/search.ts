import fs from 'fs/promises';
import { createHash } from 'crypto';
import type { OptimizationResult } from '@felix/code-intelligence';
import { projectManager } from '../project-manager.js';
import { appConfig } from '../../shared/config.js';
import { getProjectNotFoundError } from '../utils/project-errors.js';
import {
  createJsonContent,
  createTextContent,
  ensureArray,
  type SearchHelpRequest,
  type SearchQueryRequest,
  type SearchRelatedRequest,
  type SearchToolRequest
} from '../types/contracts.js';

function formatOptimizedResults(
  optimized: OptimizationResult,
  operationType: string = 'search',
  totalAvailable?: number,
  tokenLimit: number = 25000
): string {
  const { optimizedData, originalTokens, finalTokens, itemsRemoved, warnings } = optimized;
  const actualTotalResults = totalAvailable || (itemsRemoved + optimizedData.items.length);
  const wasContentTruncated = actualTotalResults > optimizedData.items.length;
  const percentRemoved = (itemsRemoved / actualTotalResults) * 100;

  let warningText = '';
  if (wasContentTruncated && (percentRemoved > 10 || itemsRemoved > 10)) {
    warningText = `🚨 **CONTENT TRUNCATED FOR MCP TOKEN LIMITS** 🚨\n`;
    warningText += `This ${operationType} found ${actualTotalResults} total results, but only ${optimizedData.items.length} are shown to fit the ${Math.floor(tokenLimit / 1000)}K token limit.\n\n`;
  }

  const itemsText = optimizedData.items
    .map(item => {
      const nameText = item.name ? `**${item.name}**` : 'Unnamed';
      const typeText = item.type ? ` (${item.type})` : '';
      const idText = item.id ? `\nID: ${item.id}` : '';
      const contentText = item.content ? `\n${item.content}` : '';
      return `${nameText}${typeText}${idText}${contentText}`;
    })
    .join('\n\n');

  const statsText = `\n\n--- Optimization Stats ---\nOriginal tokens: ${originalTokens}\nFinal tokens: ${finalTokens}\nItems removed: ${itemsRemoved}\nItems included: ${optimizedData.items.length}`;
  const optimizationWarnings = warnings && warnings.length > 0 ? `\nWarnings: ${warnings.join(',')}` : '';
  return warningText + itemsText + statsText + optimizationWarnings;
}

export async function handleSearchTools(request: SearchToolRequest) {
  const projectInfo = await projectManager.getProject(request.project);
  if (!projectInfo) {
    const errorMessage = await getProjectNotFoundError(request.project);
    throw new Error(errorMessage);
  }

  switch (request.action) {
    case 'help': {
      const { HelpService } = await import('../../features/help/services/HelpService.js');
      const pack = HelpService.get('workflows');
      return { content: [createJsonContent(pack)] };
    }
    case 'search': {
      const searchRequest = request as SearchQueryRequest;
      const entityTypes = ensureArray<string>(searchRequest.entity_types) ?? ['component'];
      const codeFirst = searchRequest.code_first !== false;

      const rerankConfig = codeFirst
        ? {
            boosts: {
              entityTypeWeights: { component: 1.0, task: 0.4, note: 0.35, rule: 0.35 },
              pathDemotePatterns: appConfig.search.rerank.pathDemotePatterns,
              pathDemoteAmount: appConfig.search.rerank.pathDemoteAmount
            }
          }
        : undefined;

      let searchResults = await projectInfo.codeIndexer.searchSemanticUniversal(searchRequest.query, {
        entityTypes,
        limit: searchRequest.max_results || 10,
        similarityThreshold: searchRequest.similarity_threshold ?? appConfig.search.similarityThreshold,
        rerankConfig,
        componentTypes: ensureArray<string>(searchRequest.component_types) ?? [],
        lang: ensureArray<string>(searchRequest.lang) ?? [],
        pathInclude: ensureArray<string>(searchRequest.path_include) ?? [],
        pathExclude: ensureArray<string>(searchRequest.path_exclude) ?? []
      });

      const compTypes = ensureArray<string>(searchRequest.component_types) ?? [];
      const langs = ensureArray<string>(searchRequest.lang) ?? [];
      const incPaths = ensureArray<string>(searchRequest.path_include) ?? [];
      const excPaths = ensureArray<string>(searchRequest.path_exclude) ?? [];

      if (compTypes.length || langs.length || incPaths.length || excPaths.length) {
        const filtered = searchResults.results.filter((r: any) => {
          if (r.entityType === 'component') {
            const ct = (r.entity?.type || '').toString();
            const lang = (r.entity?.language || '').toString();
            const fp = (r.entity?.filePath || '').toString();
            if (compTypes.length && !compTypes.includes(ct)) return false;
            if (langs.length && !langs.includes(lang)) return false;
            if (incPaths.length && !incPaths.some(s => fp.includes(s))) return false;
            if (excPaths.length && excPaths.some(s => fp.includes(s))) return false;
          }
          return true;
        });
        searchResults = { ...searchResults, results: filtered };
      }

      // Filter by Knowledge Base if kb_ids specified
      const kbIds = ensureArray<string>(searchRequest.kb_ids) ?? [];
      if (kbIds.length > 0) {
        const { DatabaseManager } = await import('../../features/storage/DatabaseManager.js');
        const { KnowledgeBase } = await import('../../features/storage/entities/metadata/KnowledgeBase.entity.js');

        const dbManager = DatabaseManager.getInstance(request.project);
        await dbManager.initialize();
        const kbRepo = dbManager.getMetadataDataSource().getRepository(KnowledgeBase);
        const notesRepo = dbManager.getNotesRepository();

        // Helper function to recursively get all descendant note IDs
        async function getAllDescendants(parentId: string, visited = new Set<string>()): Promise<Set<string>> {
          if (visited.has(parentId)) return visited;
          visited.add(parentId);
          const childIds = await notesRepo.getNoteChildren(parentId);
          for (const childId of childIds) {
            await getAllDescendants(childId, visited);
          }
          return visited;
        }

        // Get all allowed note IDs from the specified KBs
        const allowedNoteIds = new Set<string>();
        for (const kbId of kbIds) {
          const kb = await kbRepo.findOne({ where: { id: kbId } });
          if (kb) {
            const descendants = await getAllDescendants(kb.root_note_id);
            descendants.forEach(id => allowedNoteIds.add(id));
          }
        }

        // Filter search results to only include notes in the allowed KBs
        const filtered = searchResults.results.filter((r: any) => {
          if (r.entityType === 'note') {
            return allowedNoteIds.has(r.entity?.id);
          }
          // Keep non-note entities
          return true;
        });
        searchResults = { ...searchResults, results: filtered };
      }

      const { ContentOptimizer } = await import('@felix/code-intelligence');
      const tokenLimit = searchRequest.context_window_size || 25000;
      const optimizer = new ContentOptimizer({
        targetTokens: tokenLimit,
        includeSourceCode: false,
        includeRelationships: false,
        outputFormat: 'text',
        minified: searchRequest.skeleton_verbose ? false : true
      });
      const { makeSkeletonTextForComponent } = await import('../../utils/SkeletonUtil.js');
      const buildSkeleton = async (result: any): Promise<string> => {
        try {
          if (result.entityType !== 'component') return '';
          return await makeSkeletonTextForComponent(projectInfo.codeIndexer as any, result.entity);
        } catch {
          return '';
        }
      };

      const contextItems = await Promise.all(
        searchResults.results.map(async (result: any, index: number) => {
          const base = {
            id: result.entity.id || `search-result-${index}`,
            name: result.entity.name || result.entity.title || 'Unnamed',
            type: result.entityType,
            metadata: result.entity
          } as any;
          const skeleton = await buildSkeleton(result);
          const content = skeleton || result.entity.description || result.entity.content || '';
          return { ...base, content };
        })
      );

      const view = searchRequest.view;
      const fields = ensureArray<string>(searchRequest.fields);
      const outputFormat = searchRequest.output_format || 'text';

      const parseFields = (): string[] | null => {
        if (fields && fields.length) return fields;
        if (view) {
          switch (String(view)) {
            case 'ids':
              return ['id'];
            case 'names':
              return ['id', 'name'];
            case 'files':
              return ['id', 'filePath'];
            case 'files+lines':
              return ['id', 'filePath', 'location'];
            case 'full':
            default:
              return null;
          }
        }
        return null;
      };

      const fieldSet = parseFields();
      if (outputFormat === 'json' || fieldSet) {
        const rows = await Promise.all(
          searchResults.results.map(async (r: any) => {
            const entity: any = r.entity;
            const base: any = {
              id: entity.id,
              name: entity.name || entity.title,
              type: r.entityType,
              filePath: entity.filePath,
              location: entity.location
            };
            if (r.entityType === 'component') {
              base.skeleton = await buildSkeleton(r);
            }
            if (!fieldSet) return base;
            const row: any = {};
            for (const field of fieldSet) {
              if (field === 'name') row.name = entity.name || entity.title;
              else if (field === 'location') row.location = entity.location;
              else row[field] = entity[field];
            }
            if (!row.type) row.type = r.entityType;
            return row;
          })
        );
        return { content: [createJsonContent({ items: rows })] };
      }

      const optimized = await optimizer.optimize({ items: contextItems, relationships: [] }, { query: searchRequest.query });
      return {
        content: [
          createTextContent(
            formatOptimizedResults(optimized, 'search', searchResults.results.length, tokenLimit)
          )
        ]
      };
    }
    case 'search_related': {
      const relatedRequest = request as SearchRelatedRequest & Record<string, unknown>;
      const additional: Record<string, unknown> = { ...relatedRequest };
      delete additional.project;
      delete additional.action;
      delete additional.query;
      delete additional.context_window_size;
      const relatedResults = await projectInfo.codeIndexer.searchDiscover({
        query: relatedRequest.query,
        contextWindowSize: relatedRequest.context_window_size,
        ...additional
      });
      return { content: [createJsonContent(relatedResults)] };
    }
    default:
      throw new Error(`Unknown search action: ${(request as SearchHelpRequest).action}`);
  }
}
