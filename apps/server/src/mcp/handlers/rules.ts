import { projectManager } from '../project-manager.js';
import { handleRulesList } from './rules.list.js';
import { createJsonContent, createTextContent, type RulesAddRequest, type RulesDeleteRequest, type RulesGetRequest, type RulesListRequest, type RulesToolRequest, type RulesUpdateRequest } from '../types/contracts.js';

export async function handleRulesTools(request: RulesToolRequest) {
  const projectInfo = await projectManager.getProject(request.project);
  if (!projectInfo) throw new Error(`Project not found: ${request.project}`);

  if (request.action === 'list') {
    return await handleRulesList(request as RulesListRequest);
  }

  switch (request.action) {
    case 'add': {
      const { name, description, rule_type, parent_id, guidance_text, code_template, validation_script, trigger_patterns, semantic_triggers, context_conditions, exclusion_patterns, priority, auto_apply, merge_strategy, confidence_threshold, active } = request as RulesAddRequest & Record<string, unknown>;
      if (!name || !rule_type || !guidance_text) throw new Error('Name, rule_type, and guidance_text are required for add action');
      const newRule = await projectInfo.codeIndexer.addRule({ name, description, rule_type, parent_id, guidance_text, code_template, validation_script, trigger_patterns, semantic_triggers, context_conditions, exclusion_patterns, priority: priority || 5, auto_apply: auto_apply || false, merge_strategy: merge_strategy || 'append', confidence_threshold: confidence_threshold || 0.8, active: active !== false } as any);
      return { content: [createTextContent(`Rule added with ID: ${newRule.id}`)] };
    }
    case 'get': {
      const { rule_id } = request as RulesGetRequest;
      if (!rule_id) throw new Error('Rule ID is required for get action');
      const rule = await projectInfo.codeIndexer.getRule(rule_id);
      if (!rule) throw new Error(`Rule not found: ${rule_id}`);
      return { content: [createJsonContent(rule)] };
    }
    case 'update': {
      const { rule_id, ...updates } = request as RulesUpdateRequest & Record<string, unknown>;
      if (!rule_id) throw new Error('Rule ID is required for update action');
      await projectInfo.codeIndexer.updateRule(rule_id, updates);
      return { content: [createTextContent(`Rule ${rule_id} updated successfully`)] };
    }
    case 'delete': {
      const { rule_id } = request as RulesDeleteRequest;
      if (!rule_id) throw new Error('Rule ID is required for delete action');
      await projectInfo.codeIndexer.deleteRule(rule_id);
      return { content: [createTextContent(`Rule ${rule_id} deleted successfully`)] };
    }
    default:
      throw new Error(`Unknown rules action: ${(request as { action: string }).action}`);
  }
}
