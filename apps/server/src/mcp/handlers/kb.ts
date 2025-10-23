/**
 * MCP Handler for First-Class Knowledge Base Operations
 *
 * KBs are hierarchical documentation trees with:
 * - Multi-level node structure
 * - Markdown content with mermaid/excalidraw diagrams
 * - Attached rules and guidance
 * - Template-based creation
 */

import { projectManager } from '../project-manager.js';
import { logger } from '../../shared/logger.js';
import { KBBuilder } from '../../features/knowledge-base/KBBuilder.js';
import { processTemplate } from '../../features/knowledge-base/templateProcessor.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Validate config against schema
 */
function validateConfig(config: Record<string, any>, schema: any[]): string[] {
  const errors: string[] = [];
  const schemaKeys = new Set(schema.map(field => field.key));

  // Check for invalid keys
  for (const key of Object.keys(config)) {
    if (!schemaKeys.has(key)) {
      errors.push(`Unknown key: ${key}`);
    }
  }

  // Validate each field
  for (const field of schema) {
    const value = config[field.key];

    // Check required fields
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push(`Required field missing: ${field.key}`);
      continue;
    }

    // Skip validation if field is not provided and not required
    if (value === undefined || value === null) {
      continue;
    }

    // Validate select fields
    if (field.type === 'select' && field.options) {
      if (!field.options.includes(value)) {
        errors.push(`Invalid value for ${field.key}: ${value} (must be one of: ${field.options.join(', ')})`);
      }
    }

    // Validate multiselect fields
    if (field.type === 'multiselect' && field.options) {
      if (!Array.isArray(value)) {
        errors.push(`${field.key} must be an array`);
      } else {
        for (const item of value) {
          if (!field.options.includes(item)) {
            errors.push(`Invalid value in ${field.key}: ${item} (must be one of: ${field.options.join(', ')})`);
          }
        }
      }
    }

    // Validate number fields
    if (field.type === 'number' && typeof value !== 'number') {
      errors.push(`${field.key} must be a number`);
    }

    // Validate boolean fields
    if (field.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`${field.key} must be a boolean`);
    }
  }

  return errors;
}

