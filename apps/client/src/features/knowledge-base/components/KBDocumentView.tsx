import { useEffect, useState } from 'react';
import { MarkdownRenderer } from '@client/shared/components/MarkdownRenderer';
import { MarkdownEditor } from '@client/shared/components/MarkdownEditor';
import { RuleCard } from '@client/features/rules/components/RuleCard';
import { useRulesStore } from '@client/features/rules/state/rulesStore';
import { useKnowledgeBaseStore } from '../state/knowledgeBaseStore';
import type { KBNode, KBConfigField } from '../api/knowledgeBaseApi';
import type { RuleData } from '@/types/api';
import { ChevronRight, Edit2, Save, X, Plus, FileCheck } from 'lucide-react';
import { Button } from '@client/shared/ui/Button';
import { Input } from '@client/shared/ui/Input';
import { cn } from '@/utils/cn';
import { KBInlineConfig } from './KBInlineConfig';

interface KBDocumentViewProps {
  rootNode: KBNode;
  configSchema?: KBConfigField[];
  onSectionClick?: (nodeId: string) => void;
}

export function KBDocumentView({ rootNode, configSchema, onSectionClick }: KBDocumentViewProps) {
  return (
    <div className="max-w-full px-12 py-6">
      <KBNodeRenderer
        node={rootNode}
        level={0}
        configSchema={configSchema}
        onSectionClick={onSectionClick}
      />
    </div>
  );
}

interface KBNodeRendererProps {
  node: KBNode;
  level: number;
  configSchema?: KBConfigField[];
  onSectionClick?: (nodeId: string) => void;
}

