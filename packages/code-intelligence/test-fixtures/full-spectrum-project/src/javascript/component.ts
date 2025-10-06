export interface BaseEntity {
  id: string;
  label: string;
}

export interface GraphNode extends BaseEntity {
  weight: number;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge extends BaseEntity {
  source: string;
  target: string;
  weight?: number;
}

export enum LayoutMode {
  ForceDirected = 'force-directed',
  Orbit = 'orbit',
  Grid = 'grid'
}

export type SceneGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  mode: LayoutMode;
};

export interface LayoutOptions {
  emphasis?: 'hovered' | 'selected';
  scale?: number;
}

export interface LayoutStrategy {
  readonly mode: LayoutMode;
  configure(options: LayoutOptions): void;
  compose(graph: { nodes: GraphNode[]; edges: GraphEdge[] }): SceneGraph;
}

export type NodeTransformer<T extends GraphNode = GraphNode> = (node: T) => T;

export function LogInvocation(): MethodDecorator {
  return (_target, propertyKey, descriptor) => {
    const original = descriptor?.value;
    if (typeof original !== 'function') return descriptor;

    descriptor.value = function (...args: unknown[]) {
      console.debug(`layout:${String(propertyKey)}`, args);
      return original.apply(this, args);
    };
    return descriptor;
  };
}

export abstract class LayoutAlgorithm implements LayoutStrategy {
  protected options: LayoutOptions = {};

  constructor(public readonly mode: LayoutMode) {}

  configure(options: LayoutOptions): void {
    this.options = { ...this.options, ...options };
  }

  protected annotate(node: GraphNode): GraphNode {
    return {
      ...node,
      metadata: {
        ...(node.metadata ?? {}),
        emphasis: this.options.emphasis ?? null
      }
    };
  }

  abstract compose(graph: { nodes: GraphNode[]; edges: GraphEdge[] }): SceneGraph;
}

export class ForceDirectedLayout extends LayoutAlgorithm {
  constructor() {
    super(LayoutMode.ForceDirected);
  }

  @LogInvocation()
  compose(graph: { nodes: GraphNode[]; edges: GraphEdge[] }): SceneGraph {
    const nodes = graph.nodes.map(node => this.annotate(node));
    return {
      nodes,
      edges: graph.edges,
      mode: this.mode
    };
  }
}

export class GridLayout extends LayoutAlgorithm {
  constructor() {
    super(LayoutMode.Grid);
  }

  compose(graph: { nodes: GraphNode[]; edges: GraphEdge[] }): SceneGraph {
    const nodes = graph.nodes.map((node, index) => ({
      ...this.annotate(node),
      metadata: {
        ...(node.metadata ?? {}),
        column: index % 6,
        row: Math.floor(index / 6)
      }
    }));
    return {
      nodes,
      edges: graph.edges,
      mode: this.mode
    };
  }
}

export function createLayoutStrategy(mode: LayoutMode): LayoutStrategy {
  switch (mode) {
    case LayoutMode.Grid:
      return new GridLayout();
    case LayoutMode.ForceDirected:
    default:
      return new ForceDirectedLayout();
  }
}

export function graphToScene(graph: { nodes: GraphNode[]; edges: GraphEdge[] }, mode: LayoutMode): SceneGraph {
  const strategy = createLayoutStrategy(mode);
  strategy.configure({ emphasis: 'hovered' });
  return strategy.compose(graph);
}

export function* traverseEdges(graph: { edges: GraphEdge[] }): Generator<GraphEdge> {
  for (const edge of graph.edges) {
    yield edge;
  }
}

export async function loadNodeFormatter(): Promise<NodeTransformer> {
  const mod = await import('./utilities.js');
  return mod.formatNodeLabel;
}

export const sceneDefaults: SceneGraph = {
  nodes: [],
  edges: [],
  mode: LayoutMode.Grid
};

export const graphEvents: Record<string, (payload: unknown) => void> = {
  'graph:update': (payload) => console.debug('graph:update', payload),
  'graph:focus': (payload) => console.debug('graph:focus', payload)
};
