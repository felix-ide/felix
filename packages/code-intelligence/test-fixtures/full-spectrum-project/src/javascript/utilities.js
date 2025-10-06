import { LayoutMode, graphToScene, traverseEdges } from './component.ts';

export function formatNodeLabel(node) {
  return `${node.label} (#${node.id})`;
}

export function computeDegreeMap(graph) {
  const degree = new Map();
  for (const edge of traverseEdges(graph)) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  return degree;
}

export async function buildSceneAsync(graph) {
  const formatter = await import('./component.ts').then(mod => mod.loadNodeFormatter());
  const formatNode = await formatter;
  const nodes = graph.nodes.map(formatNode);
  return graphToScene({ nodes, edges: graph.edges }, LayoutMode.Orbit);
}

export class ForceLayoutRuntime {
  constructor(nodes) {
    this.nodes = nodes;
  }

  *iterate(iterations = 10) {
    for (let i = 0; i < iterations; i += 1) {
      yield this.nodes.map(node => ({ ...node, weight: node.weight + i }));
    }
  }
}

export const RUNTIME_VERSION = '1.0.0';
