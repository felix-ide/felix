import { Command } from 'commander';
import path from 'path';
import { DatabaseManager } from '../../features/storage/DatabaseManager.js';
import { WorkflowSnapshotService } from '../../features/workflows/services/WorkflowSnapshotService.js';

interface SnapshotOptions {
  project?: string;
  file?: string;
  overwrite?: boolean;
}

async function resolveSnapshotService(projectPath?: string): Promise<{ service: WorkflowSnapshotService; projectPath: string }> {
  const resolvedProject = path.resolve(projectPath || process.cwd());
  const dbManager = DatabaseManager.getInstance(resolvedProject);
  await dbManager.initialize();
  const snapshotService = new WorkflowSnapshotService(dbManager);
  return { service: snapshotService, projectPath: resolvedProject };
}

export function createWorkflowsCommand(): Command {
  const command = new Command('workflows')
    .description('Manage workflow configurations');

  command
    .command('export')
    .description('Export workflows to a snapshot file')
    .option('-p, --project <path>', 'Project path (defaults to current working directory)')
    .option('-f, --file <path>', 'Snapshot file path (defaults to .felix/workflows.snapshot.json in the project)')
    .action(async (options: SnapshotOptions) => {
      const { service, projectPath } = await resolveSnapshotService(options.project);
      const result = await service.exportSnapshot(projectPath, { filePath: options.file });
      console.log(`✅ Exported ${result.workflowCount} workflow(s) to ${result.filePath}`);
    });

  command
    .command('import')
    .description('Import workflows from a snapshot file')
    .option('-p, --project <path>', 'Project path (defaults to current working directory)')
    .option('-f, --file <path>', 'Snapshot file path (defaults to .felix/workflows.snapshot.json in the project)')
    .option('-w, --overwrite', 'Overwrite existing workflows (default true)', true)
    .option('--no-overwrite', 'Do not overwrite existing workflows')
    .action(async (options: SnapshotOptions) => {
      const { service, projectPath } = await resolveSnapshotService(options.project);
      const result = await service.importSnapshot(projectPath, {
        filePath: options.file,
        overwrite: options.overwrite !== false
      });
      console.log(`✅ Imported ${result.workflowCount} workflow(s) from ${result.filePath}`);
      console.log(`   Created: ${result.created}, Updated: ${result.updated}`);
    });

  return command;
}
