import { useState, useEffect, useRef } from 'react';
import { Filter, BarChart3, Search, Download, Upload, FileDown, ChevronDown, CheckSquare, X, Settings, Plus } from 'lucide-react';
import { Button } from '@client/shared/ui/Button';
import { Input } from '@client/shared/ui/Input';
import { RuleCard } from './RuleCard';
import { DragDropHierarchy } from '@client/shared/components/DragDropHierarchy';
import { useUIStore } from '@client/shared/state/uiStore';
import { useRulesStore } from '@client/features/rules/state/rulesStore';
import { felixService } from '@/services/felixService';
import { cn } from '@/utils/cn';
import type { RuleData } from '@/types/api';

interface RuleHierarchyProps {
  rules: RuleData[];
  selectedRuleId?: string;
  onRuleSelect?: (ruleId: string) => void;
  onRuleEdit?: (rule: RuleData) => void;
  onRuleUpdate?: (ruleId: string, updates: Partial<RuleData>) => void;
  onRuleDelete?: (ruleId: string) => void;
  onCreateNew?: (parentId?: string) => void;
  onReorder?: (ruleId: string, newParentId: string | null, newSortOrder: number) => void;
  onAddSubRule?: (ruleId: string) => void;
  onToggleAnalytics?: () => void;
  showAnalytics?: boolean;
  className?: string;
}

