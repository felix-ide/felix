import { useState } from 'react';
import { Button } from '@client/shared/ui/Button';
import { Input } from '@client/shared/ui/Input';
import { Checkbox } from '@client/shared/ui/checkbox';
import { 
  Plus, 
  X, 
  Check, 
  ChevronDown, 
  ChevronRight,
  List,
  Edit2,
  Trash2
} from 'lucide-react';
import type { Checklist, ChecklistItem } from '@/types/api';

interface ChecklistManagerProps {
  checklists: Checklist[];
  onChange: (checklists: Checklist[]) => void;
  isEditing?: boolean;
  onItemToggle?: (checklistName: string, itemIndex: number) => void;
}

export function ChecklistManager({ 
  checklists = [], 
  onChange, 
  isEditing = false,
  onItemToggle 
}: ChecklistManagerProps) {
  const [expandedChecklists, setExpandedChecklists] = useState<Set<string>>(new Set());
  const [editingChecklistName, setEditingChecklistName] = useState<string | null>(null);
  const [newChecklistName, setNewChecklistName] = useState('');
  const [showAddChecklist, setShowAddChecklist] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});

  const toggleExpanded = (checklistName: string) => {
    const newExpanded = new Set(expandedChecklists);
    if (newExpanded.has(checklistName)) {
      newExpanded.delete(checklistName);
    } else {
      newExpanded.add(checklistName);
    }
    setExpandedChecklists(newExpanded);
  };

  const handleAddChecklist = () => {
    if (!newChecklistName.trim()) return;

    const newChecklist: Checklist = {
      name: newChecklistName.trim(),
      items: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    onChange([...checklists, newChecklist]);
    setNewChecklistName('');
    setShowAddChecklist(false);
    setExpandedChecklists(new Set([...expandedChecklists, newChecklist.name]));
  };

  const handleDeleteChecklist = (checklistName: string) => {
    onChange(checklists.filter(c => c.name !== checklistName));
  };

  const handleRenameChecklist = (oldName: string) => {
    if (!editingName.trim()) return;

    onChange(checklists.map(c => 
      c.name === oldName 
        ? { ...c, name: editingName.trim(), updated_at: new Date().toISOString() }
        : c
    ));
    setEditingChecklistName(null);
    setEditingName('');
  };

  const handleAddItem = (checklistName: string) => {
    const text = newItemTexts[checklistName]?.trim();
    if (!text) return;

    const newItem: ChecklistItem = {
      text,
      checked: false,
      created_at: new Date().toISOString()
    };

    onChange(checklists.map(c => 
      c.name === checklistName 
        ? { 
            ...c, 
            items: [...c.items, newItem],
            updated_at: new Date().toISOString()
          }
        : c
    ));

    setNewItemTexts({ ...newItemTexts, [checklistName]: '' });
  };

  const handleDeleteItem = (checklistName: string, itemIndex: number) => {
    onChange(checklists.map(c => 
      c.name === checklistName 
        ? { 
            ...c, 
            items: c.items.filter((_, idx) => idx !== itemIndex),
            updated_at: new Date().toISOString()
          }
        : c
    ));
  };

  const handleToggleItem = (checklistName: string, itemIndex: number) => {
    if (onItemToggle) {
      // If we have a callback, use it (for real-time updates)
      onItemToggle(checklistName, itemIndex);
    } else {
      // Otherwise update locally (for edit mode)
      onChange(checklists.map(c => 
        c.name === checklistName 
          ? { 
              ...c, 
              items: c.items.map((item, idx) => 
                idx === itemIndex 
                  ? { 
                      ...item, 
                      checked: !item.checked,
                      completed_at: !item.checked ? new Date().toISOString() : undefined
                    }
                  : item
              ),
              updated_at: new Date().toISOString()
            }
          : c
      ));
    }
  };

  const getCompletionStats = (checklist: Checklist) => {
    const total = checklist.items.length;
    const completed = checklist.items.filter(item => item.checked).length;
    return { total, completed };
  };

  return (
    <div className="space-y-3">
      {checklists.map(checklist => {
        const isExpanded = expandedChecklists.has(checklist.name);
        const { total, completed } = getCompletionStats(checklist);
        const isEditingName = editingChecklistName === checklist.name;

        return (
          <div key={checklist.name} className="border rounded-lg p-3 bg-muted/30">
            {/* Checklist Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-1">
                <button
                  onClick={() => toggleExpanded(checklist.name)}
                  className="p-0.5 hover:bg-muted rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                
                {isEditingName ? (
                  <div className="flex items-center gap-1 flex-1">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameChecklist(checklist.name);
                        if (e.key === 'Escape') {
                          setEditingChecklistName(null);
                          setEditingName('');
                        }
                      }}
                      className="h-7 text-sm"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRenameChecklist(checklist.name)}
                      className="h-7 w-7 p-0"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingChecklistName(null);
                        setEditingName('');
                      }}
                      className="h-7 w-7 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1">
                    <List className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium text-sm">{checklist.name}</h4>
                    <span className="text-xs text-muted-foreground">
                      {completed}/{total} {total === 1 ? 'item' : 'items'}
                    </span>
                    {total > 0 && (
                      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${(completed / total) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isEditing && !isEditingName && (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingChecklistName(checklist.name);
                      setEditingName(checklist.name);
                    }}
                    className="h-7 w-7 p-0"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteChecklist(checklist.name)}
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Checklist Items */}
            {isExpanded && (
              <div className="space-y-1 ml-6">
                {checklist.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 py-1">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={() => handleToggleItem(checklist.name, idx)}
                      className="h-4 w-4"
                    />
                    <span 
                      className={`text-sm flex-1 ${item.checked ? 'line-through text-muted-foreground' : ''}`}
                    >
                      {item.text}
                    </span>
                    {isEditing && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteItem(checklist.name, idx)}
                        className="h-6 w-6 p-0 opacity-0 hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}

                {/* Add new item */}
                {isEditing && (
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      value={newItemTexts[checklist.name] || ''}
                      onChange={(e) => setNewItemTexts({ 
                        ...newItemTexts, 
                        [checklist.name]: e.target.value 
                      })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddItem(checklist.name);
                      }}
                      placeholder="Add item..."
                      className="h-7 text-sm"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAddItem(checklist.name)}
                      disabled={!newItemTexts[checklist.name]?.trim()}
                      className="h-7 px-2"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add new checklist */}
      {isEditing && (
        <div>
          {showAddChecklist ? (
            <div className="flex items-center gap-2">
              <Input
                value={newChecklistName}
                onChange={(e) => setNewChecklistName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddChecklist();
                  if (e.key === 'Escape') {
                    setShowAddChecklist(false);
                    setNewChecklistName('');
                  }
                }}
                placeholder="Checklist name..."
                className="h-8 text-sm"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleAddChecklist}
                disabled={!newChecklistName.trim()}
                className="h-8"
              >
                <Check className="h-4 w-4 mr-1" />
                Create
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowAddChecklist(false);
                  setNewChecklistName('');
                }}
                className="h-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddChecklist(true)}
              className="h-8 w-full"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Checklist
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
