import type { Response } from 'express';
import { logger } from '../../../shared/logger.js';
import { getProjectIndexer, getCurrentProject } from '../projectContext.js';
import { requireProjectIndexer, type ProjectRequest } from '../../middleware/projectMiddleware.js';

function buildAnchoredSnippet(text: string, needle: string, linesAround = 3) {
  try {
    if (!text) return { snippet: '', anchor: { line_from: 0, line_to: 0 }, reason: 'no_content' };
    const safeNeedle = (needle || '').trim();
    const lower = text.toLowerCase();
    const idx = safeNeedle ? lower.indexOf(safeNeedle.toLowerCase()) : -1;
    const lines = text.split(/\r?\n/);
    if (idx < 0) {
      const line_to = Math.min(lines.length, Math.max(1, linesAround * 2 + 1));
      const block = lines.slice(0, line_to).join('\n');
      return { snippet: block, anchor: { line_from: 1, line_to }, reason: 'fallback_head' };
    }
    let running = 0;
    let hitLine = 1;
    for (let i = 0; i < lines.length; i++) {
      const n = (lines[i] ?? '').length + 1;
      if (running + n > idx) { hitLine = i + 1; break; }
      running += n;
    }
    const from = Math.max(1, hitLine - linesAround);
    const to = Math.min(lines.length, hitLine + linesAround);
    const block = lines.slice(from - 1, to).join('\n');
    return { snippet: block, anchor: { line_from: from, line_to: to }, reason: 'text_match' };
  } catch {
    return { snippet: '', anchor: { line_from: 0, line_to: 0 }, reason: 'error' };
  }
}