export function RuleHierarchy({
  rules,
  selectedRuleId,
  onRuleSelect,
  onRuleEdit,
  onRuleUpdate,
  onRuleDelete,
  onCreateNew,
  onReorder,
  onAddSubRule,
  onToggleAnalytics,
  showAnalytics,
  className,
}: RuleHierarchyProps) {
  const { 
    expandedRules, 
    ruleTypeFilter, 
    toggleRuleExpanded, 
    setRuleTypeFilter 
  } = useUIStore();
  
  const { 
    selectedRuleIds, 
    toggleRuleSelection, 
    clearSelection,
    selectAll
  } = useRulesStore();
  
  const [localTypeFilter, setLocalTypeFilter] = useState(ruleTypeFilter);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  
  // Sync local type filter with store
  useEffect(() => {
    setRuleTypeFilter(localTypeFilter);
  }, [localTypeFilter, setRuleTypeFilter]);

  // Handle click outside for export menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu]);

  // Clear selection when exiting selection mode
  useEffect(() => {
    if (!isSelectionMode) {
      clearSelection();
    }
  }, [isSelectionMode, clearSelection]);

  // Filter rules
  const filterRule = (rule: RuleData): boolean => {
    // Search filter - check all relevant fields
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      
      // Check for exact ID match first (handles partial IDs like "rule_1749052597284" or full IDs)
      if (rule.id && rule.id.toLowerCase().includes(query)) {
        return true;
      }
      
      const searchableText = [
        rule.name,
        rule.description,
        rule.rule_type,
        rule.guidance_text,
        rule.code_template,
        rule.validation_script,
        ...(rule.stable_tags || [])
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!searchableText.includes(query)) {
        return false;
      }
    }
    
    // Apply type filter
    if (localTypeFilter !== 'all' && rule.rule_type !== localTypeFilter) {
      return false;
    }
    
    // Apply status filter
    if (statusFilter === 'active' && !rule.active) {
      return false;
    }
    if (statusFilter === 'inactive' && rule.active) {
      return false;
    }
    
    // Apply priority filter
    if (priorityFilter !== 'all') {
      const priority = parseInt(priorityFilter);
      if (rule.priority < priority) {
        return false;
      }
    }
    
    return true;
  };

  // Sort rules by sort_order and priority
  const sortRules = (ruleList: RuleData[]) => {
    return ruleList.sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      // Higher priority first (10 > 1)
      return b.priority - a.priority;
    });
  };

  // Render rule card
  const renderRuleCard = (rule: RuleData, dragHandleProps: any) => (
    <RuleCard
      rule={rule}
      isSelected={rule.id === selectedRuleId}
      isChecked={selectedRuleIds.has(rule.id)}
      onSelect={() => onRuleSelect?.(rule.id)}
      onToggleCheck={isSelectionMode ? () => toggleRuleSelection(rule.id) : undefined}
      onEdit={() => onRuleEdit?.(rule)}
      onUpdate={onRuleUpdate}
      onDelete={() => onRuleDelete?.(rule.id)}
      onAddSubRule={() => onAddSubRule?.(rule.id)}
      dragHandleProps={dragHandleProps}
    />
  );

  const uniqueTypes = Array.from(new Set(rules.map(rule => rule.rule_type)));

  const handleExportAll = async () => {
    try {
      const exportData = await felixService.exportRules({
        includeInactive: true,
        includeChildren: true
      });

      // Convert to JSON and create download
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rules-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export rules:', error);
    }
    setShowExportMenu(false);
  };

  const handleExportSelected = async () => {
    if (selectedRuleIds.size === 0) return;
    
    try {
      const exportData = await felixService.exportRules({
        ruleIds: Array.from(selectedRuleIds),
        includeInactive: true,
        includeChildren: true
      });

      // Convert to JSON and create download
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rules-selected-${selectedRuleIds.size}-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export selected rules:', error);
    }
    setShowExportMenu(false);
    setIsSelectionMode(false);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const result = await felixService.importRules(data, {
        mergeStrategy: 'skip', // Don't overwrite existing rules
        activateOnImport: true
      });

      console.log('Import result:', result);
      
      // Reload rules to show imported ones
      window.dispatchEvent(new Event('project-restored'));
    } catch (error) {
      console.error('Failed to import rules:', error);
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Header with filters and actions */}
      <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Rules
          </h2>
          
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 h-8"
            />
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={localTypeFilter}
              onChange={(e) => setLocalTypeFilter(e.target.value)}
              className="text-sm bg-background border border-border rounded px-2 py-1"
            >
              <option value="all">All Types</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm bg-background border border-border rounded px-2 py-1"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-sm bg-background border border-border rounded px-2 py-1"
            >
              <option value="all">All Priority</option>
              <option value="8">High (8+)</option>
              <option value="5">Medium (5+)</option>
              <option value="1">Low (1+)</option>
            </select>
          </div>
          
          <div className="text-xs text-muted-foreground">
            {rules.length} total • {rules.filter(r => r.active).length} active
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isSelectionMode && selectedRuleIds.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedRuleIds.size} selected
              </span>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={clearSelection}
              >
                Clear
              </Button>
            </>
          )}
          
          {/* Export Menu */}
          <div className="relative" ref={exportMenuRef}>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowExportMenu(!showExportMenu)}
              title="Export/Import options"
            >
              <Download className="h-4 w-4" />
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
            
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-md border bg-popover p-1 shadow-md">
                {!isSelectionMode ? (
                  <>
                    <button
                      onClick={handleExportAll}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      <FileDown className="h-4 w-4" />
                      Export all rules
                    </button>
                    <button
                      onClick={() => {
                        setIsSelectionMode(true);
                        setShowExportMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      <CheckSquare className="h-4 w-4" />
                      Select for export
                    </button>
                    <div className="my-1 h-px bg-border" />
                    <button
                      onClick={() => {
                        fileInputRef.current?.click();
                        setShowExportMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      <Upload className="h-4 w-4" />
                      Import rules
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleExportSelected}
                      disabled={selectedRuleIds.size === 0}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                        selectedRuleIds.size === 0 
                          ? "opacity-50 cursor-not-allowed" 
                          : "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <FileDown className="h-4 w-4" />
                      Export {selectedRuleIds.size} selected
                    </button>
                    <button
                      onClick={() => selectAll()}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      <CheckSquare className="h-4 w-4" />
                      Select all
                    </button>
                    <div className="my-1 h-px bg-border" />
                    <button
                      onClick={() => {
                        setIsSelectionMode(false);
                        setShowExportMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      <X className="h-4 w-4" />
                      Cancel selection
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          
          {onToggleAnalytics && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={onToggleAnalytics}
              className={showAnalytics ? "bg-blue-50 /20/20" : ""}
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Analytics
            </Button>
          )}
          <Button size="sm" onClick={() => onCreateNew?.()}>
            <Plus className="h-4 w-4 mr-1" />
            New Rule
          </Button>
        </div>
      </div>

      {/* Hierarchy */}
      <div className="flex-1 overflow-auto p-4 min-h-0">
        <DragDropHierarchy
          items={rules}
          onReorder={onReorder || (() => {})}
          renderCard={renderRuleCard}
          filterItem={filterRule}
          sortItems={sortRules}
          expandedIds={expandedRules}
          onToggleExpanded={toggleRuleExpanded}
          itemType="RULE"
        />
      </div>
    </div>
  );
}