/**
 * Rules API Routes - Copied from web-ui/server.js
 */

import express from 'express';
import { getProjectIndexer, getCurrentProject } from './projectContext.js';
import { logger } from '../../shared/logger.js';
import { resolveProject, requireProjectIndexer, type ProjectRequest } from '../middleware/projectMiddleware.js';

const router = express.Router();

// Apply project resolution middleware to all routes
router.use(resolveProject);

router.get('/rules', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;

    const {
      entity_type,
      entity_id,
      include_suggestions = true,
      include_automation = true,
      rule_type,
      priority_min,
      limit
    } = req.query;

    if (entity_type && entity_id) {
      const applicableRules = await indexer.getApplicableRules({
        entity_type,
        entity_id,
        current_task: req.query.current_task,
        user_intent: req.query.user_intent,
        file_content: req.query.file_content
      });

      res.json(applicableRules);
    } else {
      let allRules = await indexer.listRules(include_automation !== 'false');

      // Apply filters
      if (rule_type) {
        allRules = allRules.filter((r: any) => r.rule_type === rule_type);
      }

      if (priority_min) {
        const minPriority = parseInt(priority_min as string);
        allRules = allRules.filter((r: any) => (r.priority || 0) >= minPriority);
      }

      if (limit) {
        const limitNum = parseInt(limit as string);
        allRules = allRules.slice(0, limitNum);
      }

      res.json({ rules: allRules });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/rules', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;

    const { 
      name: ruleName, 
      description, 
      rule_type, 
      parent_id,
      guidance_text,
      validation_script,
      code_template,
      priority = 5,
      auto_apply = false,
      active = true,  // Default to active
      confidence_threshold = 0.8,
      entity_links,
      stable_tags,
      trigger_patterns,
      semantic_triggers,
      context_conditions
    } = req.body;
    
    logger.debug('Creating rule', {
      body: req.body,
      entity_links,
      stable_tags
    });
    
    // Auto-generate guidance_text if not provided
    const finalGuidanceText = guidance_text || description || `${rule_type} rule: ${ruleName}`;
    
    if (!ruleName || !rule_type) {
      return res.status(400).json({ error: 'Rule name and type are required' });
    }

    
    const rule = await indexer.addRule({
      name: ruleName,
      description,
      rule_type,
      parent_id,
      guidance_text: finalGuidanceText,
      validation_script,
      code_template,
      priority,
      auto_apply,
      active,
      confidence_threshold,
      entity_links,
      stable_tags,
      trigger_patterns,
      semantic_triggers,
      context_conditions
    });

    res.json({ rule });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/rules/tree', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;

    const { root_rule_id, include_inactive = false } = req.query;
    
    const ruleTree = await indexer.getRuleTree(root_rule_id, include_inactive === 'true');
    
    res.json({ rule_tree: ruleTree });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/rules/details', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;

    const { ids, include_inactive = true } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const rules = await indexer.getRulesByIds(ids, include_inactive !== false);
    res.json({ rules });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/rules/analytics', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;

    const { rule_ids, start_date, end_date } = req.query;
    
    // Just use the indexer method
    const analytics = await indexer.getRuleAnalytics({
      rule_ids: rule_ids ? (rule_ids as string).split(',') : undefined,
      start_date: start_date as string,
      end_date: end_date as string
    });
    
    res.json({ analytics });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/rules/:id', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;

    const { id: rule_id } = req.params;
    
    if (!rule_id) {
      return res.status(400).json({ error: 'Rule ID is required' });
    }
    
    const rule = await indexer.getRule(rule_id);
    
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    
    res.json({ rule });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.put('/rules/:id', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;

    const { id: rule_id } = req.params;
    const { 
      name, 
      description, 
      rule_type, 
      parent_id,
      guidance_text, 
      priority, 
      auto_apply,
      active,
      entity_links,
      stable_tags,
      trigger_patterns,
      semantic_triggers,
      context_conditions,
      code_template,
      validation_script,
      confidence_threshold
    } = req.body;
    
    if (!rule_id) {
      return res.status(400).json({ error: 'Rule ID is required' });
    }
    
    
    await indexer.updateRule(rule_id, {
      name,
      description,
      rule_type,
      parent_id,
      guidance_text,
      priority,
      auto_apply,
      active,
      entity_links,
      stable_tags,
      trigger_patterns,
      semantic_triggers,
      context_conditions,
      code_template,
      validation_script,
      confidence_threshold
    });
    
    const updatedRule = await indexer.getRule(rule_id);
    
    res.json({ rule: updatedRule });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.delete('/rules/:id', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;

    const { id: rule_id } = req.params;
    
    if (!rule_id) {
      return res.status(400).json({ error: 'Rule ID is required' });
    }
    
    
    await indexer.deleteRule(rule_id);
    
    res.json({ success: true, message: 'Rule deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Export/Import endpoints
router.post('/rules/export', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;

    const exportData = await indexer.exportRules(req.body);
    
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/rules/import', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;

    const { data, options } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Import data is required' });
    }

    const result = await indexer.importRules(data, options);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Track rule application - support both patterns
router.post('/rules/:id/applications', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;

    const rule_id = req.params.id;
    const { userAction, entity_type, entity_id, generatedCode, feedbackScore } = req.body;
    
    if (!rule_id) {
      return res.status(400).json({ error: 'rule_id is required' });
    }

    // Record the rule application using TypeORM
    const applicationId = `rule_app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      await indexer.trackRuleApplication(rule_id, {
        entity_type: entity_type || 'component',
        entity_id: entity_id || '',
        applied_context: { project: req.projectPath || '' },
        user_action: userAction || 'applied',
        generated_code: generatedCode || '',
        feedback_score: feedbackScore || undefined
      });
      
      res.json({ success: true, application_id: applicationId });
    } catch (trackError) {
      logger.error('Failed to track rule application:', trackError);
      res.status(500).json({ error: `Failed to track rule application: ${(trackError as Error).message}` });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Track rule application for analytics (legacy route)
// Get applicable rules endpoint
router.get('/rules/applicable', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;

    const { entity_type, entity_id, user_intent, context } = req.query;
    
    const applicableRules = await indexer.getApplicableRules({
      entityType: entity_type as string,
      entityId: entity_id as string,
      userIntent: user_intent as string,
      context: context ? JSON.parse(context as string) : {}
    });
    
    res.json({ rules: applicableRules });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Apply rule endpoint
router.post('/rules/:id/apply', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;

    const { id: rule_id } = req.params;
    const { entity_type, entity_id, context } = req.body;
    
    const result = await indexer.applyRule(rule_id, {
      entityType: entity_type,
      entityId: entity_id,
      context: context || {}
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/rules/track', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;

    // Support both snake_case and camelCase from various clients
    const rule_id = req.body.rule_id || req.body.ruleId;
    const userAction = req.body.userAction || req.body.user_action;
    const entityType = req.body.entityType || req.body.entity_type || 'component';
    const entityId = req.body.entityId || req.body.entity_id || '';
    const generatedCode = req.body.generatedCode || req.body.generated_code || '';
    const feedbackScore = req.body.feedbackScore ?? req.body.feedback_score;
    const applied_at = req.body.applied_at || req.body.appliedAt;

    if (!rule_id) {
      return res.status(400).json({ error: 'rule_id is required' });
    }

    // Record the rule application using TypeORM
    const applicationId = `rule_app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      await indexer.trackRuleApplication(rule_id, {
        entity_type: entityType,
        entity_id: entityId,
        applied_context: { project: req.projectPath || '', applied_at },
        user_action: userAction || 'applied',
        generated_code: generatedCode || '',
        feedback_score: feedbackScore || undefined
      });
      
      res.json({ success: true, application_id: applicationId });
    } catch (trackError) {
      logger.error('Failed to track rule application:', trackError);
      logger.error('Full error details:', JSON.stringify(trackError, null, 2));
      logger.error('Stack trace:', (trackError as Error).stack);
      res.status(500).json({ error: `Failed to track rule application: ${(trackError as Error).message}` });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});


export default router;