export function createGetSearchHandler() {
  return async function searchGetHandler(req: ProjectRequest, res: Response) {
  try {
    const { query, q, core, context, similarity_threshold, limit, max_results = 100, entity_type, component_types, disable_new_scoring, view, fields, path_include, path_exclude, lang, max_per_type, attachments, attachments_limits, include_link_counts, output_format, include_details } = req.query as any;
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    const results: any[] = [];
    const startedAt = Date.now();
    const queryStr = (query as string || '').trim();
    const limitNum = parseInt((limit ?? max_results) as string) || 100;
    
    // Phase 1: Dual-channel parsing (core vs. context)
    const parseStructuredQuery = (input: string) => {
      const sections = { user: '', system: '', topics: '' } as { user: string; system: string; topics: string };
      if (!input) return sections;
      const lines = input.split(/\r?\n/);
      let current: keyof typeof sections | null = null;
      for (const raw of lines) {
        const line = String(raw);
        if (/^\s*User\s+Query\s*:/i.test(line)) { current = 'user'; sections.user += (sections.user ? ' ' : '') + line.replace(/^\s*User\s+Query\s*:/i, '').trim(); continue; }
        if (/^\s*System\s+Context\s*:/i.test(line)) { current = 'system'; sections.system += (sections.system ? ' ' : '') + line.replace(/^\s*System\s+Context\s*:/i, '').trim(); continue; }
        if (/^\s*Topics\s*:/i.test(line)) { current = 'topics'; sections.topics += (sections.topics ? ' ' : '') + line.replace(/^\s*Topics\s*:/i, '').trim(); continue; }
        if (current) sections[current] += (sections[current] ? ' ' : '') + line.trim();
      }
      return sections;
    };
    const structured = parseStructuredQuery(queryStr);
    const coreQueryStr = String(q || core || structured.user || queryStr || '').trim();
    const contextQueryStr = String(context || structured.system || '').trim();
    const topicsStr = structured.topics || '';
    // Default: NEW scoring enabled. To force legacy, pass disable_new_scoring=true or set env SEARCH_NEW_SCORING=0
    const featureDisabled = String(disable_new_scoring || '').toLowerCase() === 'true' || process.env.SEARCH_NEW_SCORING === '0';
    const simThreshold = (similarity_threshold !== undefined && similarity_threshold !== null) ? parseFloat(similarity_threshold) : 0.0;
    
    // Parse entity_type parameter - convert singular to plural for internal use
    // Default conservative: code-only seeds
    const rawEntityTypes = entity_type ? (entity_type as string).split(',').map(t => t.trim()) : ['component'];
    const entityTypes = rawEntityTypes.map(type => {
      switch(type) {
        case 'component': return 'components';
        case 'file': return 'files'; 
        case 'note': return 'notes';
        case 'task': return 'tasks';
        case 'rule': return 'rules';
        default: return type.endsWith('s') ? type : type + 's'; // Handle both singular and plural
      }
    });
    
    // Parse component_types and other filters (normalize)
    const componentTypeFilterRaw = component_types ? (component_types as string).split(',').map(t => t.trim()) : [];
    const normalizeType = (t: string) => String(t || '').toLowerCase();
    const componentTypeFilter = componentTypeFilterRaw.map(normalizeType);
    const langFilterRaw = lang ? (lang as string).split(',').map(s => s.trim()) : [];
    const normalizeLang = (l: string) => {
      const v = String(l || '').toLowerCase();
      if (v === 'ts' || v === 'tsx' || v === 'typescript') return 'typescript';
      if (v === 'js' || v === 'jsx' || v === 'javascript') return 'javascript';
      if (v === 'py' || v === 'python') return 'python';
      if (v === 'rb' || v === 'ruby') return 'ruby';
      if (v === 'php') return 'php';
      if (v === 'java') return 'java';
      if (v === 'go' || v === 'golang') return 'go';
      return v;
    };
    const langFilter = langFilterRaw.map(normalizeLang);
    const pathInclude = path_include ? (path_include as string).split(',').map(s => s.trim()) : [];
    const pathExclude = path_exclude ? (path_exclude as string).split(',').map(s => s.trim()) : [];
    const perTypeCap = max_per_type ? parseInt(max_per_type as string) : 0;
    const entityCounts = {
      components: 0,
      files: 0,
      notes: 0,
      tasks: 0,
      rules: 0,
      relationships: 0
    };

    const includeDetails = String(include_details ?? '').toLowerCase() === 'true';
    
    // Query preprocessing for better matching
    const preprocessQuery = (query: string) => {
      return {
        original: query,
        normalized: query.toLowerCase().trim(),
        withoutSpaces: query.replace(/\s+/g, '').toLowerCase(),
        tokens: query.toLowerCase().split(/\s+/).filter(t => t.length > 0)
      };
    };

    const processedQuery = preprocessQuery(coreQueryStr || queryStr);

    // Check if query looks like an ID (task_xxx, note_xxx, rule_xxx)
    const idPatterns = [
      { pattern: /^task_\w+$/i, type: 'task', getter: 'getTask' },
      { pattern: /^note_\w+$/i, type: 'note', getter: 'getNote' },
      { pattern: /^rule_\w+$/i, type: 'rule', getter: 'getRule' }
    ];
    
    let isIdSearch = false;
    for (const { pattern, type, getter } of idPatterns) {
      if (pattern.test(coreQueryStr || queryStr) && entityTypes.includes(`${type}s`)) {
        isIdSearch = true;
        try {
          const item = await (indexer as any)[getter](coreQueryStr || queryStr);
          if (item) {
            results.push({
              id: item.id,
              name: item.title || item.name || `${type} ${item.id}`,
              type: type,
              score: 1.0,
              filePath: item.entity_id || '',
              snippet: item.description || item.content || item.guidance_text || '',
              metadata: item
            });
            (entityCounts as any)[`${type}s`]++;
          }
        } catch (err) {
          logger.warn(`Failed to get ${type} by ID:`, err);
        }
        break;
      }
    }

    // Helper function to calculate name match score (normalized 0-1)
    const calculateNameMatchScore = (itemName: string, query: any) => {
      const normalizedName = itemName.toLowerCase();
      
      // Exact match (highest priority)
      if (normalizedName === query.normalized) return 1.0;
      
      // Exact match without spaces
      if (normalizedName.replace(/\s+/g, '') === query.withoutSpaces) return 0.9;
      
      // Starts with query
      if (normalizedName.startsWith(query.normalized)) return 0.75;
      
      // Contains all tokens
      const allTokensMatch = query.tokens.every((token: string) => normalizedName.includes(token));
      if (allTokensMatch) return 0.6;
      
      // Partial match
      if (normalizedName.includes(query.normalized)) return 0.5;
      
      return 0;
    };
    
    // If not an ID search, use unified semantic search
    if (!isIdSearch && (coreQueryStr || queryStr)) {
      // First try direct component search if searching for components
      if (entityTypes.includes('components') || entityTypes.includes('files')) {
        try {
          logger.debug('Direct component search', { query: coreQueryStr || queryStr });
          const componentResults = await indexer.searchComponents({ 
            name: coreQueryStr || queryStr,
            limit: limitNum
          });
          
          logger.debug('Component search results', { count: componentResults.items.length });
          
          for (const comp of componentResults.items) {
            // Apply component type filter (case-insensitive)
            if (componentTypeFilter.length > 0) {
              const ct = String(comp.type || '').toLowerCase();
              if (!componentTypeFilter.some(t => String(t).toLowerCase() === ct)) continue;
            }
            // Apply language filter
            if (langFilter.length > 0) {
              const langOk = langFilter.some(l => String(l).toLowerCase() === String(comp.language || '').toLowerCase());
              if (!langOk) continue;
            }
            // Apply path include/exclude
            if (pathInclude.length > 0) {
              const ok = pathInclude.some(s => String(comp.filePath || '').includes(String(s)));
              if (!ok) continue;
            }
            if (pathExclude.length > 0) {
              const bad = pathExclude.some(s => String(comp.filePath || '').includes(String(s)));
              if (bad) continue;
            }
            
            const nameMatchScore = calculateNameMatchScore(comp.name || '', processedQuery);
            results.push({
              id: comp.id,
              name: comp.name,
              type: comp.type,
              score: nameMatchScore,
              filePath: comp.filePath,
              snippet: comp.code?.substring(0, 200) || '',
              metadata: comp,
              nameMatchScore,
              semanticScore: 0
            });
            entityCounts.components++;
          }
        } catch (err) {
          logger.error('Direct component search failed:', err);
        }
      }
      
      try {
        // Convert entity types back to singular for the universal search
        let searchEntityTypes = entityTypes.map(type => {
          switch(type) {
            case 'components': return 'component';
            case 'tasks': return 'task'; 
            case 'notes': return 'note';
            case 'rules': return 'rule';
            default: return type.replace(/s$/, ''); // Remove trailing 's'
          }
        }) as ('component' | 'task' | 'note' | 'rule' | string)[];

        // Filter to supported types only
        searchEntityTypes = (searchEntityTypes as string[]).filter(t => (
          t === 'component' || t === 'task' || t === 'note' || t === 'rule'
        )) as ('component' | 'task' | 'note' | 'rule')[];

        const searchLimit = Math.max(50, limitNum);
        const rerankConfig = {
          weights: {},
          boosts: {
            contextText: `${contextQueryStr} ${topicsStr}`,
            perTypeZScore: true,
            perTypeWeights: {
              component: { similarity: 0.6, nameMatch: 0.2, contextOverlap: 0.2 },
              rule: { similarity: 0.4, analytics: 0.3, contextOverlap: 0.3 }
            },
            pathDemotePatterns: [/coverage\//i, /lcov-report\//i, /node_modules\//i],
            pathDemoteAmount: 0.2,
            entityTypeWeights: { component: 1.0, task: 0.7, note: 0.6, rule: 0.8 }
          }
        } as any;
        const searchResults = await indexer.searchSemanticUniversal(
          coreQueryStr || queryStr,
          {
            entityTypes: searchEntityTypes,
            limit: searchLimit,
            similarityThreshold: simThreshold,
            rerankConfig,
            componentTypes: componentTypeFilter,
            lang: langFilter,
            pathInclude,
            pathExclude
          }
        );

        // Transform results to match expected format
        for (const result of searchResults.results) {
          const entity = result.entity;
          const entityType = result.entityType;
          const similarity = result.similarity;
          
          let transformedResult: any;
          
          if (entityType === 'component') {
            const comp = entity as any;
            const ctNorm = String(comp.type || '').toLowerCase();
            const langNorm = normalizeLang(String(comp.language || ''));
            const fp = String(comp.filePath || '');
            // Filters
            if (componentTypeFilter.length > 0 && !componentTypeFilter.includes(ctNorm)) continue;
            if (langFilter.length > 0 && !langFilter.includes(langNorm)) continue;
            if (pathInclude.length > 0 && !pathInclude.some(s => fp.includes(s))) continue;
            if (pathExclude.length > 0 && pathExclude.some(s => fp.includes(s))) continue;

            const nameMatchScore = calculateNameMatchScore(comp.name || '', processedQuery);
            transformedResult = {
              id: comp.id,
              name: comp.name,
              type: comp.type,
              filePath: comp.filePath,
              location: comp.location,
              score: featureDisabled ? Math.min(1.0, similarity + Math.min(0.1, nameMatchScore * 0.05)) : similarity,
              nameMatchScore,
              semanticScore: similarity,
              metadata: comp
            };
            entityCounts.components++;
          } else if (entityType === 'task') {
            const task = entity as any;
            const nameMatchScore = calculateNameMatchScore(task.title || '', processedQuery);
            transformedResult = {
              id: task.id,
              name: task.title,
              type: 'task',
              score: featureDisabled ? Math.min(1.0, similarity + Math.min(0.1, nameMatchScore * 0.05)) : similarity,
              filePath: task.entity_id || '',
              snippet: task.description || '',
              metadata: task,
              nameMatchScore,
              semanticScore: similarity
            };
            entityCounts.tasks++;
          } else if (entityType === 'note') {
            const note = entity as any;
            const nameMatchScore = calculateNameMatchScore(note.title || '', processedQuery);
            transformedResult = {
              id: note.id,
              name: note.title || `Note ${note.id}`,
              type: 'note',
              score: featureDisabled ? Math.min(1.0, similarity + Math.min(0.1, nameMatchScore * 0.05)) : similarity,
              filePath: note.entity_id || '',
              snippet: note.content || '',
              metadata: note,
              nameMatchScore,
              semanticScore: similarity
            };
            entityCounts.notes++;
          } else if (entityType === 'rule') {
            const rule = entity as any;
            const nameMatchScore = calculateNameMatchScore(rule.name || '', processedQuery);
            transformedResult = {
              id: rule.id,
              name: rule.name,
              type: 'rule',
              score: featureDisabled ? Math.min(1.0, similarity + Math.min(0.1, nameMatchScore * 0.05)) : similarity,
              filePath: '',
              snippet: rule.description || rule.guidance_text || '',
              metadata: rule,
              nameMatchScore,
              semanticScore: similarity
            };
            entityCounts.rules++;
          }
          
          if (transformedResult) {
            results.push(transformedResult);
          }
        }
        logger.debug('Unified semantic search results', { count: results.length, entityTypes: searchEntityTypes });
      } catch (err) {
        logger.warn('Unified semantic search failed:', err);
      }
    }
    
    // Sort by combined score (name matching + semantic similarity)
    results.sort((a, b) => (b.score || 0) - (a.score || 0));
    // Optional per-type cap
    const capped: any[] = [];
    if (perTypeCap && perTypeCap > 0) {
      const counts: Record<string, number> = {};
      for (const r of results) {
        const t = r.type || 'unknown';
        counts[t] = (counts[t] || 0) + 1;
        if (counts[t] <= perTypeCap) capped.push(r);
      }
    }
    const base = perTypeCap ? capped : results;
    const limitedResults = base.slice(0, limitNum);

    let ruleTrees: Record<string, any[]> | undefined;

    if (includeDetails) {
      const ruleIds = Array.from(new Set(
        limitedResults
          .filter(item => (item.type || item.entityType) === 'rule')
          .map(item => item.id)
      ));

      if (ruleIds.length > 0) {
        try {
          const detailedRules = await indexer.getRulesByIds(ruleIds, true);
          const detailMap = new Map<string, any>();
          detailedRules.forEach((rule: any) => detailMap.set(rule.id, rule));

          limitedResults.forEach((item, idx) => {
            if ((item.type || item.entityType) === 'rule') {
              const detail = detailMap.get(item.id);
              if (detail) {
                limitedResults[idx] = { ...item, metadata: detail, detail };
              }
            }
          });

          const treeEntries = await Promise.all(
            ruleIds.map(async (id) => {
              try {
                const tree = await indexer.getRuleTree(id, true);
                return [id, tree] as [string, any[]];
              } catch {
                return [id, []] as [string, any[]];
              }
            })
          );
          ruleTrees = Object.fromEntries(treeEntries);
        } catch (err) {
          logger.warn('Failed to hydrate rule details:', err);
        }
      }
    }

    // Projection (fields/view)
    const parseFields = (): string[] | null => {
      if (fields) return (fields as string).split(',').map(s => s.trim()).filter(Boolean);
      if (view) {
        switch (String(view)) {
          case 'ids': return ['id'];
          case 'names': return ['id','name'];
          case 'files': return ['id','filePath'];
          case 'files+lines': return ['id','filePath','location'];
          case 'full': default: return null;
        }
      }
      return null;
    };

    // Attach skeletons + counts, then project
    const { makeSkeletonTextForComponent } = await import('../../../utils/SkeletonUtil.js');
    let allRulesList: any[] | null = null;
    const getCounts = async (seed: any) => {
      const out: any = { notes: 0, rules: 0 };
      try {
        const notesRes = await indexer.listNotes({ entity_type: 'component' as any, entity_id: seed.id, limit: 1 } as any);
        out.notes = (notesRes as any)?.length || 0;
      } catch {}
      try {
        if (!allRulesList) allRulesList = await indexer.listRules({ includeInactive: true });
        const rulesArr = Array.isArray(allRulesList) ? allRulesList : [];
        out.rules = rulesArr.filter((r: any) => Array.isArray(r.entity_links) && r.entity_links.some((l: any) => l.entity_type === 'component' && String(l.entity_id) === String(seed.id))).length;
      } catch {}
      return out;
    };

    for (const item of limitedResults) {
      if ((item.type || item.entityType) === 'component') {
        try {
          const comp = (item.metadata || item) as any;
          item.skeleton = await makeSkeletonTextForComponent(indexer as any, comp);
        } catch {}
        try {
          const counts = await getCounts(item);
          (item as any).hints = { has_docs: counts.notes > 0, has_rules: counts.rules > 0 };
          (item as any).link_counts = counts;
        } catch {}
      }
    }

    const fieldSet = parseFields();
    const project = (item: any) => {
      if (!fieldSet) return item;
      const out: any = {};
      for (const f of fieldSet) {
        if (f === 'location') {
          out.location = item.metadata?.location || item.location || undefined;
        } else if (f in item) {
          out[f] = item[f];
        } else if (f === 'filePath') {
          out.filePath = item.filePath || item.metadata?.filePath || undefined;
        } else if (f === 'name') {
          out.name = item.name;
        }
      }
      if (!out.type && item.type) out.type = item.type;
      return out;
    };
    const projected = limitedResults.map(project);
    
    // Enhanced response format
    const response: any = {
      results: projected,
      items: projected,
      total: results.length,
      entity_counts: entityCounts,
      query_info: {
        parsed_query: coreQueryStr || queryStr,
        entity_types: entityTypes,
        search_time_ms: Date.now() - startedAt
      },
      applied_filters: {
        component_types: componentTypeFilterRaw,
        lang: langFilterRaw,
        path_include: pathInclude,
        path_exclude: pathExclude
      }
    };

    if (ruleTrees) {
      response.rule_trees = ruleTrees;
    }
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
  };
}
