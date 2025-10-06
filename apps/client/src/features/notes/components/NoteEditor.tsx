import { useState, useEffect } from 'react';
import { Button } from '@client/shared/ui/Button';
import { Input } from '@client/shared/ui/Input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@client/shared/ui/Card';
import { Save, X, Tag, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { EntityLinksSection } from '@client/shared/components/EntityLinksSection';
import { MockupEditor } from './MockupEditor';
import type { NoteData } from '@/types/api';

interface NoteEditorProps {
  note?: NoteData;
  parentId?: string;
  isOpen: boolean;
  onSave: (note: Omit<NoteData, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
  className?: string;
}

export function NoteEditor({
  note,
  parentId,
  isOpen,
  onSave,
  onCancel,
  className,
}: NoteEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState<'note' | 'warning' | 'documentation' | 'excalidraw' | 'mermaid'>('note');
  const [entityLinks, setEntityLinks] = useState<Array<{entity_type: string; entity_id: string; entity_name?: string; link_strength?: 'primary' | 'secondary' | 'reference'}>>([]);
  const [stableLinks, setStableLinks] = useState<Record<string, any>>({});
  const [fragileLinks, setFragileLinks] = useState<Record<string, any>>({});
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when note changes or editor opens/closes
  useEffect(() => {
    if (isOpen) {
      if (note) {
        // Editing existing note
        setTitle(note.title || '');
        setContent(note.content);
        setNoteType(note.note_type);
        setTags(note.stable_tags || []);
        
        // Set entity links from note data
        setEntityLinks(note.entity_links || []);
        setStableLinks({});
        setFragileLinks({});
      } else {
        // Creating new note
        setTitle('');
        setContent('');
        setNoteType('note');
        setEntityLinks([]);
        setStableLinks({});
        setFragileLinks({});
        setTags([]);
      }
      setNewTag('');
      setIsSaving(false);
    }
  }, [note, isOpen]);

  const handleSave = async () => {
    if (!content.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        title: title.trim() || undefined,
        content: content.trim(),
        note_type: noteType,
        parent_id: parentId || undefined,
        sort_order: 0,
        depth_level: 0,
        entity_type: 'note',
        entity_links: entityLinks.length > 0 ? entityLinks : undefined,
        stable_tags: tags.length > 0 ? tags : undefined,
      });
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className={cn('w-full max-w-2xl max-h-[80vh] flex flex-col', className)}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{note ? 'Edit Note' : 'Create Note'}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 space-y-4 overflow-auto">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Title (optional)
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter note title..."
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* Note Type */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Type
            </label>
            <div className="flex gap-2">
              {(['note', 'warning', 'documentation', 'excalidraw'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setNoteType(type)}
                  className={cn(
                    'px-3 py-1 text-sm rounded-md border transition-colors',
                    noteType === type
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-accent border-border'
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Content *
            </label>
            {noteType === 'excalidraw' ? (
              <MockupEditor
                initialContent={content || undefined}
                onSave={(newContent) => {
                  setContent(newContent);
                }}
                className="border border-input rounded-md"
              />
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note content here..."
                className="w-full h-32 p-3 border border-input rounded-md bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onKeyDown={handleKeyDown}
                required
              />
            )}
          </div>

          {/* Entity Linking */}
          <EntityLinksSection
            entityLinks={entityLinks}
            onEntityLinksUpdate={setEntityLinks}
            stableLinks={stableLinks}
            onStableLinksUpdate={setStableLinks}
            fragileLinks={fragileLinks}
            onFragileLinksUpdate={setFragileLinks}
            compact={true}
          />

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Tags
            </label>
            
            {/* Existing Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground text-sm rounded-md"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add Tag */}
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  } else {
                    handleKeyDown(e);
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTag}
                disabled={!newTag.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            {note ? 'Press Ctrl+Enter to save' : 'Press Ctrl+Enter to create'}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!content.trim() || isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : note ? 'Update' : 'Create'}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}