export async function handleKBTools(args: any): Promise<any> {
  const { project, action, ...params } = args;

  if (!project) {
    throw new Error('Project is required for KB tools');
  }

  const projectInfo = await projectManager.getProject(project);
  if (!projectInfo) {
    throw new Error(`Project not found: ${project}`);
  }

  const projectPath = projectInfo.fullPath;

  // Get DatabaseManager instance like notes handler does
  const { DatabaseManager } = await import('../../features/storage/DatabaseManager.js');
  const dbManager = DatabaseManager.getInstance(projectPath);
  await dbManager.initialize();

  // Get repositories from DatabaseManager
  const notesRepo = dbManager.getNotesRepository();
  const rulesRepo = dbManager.getRulesRepository();
  const dataSource = dbManager.getMetadataDataSource();

  // Get other imports
  const { NotesRepository } = await import('../../features/storage/repositories/NotesRepository.js');
  const { RulesRepository } = await import('../../features/storage/repositories/RulesRepository.js');
  const { KnowledgeBase } = await import('../../features/storage/entities/metadata/KnowledgeBase.entity.js');

  const kbBuilder = new KBBuilder(notesRepo, rulesRepo, dataSource);
  const kbRepo = dataSource.getRepository(KnowledgeBase);

  switch (action) {
    case 'create': {
      // Create KB from template or add node to existing KB
      const { template_name, parent_id, title, content, config, metadata } = params;

      if (template_name && !parent_id) {
        // Creating new KB from template
        if (!template_name) {
          throw new Error('template_name is required for creating new KB');
        }

        // Check if it's a project KB and one already exists
        if (template_name === 'project') {
          const existing = await kbRepo.findOne({
            where: {
              project_path: projectPath,
              template_name: 'project'
            }
          });
          if (existing) {
            return {
              content: [{
                type: 'text',
                text: `Project KB already exists. Use get to access it.`
              }]
            };
          }
        }

        const result = await kbBuilder.buildFromTemplate(
          projectPath,
          template_name,
          undefined,
          title || `${template_name} KB`,
          config || {}
        );

        return {
          content: [{
            type: 'text',
            text: `Created ${template_name} KB\nKB ID: ${result.kbId}\nRoot ID: ${result.rootId}\nCreated ${result.createdNodes} nodes`
          }]
        };
      } else if (parent_id) {
        // Adding node to existing KB
        if (!title) {
          throw new Error('title is required for creating node');
        }

        // Get parent to inherit KB metadata
        const parent = await notesRepo.getNote(parent_id);
        if (!parent) {
          throw new Error(`Parent node not found: ${parent_id}`);
        }

        const parentMeta = parent.metadata || {};

        const result = await notesRepo.createNote({
          title,
          content: content || `# ${title}\n\n`,
          parent_id,
          note_type: 'documentation',
          metadata: {
            ...metadata,
            kb_node: true,
            kb_type: parentMeta.kb_type,
            template_name: parentMeta.template_name,
            template_version: parentMeta.template_version
          },
          stable_tags: ['kb-node']
        });

        const nodeId = result.data?.id || 'unknown';

        return {
          content: [{
            type: 'text',
            text: `Created node: ${nodeId}\nTitle: ${title}\nParent: ${parent_id}`
          }]
        };
      } else {
        throw new Error('Either template_name or parent_id is required for create');
      }
    }

    case 'get': {
      // Get KB or node with optional tree structure
      const { kb_id, node_id, include_children, include_content, include_rules, include_tasks } = params;

      if (!kb_id && !node_id) {
        throw new Error('Either kb_id or node_id is required for get');
      }

      let targetNodeId: string;

      // Determine what node to get
      if (node_id) {
        targetNodeId = node_id;
      } else if (kb_id) {
        // Check if it's a KB ID
        const kb = await kbRepo.findOne({ where: { id: kb_id } });
        if (kb) {
          targetNodeId = kb.root_note_id;
        } else {
          // Try treating kb_id as root_note_id
          const kbByRoot = await kbRepo.findOne({ where: { root_note_id: kb_id } });
          if (kbByRoot) {
            targetNodeId = kbByRoot.root_note_id;
          } else {
            // Maybe it's already a node ID
            targetNodeId = kb_id;
          }
        }
      } else {
        throw new Error('No valid target for get');
      }

      if (include_children) {
        // Return tree structure
        const tree = await kbBuilder.getKBTree(projectPath, targetNodeId);

        // If include_rules is requested, add rules to each node in the tree
        if (include_rules) {
          const allRules = await rulesRepo.getAllRules(true); // Include inactive rules too

          // Add rules to the tree recursively
          const addRulesToTree = (node: any) => {
            const nodeRules = allRules.filter((r: any) =>
              r.entity_links?.some((link: any) =>
                link.entity_type === 'note' && link.entity_id === node.id
              )
            );

            if (nodeRules.length > 0) {
              node.rules = nodeRules.map((r: any) => ({
                id: r.id,
                name: r.name,
                guidance_text: r.guidance_text
              }));
            }

            if (node.children && node.children.length > 0) {
              node.children.forEach(addRulesToTree);
            }
          };

          addRulesToTree(tree);
        }

        // If include_tasks is requested, add tasks to each node in the tree
        if (include_tasks) {
          const { DatabaseManager } = await import('../../features/storage/DatabaseManager.js');
          const dbManager = DatabaseManager.getInstance(projectPath);
          await dbManager.initialize();
          const tasksRepo = dbManager.getTasksRepository();
          // Get all tasks - using searchTasks with no filter
          const searchResult = await tasksRepo.searchTasks({ limit: 1000, offset: 0 });
          const allTasks = searchResult.items;

          // Add tasks to the tree recursively
          const addTasksToTree = (node: any) => {
            const nodeTasks = allTasks.filter((t: any) =>
              t.entity_links?.some((link: any) =>
                link.entity_type === 'note' && link.entity_id === node.id
              )
            );

            if (nodeTasks.length > 0) {
              node.tasks = nodeTasks.map((t: any) => ({
                id: t.id,
                title: t.title,
                status: t.task_status,
                priority: t.task_priority
              }));
            }

            if (node.children && node.children.length > 0) {
              node.children.forEach(addTasksToTree);
            }
          };

          addTasksToTree(tree);
        }

        return {
          content: [{
            type: 'text',
            text: formatTree(tree)
          }]
        };
      } else {
        // Return single node
        const note = await notesRepo.getNote(targetNodeId);
        if (!note) {
          throw new Error(`Node not found: ${targetNodeId}`);
        }

        const response: any = {
          id: note.id,
          title: note.title,
          metadata: note.metadata,
          parent_id: note.parent_id
        };

        if (include_content !== false) {
          response.content = note.content;
        }

        if (include_rules) {
          const allRules = await rulesRepo.getAllRules(true); // Include inactive rules too
          console.error(`[KB] Found ${allRules.length} total rules`);
          console.error(`[KB] Looking for rules linked to node: ${targetNodeId}`);

          // Debug first few rules
          allRules.slice(0, 3).forEach(r => {
            console.error(`[KB] Rule ${r.id}:`, {
              name: r.name,
              has_entity_links: !!r.entity_links,
              entity_links_count: r.entity_links?.length || 0,
              entity_links: r.entity_links
            });
          });

          const rules = allRules.filter((r: any) => {
            const hasLink = r.entity_links?.some((link: any) =>
              link.entity_type === 'note' && link.entity_id === targetNodeId
            );
            if (r.entity_links?.length > 0) {
              console.error(`[KB] Rule ${r.id} has entity_links:`, JSON.stringify(r.entity_links));
              console.error(`[KB]   - Checking if matches node ${targetNodeId}? ${hasLink}`);
            }
            return hasLink;
          });

          console.error(`[KB] Found ${rules.length} rules linked to this node`);
          response.rules = rules.map((r: any) => ({
            id: r.id,
            name: r.name,
            guidance_text: r.guidance_text
          }));
        }

        if (include_tasks) {
          const { DatabaseManager } = await import('../../features/storage/DatabaseManager.js');
          const dbManager = DatabaseManager.getInstance(projectPath);
          await dbManager.initialize();
          const tasksRepo = dbManager.getTasksRepository();
          // Get all tasks - using searchTasks with no filter
          const searchResult = await tasksRepo.searchTasks({ limit: 1000, offset: 0 });
          const allTasks = searchResult.items;

          const tasks = allTasks.filter((t: any) =>
            t.entity_links?.some((link: any) =>
              link.entity_type === 'note' && link.entity_id === targetNodeId
            )
          );

          response.tasks = tasks.map((t: any) => ({
            id: t.id,
            title: t.title,
            status: t.task_status,
            priority: t.task_priority
          }));
        }

        // Get child IDs (always include to show structure)
        const childIds = await notesRepo.getNoteChildren(targetNodeId);
        response.children = childIds;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }]
        };
      }
    }

    case 'update': {
      // Update node or KB configuration
      const { node_id, kb_id, title, content, metadata, config } = params;

      if (config && kb_id) {
        // Updating KB configuration
        const kb = await kbRepo.findOne({ where: { id: kb_id } });
        if (!kb) {
          // Try by root_note_id
          const kbByRoot = await kbRepo.findOne({ where: { root_note_id: kb_id } });
          if (!kbByRoot) {
            throw new Error(`KB not found: ${kb_id}`);
          }

          // Validate config against template schema
          const template = kbBuilder['getTemplate'](kbByRoot.template_name);
          if (template && template.configSchema) {
            const validationErrors = validateConfig(config, template.configSchema);
            if (validationErrors.length > 0) {
              throw new Error(`Invalid configuration: ${validationErrors.join(', ')}`);
            }
          }

          kbByRoot.config = { ...kbByRoot.config, ...config };
          await kbRepo.save(kbByRoot);

          const updatedRules = await kbBuilder.updateTemplateRules(
            projectPath,
            kbByRoot.template_name,
            kbByRoot.config || {}
          );

          return {
            content: [{
              type: 'text',
              text: `KB configuration updated. ${updatedRules} template rules regenerated.`
            }]
          };
        }

        // Validate config against template schema
        const template = kbBuilder['getTemplate'](kb.template_name);
        if (template && template.configSchema) {
          const validationErrors = validateConfig(config, template.configSchema);
          if (validationErrors.length > 0) {
            throw new Error(`Invalid configuration: ${validationErrors.join(', ')}`);
          }
        }

        kb.config = { ...kb.config, ...config };
        await kbRepo.save(kb);

        const updatedRules = await kbBuilder.updateTemplateRules(
          projectPath,
          kb.template_name,
          kb.config || {}
        );

        return {
          content: [{
            type: 'text',
            text: `KB configuration updated. ${updatedRules} template rules regenerated.`
          }]
        };
      } else if (node_id) {
        // Updating node
        const updates: any = {};
        if (title !== undefined) updates.title = title;
        if (content !== undefined) updates.content = content;
        if (metadata !== undefined) {
          const existing = await notesRepo.getNote(node_id);
          updates.metadata = { ...existing?.metadata, ...metadata };
        }

        await notesRepo.updateNote(node_id, updates);

        return {
          content: [{
            type: 'text',
            text: `Updated node: ${node_id}`
          }]
        };
      } else {
        throw new Error('Either node_id or (kb_id + config) required for update');
      }
    }

    case 'delete': {
      // Remove node from tree
      const { node_id } = params;

      if (!node_id) {
        throw new Error('node_id is required for delete');
      }

      // Check if it's a root node
      const kb = await kbRepo.findOne({ where: { root_note_id: node_id } });
      if (kb) {
        throw new Error('Cannot delete KB root node. Delete the entire KB instead.');
      }

      // Check for children
      const children = await notesRepo.getNoteChildren(node_id);
      if (children.length > 0) {
        throw new Error(`Cannot delete node with ${children.length} children. Delete children first.`);
      }

      await notesRepo.deleteNote(node_id);

      return {
        content: [{
          type: 'text',
          text: `Deleted node: ${node_id}`
        }]
      };
    }

    case 'list': {
      // List all KBs or nodes in a KB
      const { kb_id, limit } = params;

      if (kb_id) {
        // List nodes in a specific KB
        const tree = await kbBuilder.getKBTree(projectPath, kb_id);
        const nodes = flattenTree(tree);
        const limitedNodes = limit ? nodes.slice(0, limit) : nodes;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              kb_id,
              node_count: nodes.length,
              nodes: limitedNodes.map(n => ({
                id: n.id,
                title: n.title,
                parent_id: n.parent_id,
                has_children: (n.children?.length || 0) > 0
              }))
            }, null, 2)
          }]
        };
      } else {
        // List all KBs in project
        const kbs = await kbRepo.find({
          where: { project_path: projectPath }
        });

        const kbList = kbs.map((kb: any) => ({
          id: kb.id,
          root_id: kb.root_note_id,
          template: kb.template_name,
          description: kb.description || `${kb.template_name} KB`,
          config: kb.config || {}
        }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ kbs: kbList }, null, 2)
          }]
        };
      }
    }

    case 'search': {
      // Search within KB scope
      const { kb_id, query, search_type, limit } = params;

      if (!kb_id || !query) {
        throw new Error('kb_id and query are required for search');
      }

      // Get all nodes in the KB
      const tree = await kbBuilder.getKBTree(projectPath, kb_id);
      const nodes = flattenTree(tree);

      // Search through nodes based on search_type
      const results = [];
      for (const node of nodes) {
        let score = 0;

        if (search_type === 'keyword' || search_type === 'both' || !search_type) {
          // Simple keyword search
          const contentLower = (node.content || '').toLowerCase();
          const titleLower = (node.title || '').toLowerCase();
          const queryLower = query.toLowerCase();

          if (contentLower.includes(queryLower)) {
            score += 2;
          }
          if (titleLower.includes(queryLower)) {
            score += 3;
          }
        }

        if (search_type === 'semantic' || search_type === 'both') {
          // For semantic search, we'd need to use embeddings
          // For now, do a smarter keyword match
          const words = query.toLowerCase().split(/\s+/);
          const contentLower = (node.content || '').toLowerCase();
          const matchedWords = words.filter((w: string) => contentLower.includes(w));
          score += matchedWords.length;
        }

        if (score > 0) {
          results.push({
            node_id: node.id,
            title: node.title,
            score,
            excerpt: extractExcerpt(node.content, query)
          });
        }
      }

      // Sort by score and limit
      results.sort((a, b) => b.score - a.score);
      const limitedResults = limit ? results.slice(0, limit) : results;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            kb_id,
            query,
            result_count: limitedResults.length,
            results: limitedResults
          }, null, 2)
        }]
      };
    }

    case 'move': {
      // Move node to different parent
      const { node_id, parent_id } = params;

      if (!node_id || !parent_id) {
        throw new Error('node_id and parent_id are required for move');
      }

      // Verify new parent exists
      const newParent = await notesRepo.getNote(parent_id);
      if (!newParent) {
        throw new Error(`Parent node not found: ${parent_id}`);
      }

      // Update parent_id
      await notesRepo.updateNote(node_id, { parent_id });

      return {
        content: [{
          type: 'text',
          text: `Moved node ${node_id} to parent ${parent_id}`
        }]
      };
    }

    case 'templates': {
      // List available KB templates
      const templates = [
        {
          name: 'project',
          description: 'Overall project documentation',
          configFields: (await import('../../features/knowledge-base/templates/project-kb-structure.js'))
            .PROJECT_KB_STRUCTURE.configSchema
        },
        {
          name: 'refactor',
          description: 'Refactoring workspace with impact tracking',
          configFields: (await import('../../features/knowledge-base/templates/refactor-kb-structure.js'))
            .REFACTOR_KB_STRUCTURE.configSchema
        }
      ];

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ templates }, null, 2)
        }]
      };
    }

    case 'analyze': {
      // Analyze project to detect configuration values
      const { template_name, fields } = params;

      if (!template_name) {
        throw new Error('template_name is required for analyze');
      }

      const config = await analyzeProjectForTemplate(projectPath, template_name, fields);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            template: template_name,
            detectedConfig: config
          }, null, 2)
        }]
      };
    }

    case 'debug-rules': {
      // Debug endpoint to test getAllRules
      const allRules = await rulesRepo.getAllRules(true);
      return {
        content: [{
          type: 'text',
          text: `Found ${allRules.length} rules:\n${allRules.map((r: any) =>
            `- ${r.id}: entity_links=${JSON.stringify(r.entity_links)}`
          ).join('\n')}`
        }]
      };
    }

    default:
      throw new Error(`Unknown KB action: ${action}`);
  }
}

