/**
 * Functional Context Builder - Uses relationship queries instead of hierarchical walking
 *
 * This replaces the hierarchical AST-based context generation with functional
 * relationship-based queries that return call graphs, dependencies, and data flow.
 */

import { logger } from '../../shared/logger.js';
import { SkeletonGenerator } from '@felix/code-intelligence';

interface LensConfig {
  relationshipTypes: string[];
  direction: 'in' | 'out' | 'both';
  includeDataFlow: boolean;
  includeSourceForRelated: boolean;
}

interface BuildOptions {
  depth?: number;
  lens?: string;
  relationshipTypes?: string[];
  includeSource?: boolean;
  includeMetadata?: boolean;
}

const LENS_CONFIGURATIONS: Record<string, LensConfig> = {
  'callers': {
    relationshipTypes: ['calls', 'called_by'],
    direction: 'in',
    includeDataFlow: false,
    includeSourceForRelated: true // Include full source for callers
  },
  'callees': {
    relationshipTypes: ['calls'],
    direction: 'out',
    includeDataFlow: false,
    includeSourceForRelated: true // Include full source for callees
  },
  'data-flow': {
    relationshipTypes: [
      'uses_field', 'transforms_data', 'passes_to', 'returns_from',
      'reads_from', 'writes_to', 'derives_from', 'modifies'
    ],
    direction: 'both',
    includeDataFlow: true,
    includeSourceForRelated: false // Use skeletons for data flow
  },
  'inheritance': {
    relationshipTypes: ['extends', 'extended_by', 'implements', 'implemented_by'],
    direction: 'both',
    includeDataFlow: false,
    includeSourceForRelated: false // Use skeletons for inheritance chain
  },
  'imports': {
    relationshipTypes: ['imports', 'imported_by', 'depends_on'],
    direction: 'both',
    includeDataFlow: false,
    includeSourceForRelated: false // Use skeletons for imports
  },
  'full': {
    relationshipTypes: [], // All types
    direction: 'both',
    includeDataFlow: true,
    includeSourceForRelated: true // Include full source for everything
  },
  'default': {
    relationshipTypes: [], // Show ALL relationship types by default
    direction: 'both',
    includeDataFlow: true,
    includeSourceForRelated: false // Default: skeletons for related, source for focus + parent
  }
};

/**
 * Build context using functional relationship queries
 */
