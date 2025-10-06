import { useMemo } from 'react';

export interface EnhancedContextDataParams {
  parsedContext: any;
  displayMode: 'focus' | 'all';
  focusId?: string | null;
}

export interface EnhancedContextData {
  componentTypeById: Map<string, string>;
  filteredRelationships: any[];
  groupedRelationships: Record<string, any[]>;
  cardComponents: any[];
  groupedCardComponents: Record<string, any[]>;
  allComponents: any[];
}

export function useEnhancedContextData({ parsedContext, displayMode, focusId }: EnhancedContextDataParams): EnhancedContextData {
  const componentTypeById = useMemo(() => {
    const map = new Map<string, string>();
    try {
      const components: any[] = Array.isArray(parsedContext?.components) ? parsedContext.components : [];
      components.forEach((component: any) => {
        if (!component?.id) return;
        const type = typeof component.type === 'string' ? component.type.toLowerCase() : '';
        map.set(String(component.id), type);
      });
    } catch {}
    return map;
  }, [parsedContext?.components]);

  // Show ALL relationships - no filtering by focus
  const filteredRelationships = useMemo(() => {
    const relationships: any[] = Array.isArray(parsedContext?.relationships) ? parsedContext.relationships : [];
    return relationships;
  }, [parsedContext?.relationships]);

  const groupedRelationships = useMemo(() => {
    if (!filteredRelationships.length) return {} as Record<string, any[]>;
    return filteredRelationships.reduce((acc: Record<string, any[]>, relationship: any) => {
      const type = relationship?.type || 'unknown';
      if (!acc[type]) acc[type] = [];
      acc[type]!.push(relationship);
      return acc;
    }, Object.create(null) as Record<string, any[]>);
  }, [filteredRelationships]);

  const fullComponents: any[] = useMemo(() => {
    return Array.isArray(parsedContext?.components) ? parsedContext.components : [];
  }, [parsedContext?.components]);

  // Show ALL components - no filtering
  const cardComponents = useMemo(() => {
    return fullComponents;
  }, [fullComponents]);

  const groupedCardComponents = useMemo(() => {
    if (!cardComponents.length) return {} as Record<string, any[]>;
    return cardComponents.reduce((acc: Record<string, any[]>, component: any) => {
      const type = component?.type || 'unknown';
      if (!acc[type]) acc[type] = [];
      acc[type]!.push(component);
      return acc;
    }, Object.create(null) as Record<string, any[]>);
  }, [cardComponents]);

  return {
    componentTypeById,
    filteredRelationships,
    groupedRelationships,
    cardComponents,
    groupedCardComponents,
    allComponents: fullComponents,
  };
}
