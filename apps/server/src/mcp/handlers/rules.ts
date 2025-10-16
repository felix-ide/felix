import { projectManager } from '../project-manager.js';
import { handleRulesList } from './rules.list.js';
import { createJsonContent, createTextContent, type RulesAddRequest, type RulesDeleteRequest, type RulesGetRequest, type RulesListRequest, type RulesToolRequest, type RulesUpdateRequest } from '../types/contracts.js';

export async function handleRulesTools(request: RulesToolRequest) {
  const projectInfo = await projectManager.getProject(request.project);
  if (!projectInfo) throw new Error(`Project not found: ${request.project}`);

  // Extract tool name from new format or fallback to action
  const toolName = (request as any)._toolName || 'rules';

  // Map new tool names to actions for compatibility
  let action = request.action;
  if (toolName === 'rules_write') {
    action = (request as any).mode === 'create' ? 'add' : 'update';
  } else if (toolName === 'rules_get') {
    action = 'get';
  } else if (toolName === 'rules_list') {
    action = 'list';
  } else if (toolName === 'rules_delete') {
    action = 'delete';
  } else if (toolName === 'rules_get_applicable') {
    action = 'get_applicable';
  } else if (toolName === 'rules_apply') {
    action = 'apply_rule';
    // Map rule_id to apply_rule_id for apply action
    if ((request as any).rule_id) {
      (request as any).apply_rule_id = (request as any).rule_id;
    }
  } else if (toolName === 'rules_tree') {
    action = 'get_tree';
  } else if (toolName === 'rules_analytics') {
    action = 'get_analytics';
  } else if (toolName === 'rules_track') {
    action = 'track_application';
    // Map entity_type/entity_id to track_entity_type/track_entity_id for track action
    if ((request as any).entity_type) {
      (request as any).track_entity_type = (request as any).entity_type;
    }
    if ((request as any).entity_id) {
      (request as any).track_entity_id = (request as any).entity_id;
    }
  }

  if (action === 'list') {
    return await handleRulesList(request as RulesListRequest);
  }

  switch (action) {
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
      const { rule_id, ...updateFields } = request as RulesUpdateRequest & Record<string, unknown>;
      if (!rule_id) throw new Error('Rule ID is required for update action');

      // Whitelist updatable rule fields to filter out request-level fields like 'project' and 'action'
      const updates: any = {};
      ['name','description','guidance_text','code_template','validation_script','trigger_patterns','semantic_triggers','context_conditions','priority','auto_apply','merge_strategy','confidence_threshold','active','parent_id','sort_order','stable_tags','entity_links'].forEach(k => {
        if (updateFields[k] !== undefined) updates[k] = updateFields[k];
      });

      await projectInfo.codeIndexer.updateRule(rule_id, updates);
      return { content: [createTextContent(`Rule ${rule_id} updated successfully`)] };
    }
    case 'delete': {
      const { rule_id } = request as RulesDeleteRequest;
      if (!rule_id) throw new Error('Rule ID is required for delete action');
      await projectInfo.codeIndexer.deleteRule(rule_id);
      return { content: [createTextContent(`Rule ${rule_id} deleted successfully`)] };
    }
    case 'get_applicable': {
      const { entity_type, entity_id, context, include_suggestions = true, include_automation = true } = request as any;
      if (!entity_type || !entity_id) throw new Error('Entity type and ID are required for get_applicable action');
      // TODO: Implement getApplicableRules in CodeIndexer
      return { content: [createTextContent('get_applicable action not yet implemented')] };
    }
    case 'apply_rule': {
      const { apply_rule_id, target_entity, application_context } = request as any;
      if (!apply_rule_id || !target_entity) throw new Error('Rule ID and target entity are required for apply_rule action');
      // TODO: Implement applyRule in CodeIndexer
      return { content: [createTextContent('apply_rule action not yet implemented')] };
    }
    case 'get_tree': {
      const { root_rule_id, include_inactive = false } = request as any;
      // TODO: Implement getRuleTree in CodeIndexer
      return { content: [createTextContent('get_tree action not yet implemented')] };
    }
    case 'get_analytics': {
      const { days_since = 30 } = request as any;
      // TODO: Implement getRuleAnalytics in CodeIndexer
      return { content: [createTextContent('get_analytics action not yet implemented')] };
    }
    case 'track_application': {
      const { rule_id, track_entity_type, track_entity_id, applied_context, user_action, generated_code, feedback_score } = request as any;
      if (!rule_id) throw new Error('Rule ID is required for track_application action');
      // TODO: Implement trackRuleApplication in CodeIndexer
      return { content: [createTextContent('track_application action not yet implemented')] };
    }
    default:
      throw new Error(`Unknown rules action: ${action}`);
  }
}
