/**
 * System Entity Migration
 * Migrates existing workflows and knowledge bases to use stable IDs and system flags
 */

import { DataSource } from 'typeorm';
import { WorkflowConfiguration } from '../../features/storage/entities/metadata/WorkflowConfiguration.entity.js';
import { Note } from '../../features/storage/entities/metadata/Note.entity.js';
import { KnowledgeBase } from '../../features/storage/entities/metadata/KnowledgeBase.entity.js';
import { BUILT_IN_WORKFLOWS } from '../../validation/WorkflowDefinitions.js';

const SYSTEM_WORKFLOW_VERSION = '1.1.0';
const SYSTEM_KB_VERSION = '1.0.0';

export class SystemEntityMigration {
  constructor(private dataSource: DataSource) {}

  /**
   * Run all migrations
   */
  async run(): Promise<void> {
    console.log('[Migration] Starting system entity migration...');

    await this.migrateWorkflows();
    await this.migrateKnowledgeBases();

    console.log('[Migration] ✅ System entity migration complete');
  }

  /**
   * Migrate workflows to stable IDs and system flags
   */
  private async migrateWorkflows(): Promise<void> {
    const workflowRepo = this.dataSource.getRepository(WorkflowConfiguration);
    const builtInNames = BUILT_IN_WORKFLOWS.map(w => w.name);

    console.log('[Migration] Migrating workflows...');

    // Get all workflows
    const allWorkflows = await workflowRepo.find();

    for (const workflow of allWorkflows) {
      const isBuiltIn = builtInNames.includes(workflow.name);

      // Check if migration is needed
      const needsMigration =
        workflow.is_system === undefined ||
        workflow.is_system === null ||
        (isBuiltIn && workflow.id !== `workflow_${workflow.name}`);

      if (!needsMigration) {
        continue; // Already migrated
      }

      if (isBuiltIn) {
        // Built-in workflow: update ID and set is_system=true
        const newId = `workflow_${workflow.name}`;

        // Check if the new ID already exists
        const existingWithNewId = await workflowRepo.findOne({ where: { id: newId } });

        if (existingWithNewId) {
          // New ID exists, delete the old one
          console.log(`  - Removing duplicate workflow: ${workflow.id}`);
          await workflowRepo.delete({ id: workflow.id });
        } else {
          // Update to stable ID
          console.log(`  - Migrating built-in workflow: ${workflow.name} (${workflow.id} → ${newId})`);

          // Delete old record and insert new one with correct ID
          await workflowRepo.delete({ id: workflow.id });
          await workflowRepo.insert({
            ...workflow,
            id: newId,
            is_system: true,
            system_version: SYSTEM_WORKFLOW_VERSION
          });
        }
      } else {
        // User workflow: just set is_system=false
        console.log(`  - Marking custom workflow: ${workflow.name}`);
        await workflowRepo.update(
          { id: workflow.id },
          {
            is_system: false,
            system_version: undefined
          }
        );
      }
    }

    console.log('[Migration] ✅ Workflows migrated');
  }

  /**
   * Migrate knowledge bases to use KnowledgeBase entity
   */
  private async migrateKnowledgeBases(): Promise<void> {
    const noteRepo = this.dataSource.getRepository(Note);
    const kbRepo = this.dataSource.getRepository(KnowledgeBase);

    console.log('[Migration] Migrating knowledge bases...');

    // Find all notes that are KB roots
    const kbRootNotes = await noteRepo
      .createQueryBuilder('note')
      .where('json_extract(note.metadata, "$.is_kb_root") = 1')
      .getMany();

    for (const rootNote of kbRootNotes) {
      const metadata = rootNote.metadata as any;
      const templateName = metadata?.template_name || metadata?.kb_type || 'project';
      const projectPath = metadata?.project_path || 'unknown';

      const kbId = this.generateKBId(projectPath, templateName);

      // Check if KB entity already exists
      const existingKB = await kbRepo.findOne({ where: { id: kbId } });

      if (existingKB) {
        console.log(`  - KB already exists: ${kbId}`);
        continue;
      }

      // Create KB entity
      console.log(`  - Creating KB entity: ${kbId} (project: ${projectPath}, template: ${templateName})`);

      await kbRepo.save({
        id: kbId,
        project_path: projectPath,
        template_name: templateName,
        root_note_id: rootNote.id,
        is_system: true, // System template
        system_version: SYSTEM_KB_VERSION,
        config: metadata?.kb_config || {},
        description: metadata?.kb_description || ''
      });

      // Update root note ID to stable format ONLY for "project" template
      if (templateName === 'project') {
        const newNoteId = 'note_kb_project'; // Portable ID (no project path)
        if (rootNote.id !== newNoteId) {
          console.log(`  - Updating project KB root note ID: ${rootNote.id} → ${newNoteId}`);

          // Check if new ID already exists
          const existingNote = await noteRepo.findOne({ where: { id: newNoteId } });

          if (existingNote) {
            // New ID exists, just update the KB to point to existing note
            await kbRepo.update({ id: kbId }, { root_note_id: newNoteId });
            await noteRepo.delete({ id: rootNote.id });
          } else {
            // Update note ID
            await noteRepo.delete({ id: rootNote.id });
            await noteRepo.insert({
              ...rootNote,
              id: newNoteId
            });

            // Update KB to point to new note ID
            await kbRepo.update({ id: kbId }, { root_note_id: newNoteId });
          }
        }
      }
      // Other KB types keep their existing note IDs (they're already unique)
    }

    console.log('[Migration] ✅ Knowledge bases migrated');
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
      // Other KB types: generate unique ID (they already exist with unique note IDs)
      return `kb_${templateName}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
  }

  /**
   * Check if migration has already been run
   */
  async needsMigration(): Promise<boolean> {
    const workflowRepo = this.dataSource.getRepository(WorkflowConfiguration);

    // Check if any workflows are missing is_system field
    const workflowsNeedingMigration = await workflowRepo
      .createQueryBuilder('workflow')
      .where('workflow.is_system IS NULL')
      .getCount();

    return workflowsNeedingMigration > 0;
  }
}
