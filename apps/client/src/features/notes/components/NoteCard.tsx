import { useState, useRef, useEffect } from 'react';
import { Edit, Trash2, GripVertical, FileText, AlertTriangle, BookOpen, Check, X, Tag, Calendar, ChevronDown, ChevronRight, ChevronUp, Hash, Copy, Layout, MoreVertical, Download, Plus } from 'lucide-react';
import { Button } from '@client/shared/ui/Button';
import { cn } from '@/utils/cn';
import { MarkdownRenderer } from '@client/shared/components/MarkdownRenderer';
import { MockupViewer } from './MockupViewer';
import { MockupEditor } from './MockupEditor';
import { EntityLinksSection, EntityLink } from '@client/shared/components/EntityLinksSection';
import { Input } from '@client/shared/ui/Input';
import { useTheme, getNoteTypeColors } from '@felix/theme-system';
import type { NoteData } from '@/types/api';

interface NoteCardProps {
  note: NoteData;
  isSelected?: boolean;
  isChecked?: boolean;
  onSelect?: () => void;
  onToggleCheck?: () => void;
  onEdit?: () => void;
  onUpdate?: (noteId: string, updates: Partial<NoteData>) => void;
  onDelete?: () => void;
  // onTypeChange?: (type: NoteData['note_type']) => void;
  onAddSubNote?: (noteId: string) => void;
  dragHandleProps?: any;
  className?: string;
}