function KBNodeRenderer({ node, level, configSchema, onSectionClick }: KBNodeRendererProps) {
  const { rules, updateRule } = useRulesStore();
  const { updateNode, createNode, updateKBConfig, isLoading } = useKnowledgeBaseStore();
  const [nodeRules, setNodeRules] = useState<RuleData[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(node.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [newChildTitle, setNewChildTitle] = useState('');
  const [showRules, setShowRules] = useState(true);

  // Filter rules for this specific node
  useEffect(() => {
    const linkedRules = rules.filter(rule =>
      rule.entity_links?.some(
        link => link.entity_type === 'note' && link.entity_id === node.id
      )
    );
    setNodeRules(linkedRules);
  }, [node.id, rules]);

  // Reset edited content when node changes
  useEffect(() => {
    setEditedContent(node.content || '');
  }, [node.content]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateNode(node.id, { content: editedContent });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save KB node:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEditing = () => {
    console.log('[KBDocumentView] Starting edit mode for node:', node.id);
    console.log('[KBDocumentView] node.content:', node.content);
    console.log('[KBDocumentView] node.content length:', node.content?.length);
    console.log('[KBDocumentView] editedContent state:', editedContent);
    console.log('[KBDocumentView] editedContent length:', editedContent.length);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedContent(node.content || '');
    setIsEditing(false);
  };

  const handleAddChild = async () => {
    if (!newChildTitle.trim()) return;

    setIsSaving(true);
    try {
      await createNode(node.id, newChildTitle.trim(), '# ' + newChildTitle.trim() + '\n\nWrite your content here...');
      setIsAddingChild(false);
      setNewChildTitle('');
    } catch (error) {
      console.error('Failed to create child node:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelAddChild = () => {
    setIsAddingChild(false);
    setNewChildTitle('');
  };

  // Determine if this is a root or section node
  const isRoot = level === 0;
  const isSection = level === 1;
  const isSubsection = level === 2;
  const isProjectKB = node.metadata?.is_kb_root === true;

  // Handler to save config
  const handleSaveConfig = async (config: Record<string, any>) => {
    await updateKBConfig(node.id, config);
  };

  return (
    <section
      id={`kb-node-${node.id}`}
      className={cn(
        'scroll-mt-20',
        isRoot && 'mb-12',
        isSection && 'mb-10',
        isSubsection && 'mb-8'
      )}
    >
      {/* Root KB Header */}
      {isRoot && isProjectKB && (
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{node.title}</h1>
          {node.metadata?.template_name && (
            <p className="text-sm text-muted-foreground">
              Template: {node.metadata.template_name} v{node.metadata.template_version}
            </p>
          )}
        </div>
      )}

      {/* Inline Config Section */}
      {isRoot && isProjectKB && configSchema && configSchema.length > 0 && (
        <KBInlineConfig
          kbId={node.id}
          configSchema={configSchema}
          existingConfig={node.metadata?.kb_config || {}}
          onSave={handleSaveConfig}
          isSaving={isLoading}
        />
      )}

      {/* Node Header */}
      {!isRoot && (
        <div
          className={cn(
            'flex items-center gap-2 mb-4',
            isSection && 'border-b border-border pb-3',
            isSubsection && 'pl-4'
          )}
        >
          <div
            className="flex items-center gap-2 flex-1 cursor-pointer"
            onClick={() => onSectionClick?.(node.id)}
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <h2
              className={cn(
                'font-semibold',
                isSection && 'text-2xl',
                isSubsection && 'text-xl'
              )}
            >
              {node.title}
            </h2>
            {node.metadata?.icon && (
              <span className="text-muted-foreground text-sm">
                {node.metadata.icon}
              </span>
            )}
          </div>
          {!isEditing && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRules(!showRules)}
                className={cn("h-7 px-2", nodeRules.length > 0 && "text-primary")}
                title={nodeRules.length > 0 ? `${nodeRules.length} rule${nodeRules.length > 1 ? 's' : ''}` : "Add rules"}
              >
                <FileCheck className="w-3 h-3" />
                {nodeRules.length > 0 && <span className="text-xs ml-0.5">{nodeRules.length}</span>}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingChild(true)}
                className="h-7 px-2"
                title="Add sub-section"
              >
                <Plus className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStartEditing}
                className="h-7 px-2"
                title="Edit content"
              >
                <Edit2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Node Content */}
      {node.content && (
        <div className={cn('mb-6', isSubsection && 'pl-4')}>
          {isEditing ? (
            <div className="space-y-3">
              {/* Save/Cancel Toolbar */}
              <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border border-border rounded-lg">
                <span className="text-xs text-muted-foreground font-medium">Editing Content</span>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    size="sm"
                    className="h-7"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    disabled={isSaving}
                    variant="outline"
                    size="sm"
                    className="h-7"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>

              {/* Milkdown WYSIWYG Editor */}
              <MarkdownEditor
                value={editedContent}
                onChange={(value) => setEditedContent(value)}
              />
            </div>
          ) : (
            <MarkdownRenderer content={node.content} prose={false} />
          )}
        </div>
      )}

      {/* Attached Rules */}
      {showRules && nodeRules.length > 0 && (
        <div className={cn('mb-8 p-4 border border-border rounded-lg bg-muted/10', isSubsection && 'ml-4')}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">
              Attached Rules ({nodeRules.length})
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => {
                // TODO: Implement rule creation
                alert('Rule creation UI coming soon! For now, rules are created from the template or Rules section.');
              }}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Rule
            </Button>
          </div>
          <div className="space-y-2">
            {nodeRules.map(rule => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onUpdate={(ruleId, updates) => updateRule(ruleId, updates)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add Child Form */}
      {isAddingChild && (
        <div className={cn('mb-6 p-4 border border-border rounded-lg bg-muted/20', isSubsection && 'pl-4')}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">New Sub-Section Title</label>
              <Input
                type="text"
                value={newChildTitle}
                onChange={(e) => setNewChildTitle(e.target.value)}
                placeholder="e.g., Getting Started, Configuration..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddChild();
                  if (e.key === 'Escape') handleCancelAddChild();
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAddChild}
                disabled={!newChildTitle.trim() || isSaving}
                size="sm"
              >
                <Plus className="w-3 h-3 mr-1" />
                {isSaving ? 'Creating...' : 'Create'}
              </Button>
              <Button
                onClick={handleCancelAddChild}
                disabled={isSaving}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Child Nodes */}
      {node.children && node.children.length > 0 && (
        <div className={cn(isRoot && 'space-y-12', isSection && 'space-y-8')}>
          {node.children.map(child => (
            <KBNodeRenderer
              key={child.id}
              node={child}
              level={level + 1}
              configSchema={configSchema}
              onSectionClick={onSectionClick}
            />
          ))}
        </div>
      )}
    </section>
  );
}
