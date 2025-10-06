import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import type { RuleData } from '@/types/api';
import { cn } from '@/utils/cn';
import { useTheme } from '@felix/theme-system';
import { RuleCardHeader } from './rule-card/RuleCardHeader';
import { RuleCardSummaryRow } from './rule-card/RuleCardSummaryRow';
import { RuleCardEditForm } from './rule-card/RuleCardEditForm';
import { RuleCardExpandedContent } from './rule-card/RuleCardExpandedContent';
import { useRuleCardEditing } from './rule-card/useRuleCardEditing';

interface RuleCardProps {
  rule: RuleData;
  isSelected?: boolean;
  isChecked?: boolean;
  onSelect?: () => void;
  onToggleCheck?: () => void;
  onEdit?: () => void;
  onUpdate?: (ruleId: string, updates: Partial<RuleData>) => void;
  onDelete?: () => void;
  onAddSubRule?: (ruleId: string) => void;
  dragHandleProps?: any;
  className?: string;
}

export function RuleCard({
  rule,
  isSelected = false,
  isChecked = false,
  onSelect,
  onToggleCheck,
  onEdit,
  onUpdate,
  onDelete,
  onAddSubRule,
  dragHandleProps,
  className,
}: RuleCardProps) {
  const { theme } = useTheme();
  const editing = useRuleCardEditing(rule);
  const { isEditing, startEditing, cancelEditing, commitEditing } = editing;
  const [isGuidanceExpanded, setIsGuidanceExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleExportRule = useCallback(async () => {
    try {
      const { felixService } = await import('@/services/felixService');
      const exportData = await felixService.exportRules({
        ruleIds: [rule.id],
        includeInactive: true,
        includeChildren: true,
      });

      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `rule-${rule.id}-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export rule:', error);
    }
    setShowDropdown(false);
  }, [rule.id]);

  const handleEditClick = useCallback(
    (event: ReactMouseEvent) => {
      event.stopPropagation();
      if (onUpdate) {
        startEditing();
      } else if (onEdit) {
        onEdit();
      }
    },
    [onEdit, onUpdate, startEditing],
  );

  const handleSaveEdit = useCallback(() => {
    if (!onUpdate) {
      return;
    }
    const updates = commitEditing();
    onUpdate(rule.id, updates);
  }, [commitEditing, onUpdate, rule.id]);

  const handleCancelEdit = useCallback(() => {
    cancelEditing();
  }, [cancelEditing]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      if (!isEditing) return;
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSaveEdit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        handleCancelEdit();
      }
    },
    [handleSaveEdit, handleCancelEdit, isEditing],
  );

  const handleCopyId = useCallback(() => {
    navigator.clipboard
      .writeText(rule.id)
      .then(() => {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      })
      .catch((error) => {
        console.error('Failed to copy ID:', error);
      });
  }, [rule.id]);

  const expandGuidance = useCallback(() => setIsGuidanceExpanded(true), []);
  const collapseGuidance = useCallback(() => setIsGuidanceExpanded(false), []);

  return (
    <div
      onClick={onSelect}
      className={cn(
        'px-3 py-2 border rounded-lg cursor-pointer transition-all relative group hover:shadow-sm',
        isSelected ? 'border-primary bg-accent/50 shadow-sm' : 'border-border hover:border-primary/50',
        className,
      )}
    >
      <RuleCardHeader
        rule={rule}
        theme={theme}
        isChecked={isChecked}
        onToggleCheck={onToggleCheck}
        dragHandleProps={dragHandleProps}
        editing={editing}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={handleCancelEdit}
        onEditClick={handleEditClick}
        isGuidanceExpanded={isGuidanceExpanded}
        onCollapseGuidance={collapseGuidance}
        onAddSubRule={onAddSubRule}
        showDropdown={showDropdown}
        onDropdownToggle={() => setShowDropdown((prev) => !prev)}
        dropdownRef={dropdownRef}
        onExportRule={handleExportRule}
        onDeleteRule={onDelete}
        copiedId={copiedId}
        onCopyId={handleCopyId}
        onKeyDown={handleKeyDown}
      />

      <RuleCardSummaryRow
        rule={rule}
        theme={theme}
        isGuidanceExpanded={isGuidanceExpanded || isEditing}
        onExpandGuidance={expandGuidance}
      />

      {isEditing && <RuleCardEditForm editing={editing} />}

      <RuleCardExpandedContent
        rule={rule}
        theme={theme}
        editing={editing}
        isGuidanceExpanded={isGuidanceExpanded}
        onCollapseGuidance={collapseGuidance}
      />
    </div>
  );
}
