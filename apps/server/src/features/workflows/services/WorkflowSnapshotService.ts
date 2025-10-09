import { promises as fs } from 'fs';
import path from 'path';
import type { WorkflowDefinition, WorkflowConfig } from '../../../types/WorkflowTypes.js';
import { WorkflowConfigManager } from '../../../storage/WorkflowConfigManager.js';
import { DatabaseManager } from '../../storage/DatabaseManager.js';

export interface WorkflowSnapshotExportResult {
  filePath: string;
  workflowCount: number;
  exportedAt: string;
}

export interface WorkflowSnapshotImportResult {
  filePath: string;
  workflowCount: number;
  created: number;
  updated: number;
  appliedConfig?: WorkflowConfig;
}

export interface WorkflowSnapshot {
  version: number;
  exported_at: string;
  workflows: WorkflowDefinition[];
  config?: WorkflowConfig;
}

const DEFAULT_SNAPSHOT_RELATIVE_PATH = path.join('.felix', 'workflows.snapshot.json');

export class WorkflowSnapshotService {
  constructor(private dbManager: DatabaseManager) {}

  private getConfigManager(): WorkflowConfigManager {
    const ds = this.dbManager.getMetadataDataSource();
    return new WorkflowConfigManager(ds);
  }

  private resolveSnapshotPath(projectPath: string, filePath?: string): string {
    if (filePath && path.isAbsolute(filePath)) {
      return filePath;
    }
    const relative = filePath || DEFAULT_SNAPSHOT_RELATIVE_PATH;
    return path.join(projectPath, relative);
  }

  async exportSnapshot(projectPath: string, options: { filePath?: string } = {}): Promise<WorkflowSnapshotExportResult> {
    const filePath = this.resolveSnapshotPath(projectPath, options.filePath);
    const mgr = this.getConfigManager();
    await mgr.initialize();

    const [workflows, config] = await Promise.all([
      mgr.listAvailableWorkflows(),
      mgr.getGlobalConfig()
    ]);

    const snapshot: WorkflowSnapshot = {
      version: 1,
      exported_at: new Date().toISOString(),
      workflows,
      config
    };

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf8');

    return {
      filePath,
      workflowCount: workflows.length,
      exportedAt: snapshot.exported_at
    };
  }

  async importSnapshot(
    projectPath: string,
    options: { filePath?: string; overwrite?: boolean } = {}
  ): Promise<WorkflowSnapshotImportResult> {
    const filePath = this.resolveSnapshotPath(projectPath, options.filePath);
    let contents: string;
    try {
      contents = await fs.readFile(filePath, 'utf8');
    } catch {
      throw new Error(`Workflow snapshot not found at ${filePath}`);
    }

    let snapshot: WorkflowSnapshot;
    try {
      snapshot = JSON.parse(contents) as WorkflowSnapshot;
    } catch (error) {
      throw new Error(`Invalid workflow snapshot JSON: ${(error as Error).message}`);
    }

    if (!Array.isArray(snapshot.workflows)) {
      throw new Error('Workflow snapshot missing workflows array');
    }

    const mgr = this.getConfigManager();
    await mgr.initialize();

    let created = 0;
    let updated = 0;
    for (const wf of snapshot.workflows) {
      if (!wf?.name) continue;
      const existing = await mgr.getWorkflowConfig(wf.name);
      if (existing) {
        if (options.overwrite === false) {
          continue;
        }
        await mgr.updateWorkflowConfig(wf.name, wf);
        updated++;
      } else {
        await mgr.createWorkflow(wf);
        created++;
      }
    }

    if (snapshot.config) {
      await mgr.updateGlobalConfig(snapshot.config);
    }

    return {
      filePath,
      workflowCount: snapshot.workflows.length,
      created,
      updated,
      appliedConfig: snapshot.config
    };
  }
}
