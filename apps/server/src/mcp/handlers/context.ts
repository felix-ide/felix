import fs from 'fs/promises';
import { createHash } from 'crypto';
import { projectManager } from '../project-manager.js';
import { createJsonContent, createTextContent, type ContextToolRequest } from '../types/contracts.js';
import { getProjectNotFoundError } from '../utils/project-errors.js';
import { buildContextResponse } from '../../server/context/contextBuilder.js';

export async function handleContextTool(request: ContextToolRequest) {
  const projectInfo = await projectManager.getProject(request.project);
  if (!projectInfo) {
    const errorMessage = await getProjectNotFoundError(request.project);
    throw new Error(errorMessage);
  }

  const id = request.component_id.trim();
  try {
    const codeIndexer = projectInfo.codeIndexer;
    const comp = await codeIndexer.getComponent(id);
    if (comp && (comp as any).filePath) {
      const filePath = (comp as any).filePath as string;
      let shouldRefresh = false;
      try {
        const stat = await fs.stat(filePath);
        const mtimeMs = stat.mtimeMs;
        const lastIndexed = Number((comp as any).metadata?.modificationTime || 0);
        if (mtimeMs > lastIndexed || !(comp as any).code) shouldRefresh = true;
        try {
          const siblings = await codeIndexer.getComponentsByFile(filePath);
          const fileComp = siblings.find((c: any) => String(c.type).toLowerCase() === 'file');
          if (fileComp) {
            const fileText = await fs.readFile(filePath, 'utf-8');
            const fileHash = createHash('sha256').update(fileText).digest('hex');
            const storedHash = (fileComp as any).contentHash || (fileComp as any).metadata?.contentHash;
            if (storedHash && storedHash !== fileHash) shouldRefresh = true;
          }
        } catch {}
      } catch { if (!(comp as any).code) shouldRefresh = true; }
      if (shouldRefresh) {
        try { await codeIndexer.updateFile(filePath); await codeIndexer.regenerateEmbeddingsForFile(filePath); } catch {}
      }
    }
  } catch {}

  const depthRaw = (request as any).depth;
  const targetTokensRaw = (request as any).target_tokens;
  const depthValue = typeof depthRaw === 'number' ? depthRaw : parseInt(String(depthRaw ?? ''), 10);
  const targetTokenValue = typeof targetTokensRaw === 'number'
    ? targetTokensRaw
    : parseInt(String(targetTokensRaw ?? ''), 10);

  const priorityComponentsRaw = (request as any).priority_components;
  const languageFilterRaw = (request as any).language_filter;
  const relationshipTypesRaw = (request as any).relationshipTypes || (request as any).relationship_types;
  const lensRaw = (request as any).lens;

  const contextResult = await buildContextResponse(projectInfo.codeIndexer as any, id, {
    depth: Number.isFinite(depthValue) ? depthValue : undefined,
    includeSource: request.include_source !== false,
    includeRelationships: request.include_relationships !== false,
    includeDocumentation: (request as any).include_documentation !== false,
    includeMetadata: (request as any).include_metadata !== false,
    includeNotes: (request as any).include_notes !== false,
    includeRules: (request as any).include_rules !== false,
    includeTasks: (request as any).include_tasks !== false,
    targetTokens: Number.isFinite(targetTokenValue) ? targetTokenValue : undefined,
    outputFormat: typeof request.output_format === 'string' ? request.output_format : undefined,
    priorityComponents: Array.isArray(priorityComponentsRaw)
      ? priorityComponentsRaw.map((value: unknown) => String(value))
      : undefined,
    languageFilter: Array.isArray(languageFilterRaw)
      ? languageFilterRaw.map((value: unknown) => String(value))
      : undefined,
    relationshipTypes: Array.isArray(relationshipTypesRaw)
      ? relationshipTypesRaw.map((value: unknown) => String(value))
      : undefined,
    lens: (typeof lensRaw === 'string' &&
          ['default', 'callers', 'callees', 'data-flow', 'inheritance', 'imports', 'full'].includes(lensRaw))
      ? lensRaw as 'default' | 'callers' | 'callees' | 'data-flow' | 'inheritance' | 'imports' | 'full'
      : undefined,
    query: typeof (request as any).query === 'string' && (request as any).query.length > 0 ? (request as any).query : undefined
  });

  if (!contextResult) {
    throw new Error(`Component not found: ${id}`);
  }

  const outputFormat = request.output_format === 'json' ? 'json' : 'text';
  if (outputFormat === 'json') {
    return {
      content: [createJsonContent(contextResult)],
      payload: contextResult
    };
  }

  return {
    content: [createTextContent(contextResult.content)],
    payload: contextResult
  };
}
