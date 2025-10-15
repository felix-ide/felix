import type { INote, CreateNoteParams, CreateRuleParams } from '@felix/code-intelligence';
import { RuleUtils } from '@felix/code-intelligence';
import { NotesRepository } from '../storage/repositories/NotesRepository.js';
import { RulesRepository } from '../storage/repositories/RulesRepository.js';
import { KBStructureDefinition, KBNodeDefinition } from './types.js';
import { PROJECT_KB_STRUCTURE } from './templates/project-kb-structure.js';
import { processTemplate } from './templateProcessor.js';
import { DataSource } from 'typeorm';
import { KnowledgeBase } from '../storage/entities/metadata/KnowledgeBase.entity.js';

const SYSTEM_KB_VERSION = '1.0.0';

export class KBBuilder {
  private dataSource: DataSource;

  constructor(
    private notesRepo: NotesRepository,
    private rulesRepo: RulesRepository,
    dataSource?: DataSource
  ) {
    // Get DataSource from repository if not provided
    this.dataSource = dataSource || (this.notesRepo as any).dataSource;
    if (!this.dataSource) {
      throw new Error('KBBuilder requires a DataSource');
    }
  }

  /**
   * Build a complete KB structure from a template
   * Uses stable IDs and prevents duplicates
   */
  async buildFromTemplate(
    projectPath: string,
    templateName: string,
    parentId?: string,
    customName?: string,
    kbConfig?: Record<string, any>
  ): Promise<{ kbId: string; rootId: string; createdNodes: number }> {
    const template = this.getTemplate(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    const kbRepo = this.dataSource.getRepository(KnowledgeBase);

    // For "project" template: check if it already exists (only 1 allowed per project)
    if (templateName === 'project') {
      const existingProjectKB = await kbRepo.findOne({
        where: {
          project_path: projectPath,
          template_name: 'project'
        }
      });

      if (existingProjectKB) {
        console.log(`[KBBuilder] Project KB already exists for ${projectPath}, returning existing`);
        return {
          kbId: existingProjectKB.id,
          rootId: existingProjectKB.root_note_id,
          createdNodes: 0
        };
      }
    }

    // Generate unique IDs for this KB
    const kbId = this.generateKBId(projectPath, templateName);
    const rootNoteId = this.generateRootNoteId(projectPath, templateName);

    // Override root title if custom name provided
    const rootDefinition = customName
      ? { ...template.root, title: customName }
      : template.root;

    const rootNode = await this.createNode(
      projectPath,
      rootDefinition,
      parentId,
      {
        kb_type: templateName,
        template_name: templateName,
        template_version: template.version,
        is_kb_root: true,
        kb_config: kbConfig || {}
      },
      kbConfig,
      rootNoteId // Pass stable ID for root
    );

    // Create KB entity
    await kbRepo.save({
      id: kbId,
      project_path: projectPath,
      template_name: templateName,
      root_note_id: rootNode.id,
      is_system: true, // System template
      system_version: SYSTEM_KB_VERSION,
      config: kbConfig || {},
      description: template.description
    });

    const createdNodes = await this.countNodes(rootNode);

    return {
      kbId,
      rootId: rootNode.id,
      createdNodes
    };
  }

  /**
   * Generate KB ID
   * - "project" template gets stable ID (1 per shared project database)
   * - Other templates get unique IDs (can have many of same type)
   * NOTE: IDs are portable (no project path) for Postgres sharing across machines
   */
  private generateKBId(projectPath: string, templateName: string): string {
    if (templateName === 'project') {
      // Special case: project KB is unique (1 per project in shared DB)
      return 'kb_project';
    } else {
      // User-created KBs: unique IDs allow multiple of same type
      return `kb_${templateName}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
  }

  /**
   * Generate root note ID
   * - "project" template gets stable ID
   * - Other templates get unique IDs
   * NOTE: IDs are portable (no project path) for Postgres sharing across machines
   */
  private generateRootNoteId(projectPath: string, templateName: string): string {
    if (templateName === 'project') {
      // Special case: project KB root note is unique
      return 'note_kb_project';
    } else {
      // User-created KB roots: unique IDs
      return `note_kb_${templateName}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
  }

  /**
   * Recursively create a node and all its children
   */
  private async createNode(
    projectPath: string,
    nodeDefinition: KBNodeDefinition,
    parentId?: string,
    additionalMetadata?: Record<string, any>,
    kbConfig?: Record<string, any>,
    stableId?: string
  ): Promise<INote> {
    // Create the note with KB metadata
    const noteParams: CreateNoteParams = {
      title: nodeDefinition.title,
      content: nodeDefinition.content || nodeDefinition.contentTemplate || '',
      parent_id: parentId,
      note_type: 'documentation',
      metadata: {
        ...nodeDefinition.metadata,
        ...additionalMetadata,
        kb_node: true,
        kb_description: nodeDefinition.description,
        project_path: projectPath
      },
      stable_tags: nodeDefinition.tags || []
    } as CreateNoteParams;

    // Use stable ID for root node
    if (stableId) {
      (noteParams as any).id = stableId;
    }

    const result = await this.notesRepo.createNote(noteParams);

    if (!result.success || !result.data) {
      throw new Error(`Failed to create KB node: ${result.error}`);
    }

    const note = result.data;

    // Create attached rules if defined
    if (nodeDefinition.rules && nodeDefinition.rules.length > 0) {
      console.log(`[KBBuilder] Creating ${nodeDefinition.rules.length} rules for node: ${note.title}`);
      for (const ruleDef of nodeDefinition.rules) {
        console.log(`[KBBuilder]   - Rule: ${ruleDef.name}`);
        await this.createRuleForNode(note.id, ruleDef, kbConfig);
      }
    }

    // Recursively create children
    if (nodeDefinition.children && nodeDefinition.children.length > 0) {
      for (const childDef of nodeDefinition.children) {
        await this.createNode(projectPath, childDef, note.id, {
          kb_type: additionalMetadata?.kb_type,
          template_name: additionalMetadata?.template_name,
          template_version: additionalMetadata?.template_version
        }, kbConfig);
      }
    }

    return note;
  }

  /**
   * Get a KB structure tree
   */
  async getKBTree(projectPath: string, kbId: string): Promise<any> {
    const note = await this.notesRepo.getNote(kbId);
    if (!note) {
      throw new Error(`KB node not found: ${kbId}`);
    }

    return this.buildTreeNode(projectPath, note);
  }

  /**
   * Recursively build a tree representation
   */
  private async buildTreeNode(projectPath: string, note: INote): Promise<any> {
    // Get child IDs first
    const childIds = await this.notesRepo.getNoteChildren(note.id);

    // Then fetch full child notes
    const children: INote[] = [];
    for (const childId of childIds) {
      const childNote = await this.notesRepo.getNote(childId);
      if (childNote) {
        children.push(childNote);
      }
    }

    return {
      id: note.id,
      title: note.title,
      content: note.content,
      metadata: note.metadata,
      children: await Promise.all(
        children.map(child => this.buildTreeNode(projectPath, child))
      )
    };
  }

  /**
   * Create a rule attached to a KB node
   */
  private async createRuleForNode(noteId: string, ruleDef: any, kbConfig?: Record<string, any>): Promise<void> {
    console.log(`[KBBuilder] createRuleForNode called for: ${ruleDef.name}`);

    // Process guidance template if provided and config exists
    let guidanceText = ruleDef.guidance_text;
    if (ruleDef.guidance_template && kbConfig) {
      try {
        guidanceText = processTemplate(ruleDef.guidance_template, kbConfig);
        console.log(`[KBBuilder]   Processed template, result: ${guidanceText.substring(0, 50)}...`);
      } catch (error) {
        console.warn(`Failed to process guidance template for rule ${ruleDef.name}:`, error);
      }
    }

    const tags = ['kb-template'];
    // Add template_rule_key as a tag for easy identification
    if (ruleDef.template_rule_key) {
      tags.push(`template-rule:${ruleDef.template_rule_key}`);
    }

    const ruleParams: CreateRuleParams = {
      name: ruleDef.name,
      description: ruleDef.description,
      guidance_text: guidanceText,
      rule_type: ruleDef.rule_type || 'pattern',
      trigger_patterns: ruleDef.trigger_patterns,
      priority: ruleDef.priority || 5,
      auto_apply: ruleDef.auto_apply || false,
      entity_links: [
        {
          entity_type: 'note',
          entity_id: noteId,
          link_strength: 'primary'
        }
      ],
      stable_tags: tags
    };

    console.log(`[KBBuilder]   Rule params:`, JSON.stringify(ruleParams, null, 2));

    // Create full IRule object using RuleUtils
    const rule = RuleUtils.createFromParams(ruleParams);
    console.log(`[KBBuilder]   Created IRule with id: ${rule.id}`);

    // Store the rule
    const result = await this.rulesRepo.storeRule(rule);
    console.log(`[KBBuilder]   Store result:`, result);
    if (!result.success) {
      console.error(`[KBBuilder] ❌ FAILED to create rule for KB node ${noteId}: ${result.error}`);
    } else {
      console.log(`[KBBuilder] ✅ Successfully created rule: ${ruleDef.name}`);
    }
  }

  /**
   * Count all nodes in a tree
   */
  private async countNodes(note: INote): Promise<number> {
    const childIds = await this.notesRepo.getNoteChildren(note.id);
    let count = 1; // Count this node

    for (const childId of childIds) {
      const childNote = await this.notesRepo.getNote(childId);
      if (childNote) {
        count += await this.countNodes(childNote);
      }
    }

    return count;
  }

  /**
   * Get a template by name
   */
  private getTemplate(templateName: string): KBStructureDefinition | null {
    switch (templateName) {
      case 'project':
        return PROJECT_KB_STRUCTURE;
      default:
        return null;
    }
  }

  /**
   * Update template rules with new config
   * Finds all rules tagged with template-rule:* and updates their guidance_text
   */
  async updateTemplateRules(
    projectPath: string,
    templateName: string,
    config: Record<string, any>
  ): Promise<number> {
    const template = this.getTemplate(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Build a map of template rule definitions keyed by template_rule_key
    const ruleDefinitions = new Map<string, any>();
    const collectRules = (nodeDef: KBNodeDefinition) => {
      if (nodeDef.rules) {
        for (const ruleDef of nodeDef.rules) {
          if (ruleDef.template_rule_key) {
            ruleDefinitions.set(ruleDef.template_rule_key, ruleDef);
          }
        }
      }
      if (nodeDef.children) {
        for (const childDef of nodeDef.children) {
          collectRules(childDef);
        }
      }
    };
    collectRules(template.root);

    // Find all rules with template-rule: tags
    const allRules = await this.rulesRepo.getAllRules();
    let updatedCount = 0;

    for (const rule of allRules) {
      // Check if this rule has any template-rule: tags
      const templateRuleTag = rule.stable_tags?.find(tag => tag.startsWith('template-rule:'));
      if (!templateRuleTag) continue;

      // Extract the template_rule_key from the tag
      const templateRuleKey = templateRuleTag.replace('template-rule:', '');
      const ruleDef = ruleDefinitions.get(templateRuleKey);

      if (!ruleDef || !ruleDef.guidance_template) {
        // Skip if no matching rule definition or no template
        continue;
      }

      // Process the template with the new config
      try {
        const newGuidanceText = processTemplate(ruleDef.guidance_template, config);

        // Update the rule
        const updateResult = await this.rulesRepo.updateRule(rule.id, {
          guidance_text: newGuidanceText
        });

        if (updateResult.success) {
          updatedCount++;
        } else {
          console.warn(`Failed to update rule ${rule.id}: ${updateResult.error}`);
        }
      } catch (error) {
        console.warn(`Failed to process template for rule ${rule.id}:`, error);
      }
    }

    return updatedCount;
  }
}