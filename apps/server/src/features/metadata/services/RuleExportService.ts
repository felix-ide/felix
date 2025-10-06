/**
 * Rule Export/Import Service
 * Handles exporting and importing rules with hierarchy
 */

import { IRule } from '@felix/code-intelligence';
import { CodeIndexer } from '../../indexing/api/CodeIndexer.js';
import { promises as fs } from 'fs';

export interface RuleExportData {
  version: string;
  exportDate: string;
  projectName?: string;
  rules: IRule[];
}

export interface RuleExportOptions {
  includeChildren?: boolean;
  includeInactive?: boolean;
  ruleIds?: string[];
  rootRuleId?: string;
  ruleTypes?: string[];
}

export interface RuleImportOptions {
  preserveIds?: boolean;
  parentRuleId?: string;
  skipExisting?: boolean;
  mergeStrategy?: 'overwrite' | 'skip' | 'duplicate';
  activateOnImport?: boolean;
}

export class RuleExportService {
  constructor(private codeIndexer: CodeIndexer) {}

  /**
   * Export rules
   */
  async exportRules(options: RuleExportOptions = {}): Promise<RuleExportData> {
    const {
      includeChildren = true,
      includeInactive = false,
      ruleIds,
      rootRuleId,
      ruleTypes
    } = options;

    let rules: IRule[] = [];
    const ruleIdSet = new Set<string>();

    if (ruleIds && ruleIds.length > 0) {
      // Export specific rules
      for (const ruleId of ruleIds) {
        const rule = await this.codeIndexer.getRule(ruleId);
        if (rule && (includeInactive || rule.active)) {
          rules.push(rule);
          ruleIdSet.add(rule.id);
        }
      }
    } else if (rootRuleId) {
      // Export rule tree from root
      const ruleTree = await this.codeIndexer.getRuleTree(rootRuleId, includeInactive);
      rules = this.flattenRuleTree(ruleTree);
      rules.forEach(r => ruleIdSet.add(r.id));
    } else {
      // Export all rules
      const allRules = await this.codeIndexer.listRules(includeInactive);
      
      // Filter by type if specified
      if (ruleTypes && ruleTypes.length > 0) {
        rules = allRules.filter((r: IRule) => ruleTypes.includes(r.rule_type));
      } else {
        rules = allRules;
      }
      
      rules.forEach(r => ruleIdSet.add(r.id));
    }

    // Get children if requested
    if (includeChildren && (ruleIds || rootRuleId)) {
      const children = await this.getChildRules(rules, includeInactive);
      children.forEach(r => {
        if (!ruleIdSet.has(r.id)) {
          rules.push(r);
          ruleIdSet.add(r.id);
        }
      });
    }

    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      projectName: (this.codeIndexer as any).options?.sourceDirectory,
      rules
    };
  }

  /**
   * Export rules to file
   */
  async exportToFile(filePath: string, options: RuleExportOptions = {}): Promise<void> {
    const exportData = await this.exportRules(options);
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8');
  }

  /**
   * Import rules from export data
   */
  async importRules(data: RuleExportData, options: RuleImportOptions = {}): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const {
      preserveIds = false,
      parentRuleId,
      skipExisting = true,
      mergeStrategy = 'skip',
      activateOnImport = true
    } = options;

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    const idMapping = new Map<string, string>(); // old ID -> new ID

    // Sort rules by depth to ensure parents are imported before children
    const sortedRules = [...data.rules].sort((a, b) => a.depth_level - b.depth_level);

    // Import rules
    for (const rule of sortedRules) {
      try {
        const oldId = rule.id;
        let newRule = { ...rule };

        // Handle ID preservation/generation
        if (!preserveIds) {
          delete (newRule as any).id;
        }

        // Update parent ID if needed
        if (newRule.parent_id) {
          if (idMapping.has(newRule.parent_id)) {
            newRule.parent_id = idMapping.get(newRule.parent_id);
          } else if (!preserveIds) {
            // Parent hasn't been imported yet or doesn't exist
            newRule.parent_id = parentRuleId || undefined;
          }
        } else if (parentRuleId) {
          newRule.parent_id = parentRuleId;
        }

        // Check if rule exists (by name and parent)
        if (skipExisting || mergeStrategy === 'skip') {
          const existing = await this.findExistingRule(newRule.name, newRule.parent_id || undefined);
          if (existing) {
            if (mergeStrategy === 'skip') {
              idMapping.set(oldId, existing.id);
              skipped++;
              continue;
            } else if (mergeStrategy === 'overwrite') {
              // Update existing rule
              await this.codeIndexer.updateRule(existing.id, {
                description: newRule.description,
                rule_type: newRule.rule_type,
                guidance_text: newRule.guidance_text,
                priority: newRule.priority,
                auto_apply: newRule.auto_apply,
                active: activateOnImport ? true : newRule.active
              });
              idMapping.set(oldId, existing.id);
              imported++;
              continue;
            }
          }
        }

        // Create the rule
        const createdRule = await this.codeIndexer.addRule({
          name: newRule.name,
          description: newRule.description,
          parent_id: newRule.parent_id,
          rule_type: newRule.rule_type,
          guidance_text: newRule.guidance_text,
          priority: newRule.priority,
          auto_apply: newRule.auto_apply,
          active: activateOnImport ? true : newRule.active
        });

        idMapping.set(oldId, createdRule.id);
        imported++;

      } catch (error) {
        errors.push(`Failed to import rule "${rule.name}": ${(error as Error).message}`);
      }
    }

    return { imported, skipped, errors };
  }

  /**
   * Import rules from file
   */
  async importFromFile(filePath: string, options: RuleImportOptions = {}): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content) as RuleExportData;
    return this.importRules(data, options);
  }

  /**
   * Helper: Flatten rule tree
   */
  private flattenRuleTree(rules: IRule[]): IRule[] {
    const result: IRule[] = [];
    const processRule = (rule: IRule) => {
      result.push(rule);
      // If rule has children in a children property (from tree structure)
      if ((rule as any).children) {
        for (const child of (rule as any).children) {
          processRule(child);
        }
      }
    };
    rules.forEach(processRule);
    return result;
  }

  /**
   * Helper: Get all child rules
   */
  private async getChildRules(parentRules: IRule[], includeInactive: boolean): Promise<IRule[]> {
    const children: IRule[] = [];
    const processed = new Set<string>();

    for (const rule of parentRules) {
      if (!processed.has(rule.id)) {
        const ruleChildren = await this.codeIndexer.getRuleTree(rule.id, includeInactive);
        const flattened = this.flattenRuleTree(ruleChildren);
        flattened.forEach(r => {
          if (r.id !== rule.id && !processed.has(r.id)) {
            children.push(r);
            processed.add(r.id);
          }
        });
      }
    }

    return children;
  }

  /**
   * Helper: Find existing rule by name and parent
   */
  private async findExistingRule(name: string, parentId?: string): Promise<IRule | null> {
    const rules = await this.codeIndexer.listRules(true);
    return rules.find((r: IRule) => r.name === name && r.parent_id === parentId) || null;
  }
}