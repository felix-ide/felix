import { useCallback, useState } from 'react';
import { felixService } from '@/services/felixService';
import type { ComponentEdge, ComponentNode, ComponentDetails } from '../types';

interface ComponentMapDataApi {
  nodes: ComponentNode[];
  relationships: ComponentEdge[];
  isLoading: boolean;
  error: string | null;
  nodeDetails: ComponentDetails | null;
  loadRelationships: () => Promise<void>;
  loadNodeDetails: (node: ComponentNode) => Promise<void>;
  resetData: () => void;
  setError: (value: string | null) => void;
}

export function useComponentMapData(): ComponentMapDataApi {
  const [nodes, setNodes] = useState<ComponentNode[]>([]);
  const [relationships, setRelationships] = useState<ComponentEdge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nodeDetails, setNodeDetails] = useState<ComponentDetails | null>(null);

  const loadRelationships = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const relResponse = await felixService.getAllRelationships();
      const allRelationships = relResponse.relationships || [];

      const compResponse = await felixService.getAllComponents();
      const allComponents = compResponse.components || [];

      const componentMap = new Map<string, any>();
      allComponents.forEach((comp: any) => componentMap.set(comp.id, comp));

      const validRelationships: ComponentEdge[] = allRelationships
        .filter((rel: any) => componentMap.has(rel.sourceId) && componentMap.has(rel.targetId))
        .map((rel: any) => ({
          id: rel.id,
          source: rel.sourceId,
          target: rel.targetId,
          type: rel.type,
          metadata: rel.metadata,
        }));

      const relationshipNodes: ComponentNode[] = allComponents.map((comp: any) => ({
        id: comp.id,
        name: comp.name,
        type: comp.type,
        filePath: comp.filePath,
        language: comp.language,
        metadata: comp.metadata,
        x: 0,
        y: 0,
        z: 0,
      }));

      if (relationshipNodes.length > 0) {
        const cubeSize = Math.ceil(Math.pow(relationshipNodes.length, 1 / 3));
        const spacing = 80;
        const offset = ((cubeSize - 1) * spacing) / 2;

        relationshipNodes.forEach((node, index) => {
          const z = Math.floor(index / (cubeSize * cubeSize));
          const y = Math.floor((index % (cubeSize * cubeSize)) / cubeSize);
          const x = index % cubeSize;

          node.x = x * spacing - offset;
          node.y = y * spacing - offset;
          node.z = z * spacing - offset;
        });
      }

      setRelationships(validRelationships);
      setNodes(relationshipNodes);
    } catch (err) {
      console.error('Failed to load relationships:', err);
      setError(err instanceof Error ? err.message : 'Failed to load relationships');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadNodeDetails = useCallback(async (node: ComponentNode) => {
    try {
      const response = await felixService.getContext(node.id, {
        depth: 1,
        includeSource: true,
        includeRelationships: false,
        includeDocumentation: false,
        includeMetadata: true,
        format: 'json',
      });

      if (response.content) {
        const data = JSON.parse(response.content);
        const component = data.components?.find((c: any) => c.id === node.id) || data;
        setNodeDetails({
          ...component,
          source: component.source || component.content,
        });
      }
    } catch (err) {
      console.error('Failed to load node details:', err);
      setNodeDetails(null);
    }
  }, []);

  const resetData = useCallback(() => {
    setNodes([]);
    setRelationships([]);
    setNodeDetails(null);
  }, []);

  return {
    nodes,
    relationships,
    isLoading,
    error,
    nodeDetails,
    loadRelationships,
    loadNodeDetails,
    resetData,
    setError,
  };
}