export async function buildFunctionalContext(
  indexer: any,
  componentId: string,
  options: BuildOptions = {}
): Promise<any> {
  try {
    const {
      depth = 2,
      lens = 'default',
      relationshipTypes,
      includeSource = true,
      includeMetadata = true
    } = options;

    // Get lens configuration
    const lensConfig = LENS_CONFIGURATIONS[lens] || LENS_CONFIGURATIONS['default'];
    if (!lensConfig) {
      logger.warn(`Unknown lens type: ${lens}, falling back to default`);
      return null;
    }

    // Determine which relationship types to query
    const typesToQuery = relationshipTypes && relationshipTypes.length > 0
      ? relationshipTypes
      : lensConfig.relationshipTypes;

    // Get the focus component
    const focusComponent = await indexer.getComponent(componentId);
    if (!focusComponent) {
      return null;
    }

    // Get KnowledgeGraph instance
    const knowledgeGraph = typeof indexer.getKnowledgeGraphInstance === 'function'
      ? indexer.getKnowledgeGraphInstance()
      : null;

    if (!knowledgeGraph) {
      logger.warn('KnowledgeGraph not available, falling back to basic context');
      return null;
    }

    // Use getSubgraph which properly handles depth traversal
    const subgraph = await knowledgeGraph.getSubgraph(componentId, depth);

    if (!subgraph || subgraph.edges.length === 0) {
      logger.warn(`No relationships found for component: ${componentId}`);
      // Still return focus component even if no relationships
    }

    // ALWAYS exclude hierarchical container relationships (these show AST structure, not semantic relationships)
    const HIERARCHICAL_TYPES_TO_EXCLUDE = [
      'class-contains-method',
      'method-belongs-to-class',
      'class-contains-property',
      'property-belongs-to-class',
      'file-contains-class',
      'class-belongs-to-file',
      'contains',
      'contained_by'
    ];

    const relationshipGraph = {
      nodes: new Set<string>(subgraph.nodes.map((n: any) => n.id)),
      edges: (subgraph.edges || []).filter((edge: any) =>
        !HIERARCHICAL_TYPES_TO_EXCLUDE.includes(edge.type)
      ),
      depth,
      cyclesDetected: [] as any[]
    };

    // Filter by relationship types if specified
    if (typesToQuery.length > 0) {
      relationshipGraph.edges = relationshipGraph.edges.filter((edge: any) =>
        typesToQuery.includes(edge.type)
      );
    }

    // Rebuild nodes set to ONLY include nodes connected by the (filtered) edges
    const filteredNodeIds = new Set<string>();
    filteredNodeIds.add(componentId); // Always include focus component

    for (const edge of relationshipGraph.edges) {
      filteredNodeIds.add(edge.sourceId);
      filteredNodeIds.add(edge.targetId);
    }

    relationshipGraph.nodes = filteredNodeIds;

    // Fetch all components that are connected by the (filtered) relationships
    const relatedComponents = await Promise.all(
      Array.from(relationshipGraph.nodes).map(id => indexer.getComponent(id))
    );
    let components = relatedComponents.filter(c => c != null);

    // Ensure focus component is first
    const focusIndex = components.findIndex(c => c?.id === componentId);
    if (focusIndex > 0) {
      const focus = components[focusIndex];
      components.splice(focusIndex, 1);
      components.unshift(focus);
    } else if (focusIndex === -1) {
      components.unshift(focusComponent);
    }

    // Get immediate parent/container
    let immediateParent = null;
    if (focusComponent.parentId) {
      try {
        immediateParent = await indexer.getComponent(focusComponent.parentId);
      } catch (error) {
        logger.warn('Failed to fetch immediate parent:', error);
      }
    }

    // Apply skeleton/source logic based on lens configuration
    const skeletonGenerator = new SkeletonGenerator();
    components = await Promise.all(components.map(async (comp, index) => {
      const isFocus = comp.id === componentId;
      const isImmediateParent = immediateParent && comp.id === immediateParent.id;

      // Focus component: always full source
      if (isFocus) {
        return comp;
      }

      // Immediate parent: full source
      if (isImmediateParent) {
        return comp;
      }

      // For related components: use lens config to decide source vs skeleton
      if (lensConfig.includeSourceForRelated) {
        // Include full source (e.g., callers, callees, full lens)
        return comp;
      } else {
        // Generate skeleton for this component
        if (comp.code) {
          try {
            const skeleton = await generateComponentSkeleton(comp, skeletonGenerator, indexer);
            return {
              ...comp,
              code: undefined,
              source: undefined,
              metadata: {
                ...comp.metadata,
                skeleton
              }
            };
          } catch (error) {
            logger.warn(`Failed to generate skeleton for ${comp.id}:`, error);
            return comp;
          }
        }
        return comp;
      }
    }));

    // Ensure immediate parent is in components list
    if (immediateParent && !components.find(c => c.id === immediateParent.id)) {
      components.splice(1, 0, immediateParent); // Insert after focus component
    }

    // Enrich relationships with file path information
    const componentById = new Map(components.map(c => [c.id, c]));
    const enrichedRelationships = relationshipGraph.edges.map((rel: any) => {
      const sourceComp = componentById.get(rel.sourceId);
      const targetComp = componentById.get(rel.targetId);

      return {
        ...rel,
        sourceFilePath: sourceComp?.filePath || null,
        targetFilePath: targetComp?.filePath || null,
        sourceName: sourceComp?.name || rel.sourceId?.split('|').pop(),
        targetName: targetComp?.name || rel.targetId?.split('|').pop()
      };
    });

    // Build component detail for focus component
    const componentDetail = await buildComponentDetail(focusComponent, relationshipGraph, indexer);

    // Calculate statistics
    const stats = {
      totalComponents: components.length,
      totalRelationships: relationshipGraph.edges.length,
      maxDepth: relationshipGraph.depth,
      cyclesDetected: relationshipGraph.cyclesDetected.length,
      componentTypes: new Set(components.map((c: any) => c.type)).size,
      relationshipTypes: new Set(relationshipGraph.edges.map((r: any) => r.type)).size
    };

    // Format output based on lens
    const content = formatContextOutput(
      focusComponent,
      components,
      enrichedRelationships,
      {
        lens,
        includeSource,
        includeMetadata,
        cyclesDetected: relationshipGraph.cyclesDetected
      }
    );

    return {
      content,
      component: focusComponent,
      component_detail: componentDetail,
      components,
      relationships: enrichedRelationships,
      metadata: {
        lens,
        depth,
        lensConfig,
        ...stats
      },
      tokenCount: estimateTokens(content),
      stats,
      warnings: relationshipGraph.cyclesDetected.length > 0
        ? [`Detected ${relationshipGraph.cyclesDetected.length} circular dependencies`]
        : []
    };
  } catch (error) {
    logger.error('Failed to build functional context:', error);
    return null;
  }
}

/**
 * Build detailed information for a component
 */
async function buildComponentDetail(component: any, graph: any, indexer: any) {
  try {
    // Get parent/container if exists
    let container: any = null;
    if (component.parentId) {
      try {
        container = await indexer.getComponent(component.parentId);
      } catch { }
    }

    // Calculate relationship counts from graph
    const incoming = graph.edges.filter((r: any) => r.targetId === component.id);
    const outgoing = graph.edges.filter((r: any) => r.sourceId === component.id);

    // Group relationships by type
    const relationshipsByType: Record<string, number> = {};
    for (const rel of graph.edges) {
      relationshipsByType[rel.type] = (relationshipsByType[rel.type] || 0) + 1;
    }

    const metadata = component.metadata || {};
    const kind = String(component.type || '').toLowerCase();

    // Build signature
    const parts: string[] = [];
    if (metadata.accessModifier) parts.push(metadata.accessModifier);
    if (metadata.isStatic) parts.push('static');
    if (metadata.isReadonly) parts.push('readonly');
    parts.push(component.name || '');
    if (metadata.returnType) parts.push(`: ${metadata.returnType}`);
    if (metadata.propertyType) parts.push(`: ${metadata.propertyType}`);

    return {
      id: component.id,
      name: component.name,
      type: component.type,
      language: component.language,
      filePath: component.filePath,
      location: component.location,
      container: container ? { id: container.id, name: container.name, type: container.type } : null,
      metadata,
      signature: parts.join(' ').trim(),
      relationshipCounts: {
        incoming: incoming.length,
        outgoing: outgoing.length,
        total: graph.edges.length,
        byType: relationshipsByType
      },
      graphMetrics: {
        depth: graph.depth,
        reachableNodes: graph.nodes.size,
        cycles: graph.cyclesDetected.length
      }
    };
  } catch (error) {
    logger.warn('Failed to build component detail:', error);
    return null;
  }
}

