import { useState } from 'react';
import { Button } from '@client/shared/ui/Button';
import { Input } from '@client/shared/ui/Input';
import { Link, X, Code, Database, Trash2, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { EntitySearchModal } from './EntitySearchModal';
import { useEntitySearchModal } from '@client/shared/hooks/useEntitySearchModal';
import { useTheme } from '@felix/theme-system';

export interface EntityLink {
  entity_type: string;
  entity_id: string;
  entity_name?: string;
  link_strength?: 'primary' | 'secondary' | 'reference';
}

interface EntityLinksSectionProps {
  // Current entity linking data
  entityLinks?: EntityLink[];
  stableLinks?: Record<string, any>;
  fragileLinks?: Record<string, any>;
  
  // Update handlers
  onEntityLinksUpdate?: (links: EntityLink[]) => void;
  onStableLinksUpdate?: (links: Record<string, any>) => void;
  onFragileLinksUpdate?: (links: Record<string, any>) => void;
  
  // Configuration
  allowedEntityTypes?: ('component' | 'note' | 'task' | 'rule')[];
  readOnly?: boolean;
  compact?: boolean;
  className?: string;
}

export function EntityLinksSection({
  entityLinks = [],
  stableLinks = {},
  fragileLinks = {},
  onEntityLinksUpdate,
  onStableLinksUpdate,
  onFragileLinksUpdate,
  allowedEntityTypes = ['component', 'note', 'task', 'rule'],
  readOnly = false,
  compact = false,
  className,
}: EntityLinksSectionProps) {
  const { theme } = useTheme();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editingStableLinks, setEditingStableLinks] = useState<Record<string, any>>(stableLinks);
  const [editingFragileLinks, setEditingFragileLinks] = useState<Record<string, any>>(fragileLinks);
  const [newStableLinkKey, setNewStableLinkKey] = useState('');
  const [newStableLinkValue, setNewStableLinkValue] = useState('');
  const [newFragileLinkKey, setNewFragileLinkKey] = useState('');
  const [newFragileLinkValue, setNewFragileLinkValue] = useState('');

  const addEntityLinksModal = useEntitySearchModal((entities) => {
    console.log('🔍 EntityLinksSection - received entities:', entities);
    const entitiesArray = Array.isArray(entities) ? entities : [entities];
    const newLinks: EntityLink[] = entitiesArray.map(entity => ({
      entity_type: entity.type,
      entity_id: entity.id,
      entity_name: entity.name,
      link_strength: 'primary'
    }));
    
    console.log('🔍 EntityLinksSection - calling onEntityLinksUpdate with:', [...entityLinks, ...newLinks]);
    console.log('🔍 EntityLinksSection - onEntityLinksUpdate function:', onEntityLinksUpdate);
    if (onEntityLinksUpdate) {
      onEntityLinksUpdate([...entityLinks, ...newLinks]);
    } else {
      console.error('🔍 EntityLinksSection - onEntityLinksUpdate is undefined!');
    }
  });

  const handleRemoveEntityLink = (index: number) => {
    const updated = entityLinks.filter((_, i) => i !== index);
    onEntityLinksUpdate?.(updated);
  };

  const handleUpdateEntityLinkStrength = (index: number, strength: 'primary' | 'secondary' | 'reference') => {
    const updated = entityLinks.map((link, i) => 
      i === index ? { ...link, link_strength: strength } : link
    );
    onEntityLinksUpdate?.(updated);
  };

  const handleAddStableLink = () => {
    if (newStableLinkKey.trim() && newStableLinkValue.trim()) {
      const updated = {
        ...editingStableLinks,
        [newStableLinkKey.trim()]: newStableLinkValue.trim()
      };
      setEditingStableLinks(updated);
      onStableLinksUpdate?.(updated);
      setNewStableLinkKey('');
      setNewStableLinkValue('');
    }
  };

  const handleRemoveStableLink = (key: string) => {
    const updated = { ...editingStableLinks };
    delete updated[key];
    setEditingStableLinks(updated);
    onStableLinksUpdate?.(updated);
  };

  const handleAddFragileLink = () => {
    if (newFragileLinkKey.trim() && newFragileLinkValue.trim()) {
      const updated = {
        ...editingFragileLinks,
        [newFragileLinkKey.trim()]: newFragileLinkValue.trim()
      };
      setEditingFragileLinks(updated);
      onFragileLinksUpdate?.(updated);
      setNewFragileLinkKey('');
      setNewFragileLinkValue('');
    }
  };

  const handleRemoveFragileLink = (key: string) => {
    const updated = { ...editingFragileLinks };
    delete updated[key];
    setEditingFragileLinks(updated);
    onFragileLinksUpdate?.(updated);
  };

  const getLinkStrengthStyles = (strength?: string): React.CSSProperties => {
    switch (strength) {
      case 'primary':
        return {
          backgroundColor: `${theme.colors.primary[100]}33`,
          color: theme.colors.primary[800],
          borderColor: theme.colors.primary[300]
        };
      case 'secondary':
        return {
          backgroundColor: theme.colors.success[100],
          color: theme.colors.success[800],
          borderColor: theme.colors.success[300]
        };
      case 'reference':
        return {
          backgroundColor: theme.colors.background.elevated,
          color: theme.colors.foreground.primary,
          borderColor: theme.colors.border.primary
        };
      default:
        return {
          backgroundColor: `${theme.colors.primary[100]}33`,
          color: theme.colors.primary[800],
          borderColor: theme.colors.primary[300]
        };
    }
  };

  if (readOnly && entityLinks.length === 0 && Object.keys(stableLinks).length === 0 && Object.keys(fragileLinks).length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Entity Links */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Entity Links</span>
          {!readOnly && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addEntityLinksModal.openModal({
                title: "Link to Entities",
                allowedEntityTypes,
                multiSelect: true
              })}
              className="h-6 px-2 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          )}
        </div>
        
        {entityLinks.length > 0 ? (
          <div className="space-y-2">
            {entityLinks.map((link, index) => (
              <div key={`${link.entity_type}-${link.entity_id}-${index}`} className="flex items-center gap-2 px-2 py-1 bg-muted rounded">
                <Code className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium">{link.entity_type}:</span>
                <span className="text-xs font-mono flex-1">{link.entity_name || link.entity_id}</span>
                
                {!readOnly && (
                  <>
                    <select
                      value={link.link_strength || 'primary'}
                      onChange={(e) => handleUpdateEntityLinkStrength(index, e.target.value as any)}
                      className="text-xs bg-background border border-border rounded px-1 py-0.5"
                    >
                      <option value="primary">Primary</option>
                      <option value="secondary">Secondary</option>
                      <option value="reference">Reference</option>
                    </select>
                    
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border"
                      style={getLinkStrengthStyles(link.link_strength)}
                    >
                      {link.link_strength || 'primary'}
                    </span>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveEntityLink(index)}
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic">No entity links</div>
        )}
      </div>

      {/* Advanced Links Toggle */}
      {(!compact || showAdvanced || Object.keys(stableLinks).length > 0 || Object.keys(fragileLinks).length > 0) && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Database className="h-3 w-3 mr-1" />
            Advanced Linking
            {showAdvanced ? <X className="h-3 w-3 ml-1" /> : <Plus className="h-3 w-3 ml-1" />}
          </Button>
        </div>
      )}

      {/* Advanced Links Section */}
      {showAdvanced && (
        <div className="space-y-3 pl-4 border-l-2 border-muted">
          {/* Stable Links (Signature-based) */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Code className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">
                Stable Links (Signatures)
              </span>
              <span className="text-xs text-muted-foreground">
                - Survive refactoring
              </span>
            </div>
            
            {Object.entries(editingStableLinks).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 mb-1">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                    {key}
                  </span>
                  <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                    {String(value)}
                  </span>
                </div>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveStableLink(key)}
                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            
            {!readOnly && (
              <div className="flex gap-2">
                <Input
                  value={newStableLinkKey}
                  onChange={(e) => setNewStableLinkKey(e.target.value)}
                  placeholder="e.g., file_path"
                  className="h-6 text-xs"
                />
                <Input
                  value={newStableLinkValue}
                  onChange={(e) => setNewStableLinkValue(e.target.value)}
                  placeholder="e.g., src/auth/UserService.ts"
                  className="h-6 text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddStableLink}
                  disabled={!newStableLinkKey.trim() || !newStableLinkValue.trim()}
                  className="h-6 w-6 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Fragile Links (ID-based) */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-3 w-3 text-red-600" />
              <span className="text-xs font-medium text-muted-foreground">
                Fragile Links (Exact IDs)
              </span>
              <span className="text-xs text-muted-foreground">
                - Break on changes
              </span>
            </div>
            
            {Object.entries(editingFragileLinks).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 mb-1">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                    {key}
                  </span>
                  <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                    {String(value)}
                  </span>
                </div>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFragileLink(key)}
                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            
            {!readOnly && (
              <div className="flex gap-2">
                <Input
                  value={newFragileLinkKey}
                  onChange={(e) => setNewFragileLinkKey(e.target.value)}
                  placeholder="e.g., component_id"
                  className="h-6 text-xs"
                />
                <Input
                  value={newFragileLinkValue}
                  onChange={(e) => setNewFragileLinkValue(e.target.value)}
                  placeholder="e.g., comp_123456"
                  className="h-6 text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddFragileLink}
                  disabled={!newFragileLinkKey.trim() || !newFragileLinkValue.trim()}
                  className="h-6 w-6 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Help Text */}
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <div className="font-medium mb-1">Link Types:</div>
            <div>• <strong>Entity Links</strong>: Direct references to components, notes, tasks, rules</div>
            <div>• <strong>Stable Links</strong>: File paths, function names - survive refactoring</div>
            <div>• <strong>Fragile Links</strong>: Exact IDs, temporary references - may break</div>
          </div>
        </div>
      )}

      <EntitySearchModal {...addEntityLinksModal.modalProps} />
    </div>
  );
}