/**
 * Format tree structure for display
 */
function formatTree(node: any, level: number = 0): string {
  const indent = '  '.repeat(level);
  const icon = node.metadata?.icon || '📄';
  const ruleCount = node.rules?.length || node.metadata?.rule_count || 0;
  const taskCount = node.tasks?.length || 0;
  const hasDiagram = node.content?.includes('```mermaid') || node.content?.includes('excalidraw');

  let result = `${indent}${icon} ${node.title}`;
  if (ruleCount > 0) result += ` [${ruleCount} rules]`;
  if (taskCount > 0) result += ` [${taskCount} tasks]`;
  if (hasDiagram) result += ' 📊';
  result += '\n';

  // Show rules if present
  if (node.rules && node.rules.length > 0) {
    for (const rule of node.rules) {
      result += `${indent}  📏 ${rule.name}\n`;
    }
  }

  // Show tasks if present
  if (node.tasks && node.tasks.length > 0) {
    for (const task of node.tasks) {
      const statusIcon = task.status === 'done' ? '✅' : task.status === 'in_progress' ? '🔄' : '📋';
      result += `${indent}  ${statusIcon} ${task.title} (${task.status})\n`;
    }
  }

  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      result += formatTree(child, level + 1);
    }
  }

  return result;
}

/**
 * Flatten tree into array of nodes
 */