export function NoteCard({
  note,
  isSelected = false,
  isChecked = false,
  onSelect,
  onToggleCheck,
  onEdit,
  onUpdate,
  onDelete,
  // onTypeChange,
  onAddSubNote,
  dragHandleProps,
  className,
}: NoteCardProps) {
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title || '');
  const [editContent, setEditContent] = useState(note.content);
  const [editType, setEditType] = useState(note.note_type);
  const [editEntityLinks, setEditEntityLinks] = useState<EntityLink[]>(note.entity_links || []);
  const [editTags, setEditTags] = useState<string[]>(note.stable_tags || []);
  const [editStableLinks, setEditStableLinks] = useState<Record<string, any>>(note.stable_links || {});
  const [editFragileLinks, setEditFragileLinks] = useState<Record<string, any>>(note.fragile_links || {});
  const [newTag, setNewTag] = useState('');
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdate) {
      // Use inline editing when onUpdate is available
      setIsEditing(true);
      setEditTitle(note.title || '');
      setEditContent(note.content);
      setEditType(note.note_type);
      setEditEntityLinks(note.entity_links || []);
      setEditTags(note.stable_tags || []);
      setEditStableLinks(note.stable_links || {});
      setEditFragileLinks(note.fragile_links || {});
    } else if (onEdit) {
      // Fall back to modal editing
      onEdit();
    }
  };

  const handleSaveEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdate) {
      // Always send all editable fields
      const updates: Partial<NoteData> = {
        title: editTitle.trim() || undefined,
        content: editContent.trim(),
        note_type: editType,
        entity_links: editEntityLinks.length > 0 ? editEntityLinks : undefined,
        stable_tags: editTags.length > 0 ? editTags : undefined,
        stable_links: Object.keys(editStableLinks).length > 0 ? editStableLinks : undefined,
        fragile_links: Object.keys(editFragileLinks).length > 0 ? editFragileLinks : undefined
      };
      
      onUpdate(note.id, updates);
    }
    setIsEditing(false);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !editTags.includes(newTag.trim())) {
      setEditTags([...editTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditTags(editTags.filter(tag => tag !== tagToRemove));
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    setEditTitle(note.title || '');
    setEditContent(note.content);
    setEditType(note.note_type);
    setEditEntityLinks(note.entity_links || []);
    setEditTags(note.stable_tags || []);
    setEditStableLinks(note.stable_links || {});
    setEditFragileLinks(note.fragile_links || {});
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && e.target instanceof HTMLInputElement) {
      e.preventDefault();
      handleSaveEdit(e as any);
    } else if (e.key === 'Escape') {
      handleCancelEdit(e as any);
    }
  };

  const getNoteTypeInfo = (type: string) => {
    const colors = getNoteTypeColors(theme, type);
    const iconMap: Record<string, any> = {
      warning: AlertTriangle,
      documentation: BookOpen,
      excalidraw: Layout,
      note: FileText,
      mermaid: Layout
    };

    return {
      icon: iconMap[type] || FileText,
      styles: {
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border
      }
    };
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getShortId = () => {
    // Extract the hash part after the timestamp
    const parts = note.id.split('_');
    return parts[parts.length - 1] || note.id.substring(0, 8);
  };

  const handleCopyId = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(note.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch (err) {
      console.error('Failed to copy ID:', err);
    }
  };
  

  // Handle click outside for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const handleExportNote = async () => {
    try {
      const { felixService } = await import('@/services/felixService');
      const exportData = await felixService.exportNotes({
        noteIds: [note.id],
        includeChildren: true
      });

      // Convert to JSON and create download
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `note-${note.id}-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export note:', error);
    }
    setShowDropdown(false);
  };

  const noteTypeInfo = getNoteTypeInfo(note.note_type);
  const NoteTypeIcon = noteTypeInfo.icon;

  return (
    <div
      onClick={onSelect}
      className={cn(
        'px-3 py-2 border rounded-lg cursor-pointer transition-all relative group hover:shadow-sm',
        isSelected
          ? 'border-primary bg-accent/50 shadow-sm'
          : 'border-border hover:border-primary/50',
        className
      )}
    >
      {/* Header Row */}
      <div className={cn("flex items-start gap-3", (isContentExpanded || isEditing) && "mb-3")}>
        {/* Checkbox for bulk selection - only show if onToggleCheck is provided */}
        {onToggleCheck && (
          <div className="mt-1">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => {
                e.stopPropagation();
                onToggleCheck();
              }}
              className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
            />
          </div>
        )}
        
        {/* Drag Handle - only show if dragHandleProps provided */}
        {dragHandleProps && (
          <div
            {...dragHandleProps}
            className="mt-1 p-1 hover:bg-accent rounded cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {/* Note Type Icon */}
            <div
              className="inline-flex items-center px-1.5 py-0.5 rounded border text-xs font-medium"
              style={noteTypeInfo.styles}
            >
              <NoteTypeIcon className="h-3 w-3 mr-1" />
              {note.note_type}
            </div>
            
            {/* Title */}
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                placeholder="Note title (optional)"
                className="font-medium text-sm flex-1 bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
            ) : note.title ? (
              <h3 className="font-medium text-sm flex-1">
                {note.title}
              </h3>
            ) : (
              <span className="text-sm text-muted-foreground italic flex-1">
                Untitled note
              </span>
            )}
            
            {/* Note ID Hash */}
            {!isEditing && (
              <button
                onClick={handleCopyId}
                className="group flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors"
                style={{
                  backgroundColor: theme.type === 'dark' ? `${theme.colors.background.tertiary}73` : theme.colors.secondary[50],
                  color: theme.type === 'dark' ? theme.colors.foreground.secondary : theme.colors.secondary[800],
                  borderColor: theme.type === 'dark' ? theme.colors.border.primary : theme.colors.secondary[200]
                }}
                title={`Copy ID: ${note.id}`}
              >
                <Hash className="h-3 w-3" />
                <span className="text-xs font-mono">
                  {getShortId()}
                </span>
                <Copy className={cn(
                  "h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity",
                  copiedId ? "text-success" : "opacity-60"
                )} />
                {copiedId && (
                  <span className="text-xs text-success ml-1">Copied!</span>
                )}
              </button>
            )}
          </div>
          
          {/* Note Type Selector during editing */}
          {isEditing && (
            <div className="flex items-center gap-2 mt-2">
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value as any)}
                onClick={(e) => e.stopPropagation()}
                className="text-xs bg-background border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                <option value="note">📝 Note</option>
                <option value="warning">⚠️ Warning</option>
                <option value="documentation">📚 Documentation</option>
                <option value="excalidraw">🎨 Excalidraw</option>
              </select>
            </div>
          )}
          
          {/* Entity Link */}
          {isEditing ? (
            <div className="mb-3 mt-2" onClick={(e) => e.stopPropagation()}>
              <EntityLinksSection
                entityLinks={editEntityLinks}
                stableLinks={editStableLinks}
                fragileLinks={editFragileLinks}
                onEntityLinksUpdate={setEditEntityLinks}
                onStableLinksUpdate={setEditStableLinks}
                onFragileLinksUpdate={setEditFragileLinks}
                allowedEntityTypes={['component', 'task', 'rule', 'note']}
                compact={true}
              />
            </div>
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveEdit}
                className="h-8 w-8 p-0 text-success hover:text-success/90"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive/90"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditClick}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
              
              {/* Collapse button when expanded */}
              {isContentExpanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsContentExpanded(false);
                  }}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  title="Collapse"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onAddSubNote?.(note.id);
            }}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
          
          {/* Dropdown Menu */}
          <div className="relative" ref={dropdownRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowDropdown(!showDropdown);
              }}
              className="h-8 w-8 p-0"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            
            {showDropdown && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-md border bg-popover p-1 shadow-md">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportNote();
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <Download className="h-4 w-4" />
                  Export with children
                </button>
                <div className="my-1 h-px bg-border" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.();
                    setShowDropdown(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Second line - metadata when collapsed */}
      {!isContentExpanded && !isEditing && (
        <div className="flex items-center gap-1.5 text-xs flex-wrap">
          {/* Key metadata as nice tags */}
          {note.entity_links && note.entity_links.length > 0 && note.entity_links.map((link, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium border"
              style={{
                backgroundColor: theme.type === 'dark' ? `${theme.colors.background.tertiary}73` : theme.colors.info[50],
                color: theme.type === 'dark' ? theme.colors.info[300] : theme.colors.info[700],
                borderColor: theme.type === 'dark' ? theme.colors.border.primary : theme.colors.info[200]
              }}
              title={`${link.entity_type}: ${link.entity_id}`}
            >
              <Hash className="h-3 w-3" />
              <span className="font-mono text-[10px]">
                {link.entity_type}:{link.entity_id.split('_').pop()?.substring(0, 6)}
              </span>
            </span>
          ))}
          {note.stable_tags && note.stable_tags.length > 0 && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium border"
              style={{
                backgroundColor: theme.type === 'dark' ? `${theme.colors.background.tertiary}73` : theme.colors.accent[50],
                color: theme.type === 'dark' ? theme.colors.accent[300] : theme.colors.accent[700],
                borderColor: theme.type === 'dark' ? theme.colors.border.primary : theme.colors.accent[200]
              }}
            >
              <Tag className="h-3 w-3" />
              {note.stable_tags.length} {note.stable_tags.length === 1 ? 'tag' : 'tags'}
            </span>
          )}
          <span
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium border"
            style={{
              backgroundColor: theme.type === 'dark' ? `${theme.colors.background.tertiary}73` : theme.colors.secondary[50],
              color: theme.type === 'dark' ? theme.colors.foreground.secondary : theme.colors.secondary[800],
              borderColor: theme.type === 'dark' ? theme.colors.border.primary : theme.colors.secondary[200]
            }}
          >
            <Calendar className="h-3 w-3" />
            {formatDate(note.created_at)}
          </span>
          {note.updated_at && note.updated_at !== note.created_at && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium border"
              style={{ backgroundColor: theme.colors.warning[100], color: theme.colors.warning[700], borderColor: theme.colors.warning[200] }}
            >
              Updated {formatDate(note.updated_at)}
            </span>
          )}
          
          {/* Expand button always visible */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsContentExpanded(true);
            }}
            className="ml-auto inline-flex items-center gap-0.5 px-1.5 py-0.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-all"
          >
            <ChevronRight className="h-3 w-3" />
            <span className="hidden sm:inline text-xs">More</span>
          </button>
        </div>
      )}

      {/* Content - Only show when expanded or editing */}
      {(isContentExpanded || isEditing) && (
        <div className="mb-3">
          {isEditing ? (
            note.note_type === 'excalidraw' ? (
              <MockupEditor
                initialContent={editContent || undefined}
                onSave={(newContent) => setEditContent(newContent)}
                className="border border-border rounded"
              />
            ) : (
              <>
                <div className="mb-1 text-xs text-muted-foreground">
                  Supports markdown formatting
                </div>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Note content... (supports markdown)"
                  className="w-full text-sm bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none font-mono"
                  rows={6}
                />
              </>
            )
          ) : note.note_type === 'excalidraw' ? (
            <MockupViewer content={note.content} minHeight={300} maxHeight={500} />
          ) : (
            <MarkdownRenderer content={note.content} />
          )}
        </div>
      )}

      {/* Tags */}
      {isEditing ? (
        <div className="mb-3">
          <div className="text-xs text-muted-foreground mb-1">Tags</div>
          {editTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {editTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border"
                  style={{
                    backgroundColor: theme.type === 'dark' ? `${theme.colors.background.tertiary}73` : theme.colors.accent[50],
                    color: theme.type === 'dark' ? theme.colors.accent[300] : theme.colors.accent[700],
                    borderColor: theme.type === 'dark' ? theme.colors.border.primary : theme.colors.accent[200]
                  }}
                >
                  <Tag className="h-2 w-2" />
                  {tag}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTag(tag);
                    }}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-2 w-2" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-1">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Add tag..."
              className="flex-1 h-6 text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleAddTag();
              }}
              disabled={!newTag.trim()}
              className="h-6 w-6 p-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (isContentExpanded && note.stable_tags && note.stable_tags.length > 0) ? (
        <div className="flex flex-wrap gap-1 mb-3">
          {note.stable_tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border"
              style={{
                backgroundColor: theme.type === 'dark' ? `${theme.colors.background.tertiary}73` : theme.colors.accent[50],
                color: theme.type === 'dark' ? theme.colors.accent[300] : theme.colors.accent[700],
                borderColor: theme.type === 'dark' ? theme.colors.border.primary : theme.colors.accent[200]
              }}
            >
              <Tag className="h-2 w-2" />
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {/* Collapse button when expanded */}
      {isContentExpanded && !isEditing && (
        <div className="flex justify-end mt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsContentExpanded(false);
            }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className="h-3 w-3" />
            Less
          </button>
        </div>
      )}
    </div>
  );
}
