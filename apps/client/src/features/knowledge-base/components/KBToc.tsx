import { cn } from '@/utils/cn';
import { useState, useEffect } from 'react';
import {
  BookOpen, Layers, CheckCircle, Code, Database,
  Beaker, Server, Bug, Clock, Shield, FileText,
  ChevronRight, ChevronDown, FileCode, Edit3, Plus, FileCheck
} from 'lucide-react';
import type { KBNode } from '../api/knowledgeBaseApi';
import { useRulesStore } from '@client/features/rules/state/rulesStore';

const iconMap: Record<string, any> = {
  book: BookOpen,
  layers: Layers,
  'check-circle': CheckCircle,
  code: Code,
  database: Database,
  beaker: Beaker,
  server: Server,
  bug: Bug,
  clock: Clock,
  api: FileText,
  shield: Shield
};

interface KBTocProps {
  rootNode: KBNode;
  activeNodeId?: string;
  onNodeClick: (nodeId: string) => void;
}

export function KBToc({ rootNode, activeNodeId, onNodeClick }: KBTocProps) {
  const { rules } = useRulesStore();

  const scrollToNode = (nodeId: string) => {
    const element = document.getElementById(`kb-node-${nodeId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      onNodeClick(nodeId);
    }
  };

  // Get rules for a specific node
  const getNodeRules = (nodeId: string) => {
    return rules.filter(rule =>
      rule.entity_links?.some(
        link => link.entity_type === 'note' && link.entity_id === nodeId
      )
    );
  };

  // Count nodes with rules or diagrams recursively
  const countIndicators = (node: KBNode): { rules: number; diagrams: number } => {
    let rules = 0;
    let diagrams = 0;

    // Check current node's content for mermaid diagrams
    if (node.content && node.content.includes('```mermaid')) {
      diagrams++;
    }

    // Rules are detected by checking children for attached rules (we'll add this metadata later)
    // For now, mark it as having rules if it has children

    // Recursively count children
    if (node.children) {
      node.children.forEach(child => {
        const childCounts = countIndicators(child);
        rules += childCounts.rules;
        diagrams += childCounts.diagrams;
      });
    }

    return { rules, diagrams };
  };

  return (
    <nav className="h-full overflow-y-auto py-4 px-2">
      <h3 className="text-sm font-semibold mb-4 px-2">{rootNode.title}</h3>
      <div className="space-y-1">
        {rootNode.children?.map(section => (
          <TocSection
            key={section.id}
            node={section}
            level={0}
            activeNodeId={activeNodeId}
            onNodeClick={scrollToNode}
            getNodeRules={getNodeRules}
          />
        ))}
      </div>
    </nav>
  );
}

interface TocSectionProps {
  node: KBNode;
  level: number;
  activeNodeId?: string;
  onNodeClick: (nodeId: string) => void;
  getNodeRules: (nodeId: string) => any[];
}

function TocSection({ node, level, activeNodeId, onNodeClick, getNodeRules }: TocSectionProps) {
  const isActive = activeNodeId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  // Check for diagrams in content
  const hasDiagrams = node.content && node.content.includes('```mermaid');

  // Check for attached rules
  const nodeRules = getNodeRules(node.id);
  const hasRules = nodeRules.length > 0;

  // Get the appropriate icon component
  const IconComponent = node.metadata?.icon ? iconMap[node.metadata.icon] : null;

  return (
    <div>
      <button
        onClick={() => onNodeClick(node.id)}
        className={cn(
          'w-full text-left px-3 py-1.5 text-sm rounded transition-colors',
          level === 0 && 'font-medium',
          level === 1 && 'pl-6 text-muted-foreground',
          isActive
            ? 'bg-primary/10 text-primary font-medium'
            : 'hover:bg-accent hover:text-foreground'
        )}
      >
        <span className="flex items-center gap-2 justify-between">
          <span className="flex items-center gap-2">
            {IconComponent && (
              <IconComponent className="w-4 h-4" />
            )}
            {node.title}
          </span>
          <span className="flex items-center gap-1">
            {hasRules && (
              <span className="flex items-center gap-0.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded" title={`${nodeRules.length} rule${nodeRules.length > 1 ? 's' : ''}`}>
                <FileCheck className="w-3 h-3" />
                {nodeRules.length}
              </span>
            )}
            {hasDiagrams && (
              <span className="text-xs text-blue-500" title="Contains diagrams">📊</span>
            )}
          </span>
        </span>
      </button>

      {hasChildren && (
        <div className="mt-1">
          {node.children!.map(child => (
            <TocSection
              key={child.id}
              node={child}
              level={level + 1}
              activeNodeId={activeNodeId}
              onNodeClick={onNodeClick}
              getNodeRules={getNodeRules}
            />
          ))}
        </div>
      )}
    </div>
  );
}