function flattenTree(node: any, parent_id: string | null = null): any[] {
  const nodes = [{
    id: node.id,
    title: node.title,
    content: node.content,
    metadata: node.metadata,
    parent_id,
    children: node.children
  }];

  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      nodes.push(...flattenTree(child, node.id));
    }
  }

  return nodes;
}

/**
 * Extract excerpt around search query
 */
function extractExcerpt(content: string, query: string, maxLength: number = 200): string {
  if (!content) return '';

  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerContent.indexOf(lowerQuery);

  if (index === -1) {
    // Query not found, return beginning
    return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
  }

  const start = Math.max(0, index - 50);
  const end = Math.min(content.length, index + query.length + 150);
  let excerpt = content.substring(start, end);

  if (start > 0) excerpt = '...' + excerpt;
  if (end < content.length) excerpt = excerpt + '...';

  return excerpt;
}

/**
 * Analyze a project to detect configuration values for a specific template
 */
async function analyzeProjectForTemplate(
  projectPath: string,
  templateName: string,
  requestedFields?: string[]
): Promise<Record<string, any>> {
  const config: Record<string, any> = {};

  // Common analysis for all templates
  const packageJsonPath = path.join(projectPath, 'package.json');
  let packageJson: any = null;
  try {
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    packageJson = JSON.parse(content);
  } catch (e) {
    // No package.json, might not be a Node.js project
  }

  // Detect languages by file extensions
  const languages = new Set<string>();
  try {
    const files = await fs.readdir(projectPath, { recursive: true, withFileTypes: true });
    for (const file of files) {
      if (file.isFile()) {
        const ext = path.extname(file.name);
        switch (ext) {
          case '.ts':
          case '.tsx':
            languages.add('typescript');
            break;
          case '.js':
          case '.jsx':
            languages.add('javascript');
            break;
          case '.py':
            languages.add('python');
            break;
          case '.go':
            languages.add('go');
            break;
          case '.rs':
            languages.add('rust');
            break;
          case '.java':
            languages.add('java');
            break;
        }
      }
    }
  } catch (e) {
    logger.warn('Could not scan directory for languages');
  }

  // Template-specific analysis
  switch (templateName) {
    case 'project':
      // Analyze for project KB template
      if (!requestedFields || requestedFields.includes('languages')) {
        config.languages = Array.from(languages);
      }

      if (packageJson) {
        if (!requestedFields || requestedFields.includes('devCommand')) {
          config.devCommand = packageJson.scripts?.dev || packageJson.scripts?.start || 'npm run dev';
        }
        if (!requestedFields || requestedFields.includes('buildCommand')) {
          config.buildCommand = packageJson.scripts?.build || 'npm run build';
        }
        if (!requestedFields || requestedFields.includes('testCommand')) {
          config.testCommand = packageJson.scripts?.test || '';
        }
        if (!requestedFields || requestedFields.includes('packageManager')) {
          // Detect package manager
          const hasYarnLock = await fileExists(path.join(projectPath, 'yarn.lock'));
          const hasPnpmLock = await fileExists(path.join(projectPath, 'pnpm-lock.yaml'));
          const hasBunLock = await fileExists(path.join(projectPath, 'bun.lockb'));
          config.packageManager = hasBunLock ? 'bun' : hasPnpmLock ? 'pnpm' : hasYarnLock ? 'yarn' : 'npm';
        }

        // Detect frameworks from dependencies
        if (!requestedFields || requestedFields.includes('frameworks')) {
          const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
          const frameworks = [];
          if (deps.react) frameworks.push('react');
          if (deps.vue) frameworks.push('vue');
          if (deps.angular) frameworks.push('angular');
          if (deps.svelte) frameworks.push('svelte');
          if (deps.express) frameworks.push('express');
          if (deps.fastify) frameworks.push('fastify');
          if (deps.next) frameworks.push('nextjs');
          if (deps.nuxt) frameworks.push('nuxt');
          config.frameworks = frameworks;
        }

        // Detect ORM
        if (!requestedFields || requestedFields.includes('orm')) {
          const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
          if (deps.typeorm) config.orm = 'typeorm';
          else if (deps.prisma || deps['@prisma/client']) config.orm = 'prisma';
          else if (deps.sequelize) config.orm = 'sequelize';
          else if (deps.mongoose) config.orm = 'mongoose';
          else if (deps.drizzle) config.orm = 'drizzle';
        }

        // Detect build tool
        if (!requestedFields || requestedFields.includes('buildTool')) {
          const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
          if (deps.vite) config.buildTool = 'vite';
          else if (deps.webpack) config.buildTool = 'webpack';
          else if (deps.esbuild) config.buildTool = 'esbuild';
          else if (deps.rollup) config.buildTool = 'rollup';
          else if (deps.parcel) config.buildTool = 'parcel';
        }

        // Detect testing framework
        if (!requestedFields || requestedFields.includes('testingFramework')) {
          const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
          const testFrameworks = [];
          if (deps.jest) testFrameworks.push('jest');
          if (deps.vitest) testFrameworks.push('vitest');
          if (deps.mocha) testFrameworks.push('mocha');
          if (deps.cypress) testFrameworks.push('cypress');
          if (deps.playwright) testFrameworks.push('playwright');
          config.testingFramework = testFrameworks;
        }

        // Detect linter
        if (!requestedFields || requestedFields.includes('linter')) {
          const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
          const linters = [];
          if (deps.eslint) linters.push('eslint');
          if (deps.prettier) linters.push('prettier');
          if (deps.biome) linters.push('biome');
          config.linter = linters;
        }
      }

      // Try to detect dev port from common config files
      if (!requestedFields || requestedFields.includes('devPort')) {
        config.devPort = await detectDevPort(projectPath) || 3000;
      }

      break;

    case 'refactor':
      // Analyze for refactor KB template
      // Most refactor config is provided by the user, but we can detect some things

      // Count files in the project (rough estimate)
      if (!requestedFields || requestedFields.includes('estimatedFilesAffected')) {
        try {
          const files = await fs.readdir(projectPath, { recursive: true, withFileTypes: true });
          const codeFiles = files.filter(f => f.isFile() && isCodeFile(f.name));
          // This is just a placeholder - user should provide actual estimate
          config.estimatedFilesAffected = Math.min(codeFiles.length, 10);
        } catch (e) {
          config.estimatedFilesAffected = 5;
        }
      }

      // Default search lenses for refactoring
      if (!requestedFields || requestedFields.includes('searchLenses')) {
        config.searchLenses = ['callers', 'callees'];
      }

      // Default verification steps
      if (!requestedFields || requestedFields.includes('verificationSteps')) {
        config.verificationSteps = ['unit_tests', 'integration_tests', 'manual_testing'];
      }

      break;
  }

  return config;
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a file is a code file
 */
function isCodeFile(filename: string): boolean {
  const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.cpp', '.c', '.h', '.cs', '.rb', '.php'];
  return codeExtensions.some(ext => filename.endsWith(ext));
}

/**
 * Try to detect the dev server port from config files
 */
async function detectDevPort(projectPath: string): Promise<number | null> {
  // Check .env files
  const envFiles = ['.env', '.env.local', '.env.development'];
  for (const envFile of envFiles) {
    try {
      const content = await fs.readFile(path.join(projectPath, envFile), 'utf-8');
      const portMatch = content.match(/(?:PORT|DEV_PORT|SERVER_PORT)\s*=\s*(\d+)/);
      if (portMatch && portMatch[1]) {
        return parseInt(portMatch[1], 10);
      }
    } catch {
      // File doesn't exist
    }
  }

  // Check vite.config
  try {
    const viteConfig = await fs.readFile(path.join(projectPath, 'vite.config.js'), 'utf-8');
    const portMatch = viteConfig.match(/port:\s*(\d+)/);
    if (portMatch && portMatch[1]) {
      return parseInt(portMatch[1], 10);
    }
  } catch {
    // No vite config
  }

  return null;
}