/**
 * Format context output based on lens and options
 */
function formatContextOutput(
  focus: any,
  components: any[],
  relationships: any[],
  options: {
    lens: string;
    includeSource: boolean;
    includeMetadata: boolean;
    cyclesDetected: any[];
  }
) {
  const lines: string[] = [];

  // Header
  lines.push(`# Context for ${focus.name} (${focus.type})`);
  lines.push(`Lens: ${options.lens}`);
  lines.push(`Location: ${focus.filePath}:${focus.location?.startLine || 0}`);
  lines.push('');

  // Cycles warning
  if (options.cyclesDetected && options.cyclesDetected.length > 0) {
    lines.push(`⚠️  Warning: ${options.cyclesDetected.length} circular dependencies detected`);
    lines.push('');
  }

  // Relationship summary
  lines.push('## Relationships');
  const relsByType: Record<string, any[]> = {};
  for (const rel of relationships) {
    const relType = rel.type || 'unknown';
    if (!relsByType[relType]) relsByType[relType] = [];
    relsByType[relType].push(rel);
  }

  for (const [type, rels] of Object.entries(relsByType)) {
    lines.push(`- ${type}: ${rels.length}`);
  }
  lines.push('');

  // Related components
  lines.push('## Related Components');
  for (const comp of components.slice(0, 20)) { // Limit to first 20
    const loc = comp.location ? `:${comp.location.startLine}` : '';
    lines.push(`- ${comp.name} (${comp.type}) - ${comp.filePath}${loc}`);
  }

  if (components.length > 20) {
    lines.push(`... and ${components.length - 20} more`);
  }
  lines.push('');

  // Source code if requested
  if (options.includeSource && focus.code) {
    lines.push('## Source Code');
    lines.push('```' + (focus.language || ''));
    lines.push(focus.code);
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Estimate token count (rough approximation)
 */
function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Generate skeleton for a component
 */
async function generateComponentSkeleton(
  component: any,
  skeletonGenerator: SkeletonGenerator,
  indexer: any
): Promise<string> {
  const componentType = String(component.type || '').toLowerCase();

  // For class-like components, generate class skeleton with members
  if (componentType === 'class' || componentType === 'interface' || componentType === 'enum') {
    // Get all child components (members)
    const allComponents = await indexer.getAllComponents();
    const members = Array.isArray(allComponents) ? allComponents.filter((c: any) => c.parentId === component.id) : [];

    const classSkeleton = skeletonGenerator.generateClassSkeleton(component, members);
    return skeletonGenerator.formatSkeleton(classSkeleton);
  }

  // For methods/functions, generate method signature
  if (componentType === 'method' || componentType === 'function') {
    const metadata = component.metadata || {};
    const parts: string[] = [];

    if (metadata.accessModifier) parts.push(metadata.accessModifier);
    if (metadata.isStatic) parts.push('static');
    if (metadata.isAsync) parts.push('async');

    parts.push(component.name);

    // Add parameters
    parts.push('(');
    if (metadata.parameters && Array.isArray(metadata.parameters)) {
      const params = metadata.parameters.map((p: any) => {
        let paramStr = p.name;
        if (p.type) paramStr += `: ${p.type}`;
        return paramStr;
      }).join(', ');
      parts.push(params);
    }
    parts.push(')');

    // Add return type
    if (metadata.returnType) {
      parts.push(`: ${metadata.returnType}`);
    }

    return parts.join('') + ` // lines ${component.location?.startLine}-${component.location?.endLine}`;
  }

  // For properties/variables
  if (componentType === 'property' || componentType === 'variable') {
    const metadata = component.metadata || {};
    const parts: string[] = [];

    if (metadata.accessModifier) parts.push(metadata.accessModifier);
    if (metadata.isStatic) parts.push('static');
    if (metadata.isReadonly) parts.push('readonly');

    parts.push(component.name);

    if (metadata.propertyType || metadata.type) {
      parts.push(`: ${metadata.propertyType || metadata.type}`);
    }

    return parts.join(' ') + ` // lines ${component.location?.startLine}-${component.location?.endLine}`;
  }

  // Default: just return signature
  return `${component.name} // ${componentType} at ${component.filePath}:${component.location?.startLine}`;
}
