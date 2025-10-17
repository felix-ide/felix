import { projectManager } from '../project-manager.js';
import path from 'path';
import fs from 'fs/promises';
import { DEFAULT_WORKFLOW_CONFIG } from '../../validation/WorkflowDefinitions.js';
import type { CreateTaskParams } from '../../types/WorkflowTypes.js';
import { handleTasksList } from './tasks.list.js';
import { createJsonContent, createTextContent, type TasksAddRequest, type TasksDeleteRequest, type TasksGetRequest, type TasksListRequest, type TasksSuggestNextRequest, type TasksToolRequest, type TasksUpdateRequest } from '../types/contracts.js';
import { TransitionGateError } from '../../features/workflows/errors/TransitionGateError.js';

export async function handleTasksTools(request: any) {
  const projectInfo = await projectManager.getProject(request.project);
  if (!projectInfo) {
    throw new Error(`Project not found: ${request.project}`);
  }

  const action = request.action;

  // Delegated compact list
  if (action === 'list') {
    return await handleTasksList(request as TasksListRequest);
  }

  switch (action) {
    case 'help': {
      const { HelpService } = await import('../../features/help/services/HelpService.js');
      const out = {
        tasks: HelpService.get('tasks'),
        checklists: HelpService.get('checklists'),
        notes: HelpService.get('notes'),
        workflows: HelpService.get('workflows')
      };
      return { content: [createJsonContent(out)] };
    }
    case 'create': {
      const params = request as TasksAddRequest & { checklists?: unknown; skip_validation?: boolean };
      const { 
        title, description, parent_id, task_type, task_status, task_priority,
        estimated_effort, actual_effort, due_date, assigned_to, entity_links,
        stable_tags, workflow, skip_validation
      } = params;

      if (!title) throw new Error('Title is required for add action');

      // Workflow inheritance: child tasks ALWAYS inherit parent's workflow
      let parentWorkflow: string | null = null;
      if (parent_id) {
        try {
          const parentTask = await projectInfo.codeIndexer.getTask(parent_id);
          if (parentTask && (parentTask as any).workflow) {
            parentWorkflow = (parentTask as any).workflow;
          }
        } catch {
          // Parent fetch failed, will use fallback logic
        }
      }

      const defaultWorkflow = parentWorkflow || workflow || (await (async () => {
        // No parent or couldn't fetch parent - use task type mapping or default
        try {
          const ds = (projectInfo as any).codeIndexer?.dbManager?.getMetadataDataSource?.();
          if (!ds) return DEFAULT_WORKFLOW_CONFIG.default_workflow;
          const { WorkflowConfigManager } = await import('../../storage/WorkflowConfigManager.js');
          const mgr = new WorkflowConfigManager(ds);
          await mgr.initialize();
          const byType = await mgr.getWorkflowForTaskType(task_type || '');
          return byType || await mgr.getDefaultWorkflow();
        } catch {
          return DEFAULT_WORKFLOW_CONFIG.default_workflow;
        }
      })());

      // Get initial status from workflow definition
      let defaultStatus = 'todo';
      if (!task_status) {
        try {
          const { WorkflowService } = await import('../../features/workflows/services/WorkflowService.js');
          const db: any = (projectInfo.codeIndexer as any).dbManager;
          const wfSvc = new WorkflowService(db);
          const workflowDef = await wfSvc.getWorkflowDefinition(defaultWorkflow);
          if (workflowDef?.status_flow?.initial_state) {
            defaultStatus = workflowDef.status_flow.initial_state;
          }
        } catch {
          // Failed to resolve initial status, use 'todo' as fallback
        }
      }

      const taskParams = {
        title,
        description,
        parent_id,
        task_type: task_type || 'task',
        task_status: task_status || defaultStatus,
        task_priority: task_priority || 'medium',
        estimated_effort,
        actual_effort,
        due_date,
        assigned_to,
        entity_links,
        stable_tags: stable_tags || [],
        workflow: defaultWorkflow,
        skip_validation,
        checklists: Array.isArray(params.checklists)
          ? params.checklists
          : typeof params.checklists === 'string'
            ? JSON.parse(params.checklists)
            : []
      } as unknown as CreateTaskParams & { checklists?: any[] };

      const newTask = await projectInfo.codeIndexer.addTask(taskParams as any);
      let responseText = `Task added with ID: ${newTask.id} (workflow: ${taskParams.workflow})`;

      // Notify if workflow was auto-corrected
      if (workflow && workflow !== defaultWorkflow) {
        responseText += `\n\n✓ Workflow auto-corrected from '${workflow}' to '${defaultWorkflow}' to match parent requirements.`;
      }

      // Generate comprehensive guidance
      const { GuidanceService } = await import('../../features/workflows/services/GuidanceService.js');
      const gsvc = new GuidanceService((projectInfo.codeIndexer as any).dbManager);
      const guidance = await gsvc.build(newTask as any);

      // Format guidance into actionable text instructions
      if (!skip_validation && !guidance.progress.is_minimum_met) {
        responseText += `\n\n━━━ MINIMUM REQUIREMENTS (${guidance.requirements.minimum.length}) ━━━\n`;
        responseText += `Progress: ${guidance.progress.completion_percentage.toFixed(0)}% complete\n`;
        responseText += `${guidance.instructions.summary}\n\n`;

        guidance.instructions.tool_calls.forEach((toolCall: any, i: number) => {
          responseText += `${i + 1}. ${toolCall.description.toUpperCase()}\n`;
          responseText += `   Tool: ${toolCall.tool}\n`;
          responseText += `   ${toolCall.notes}\n\n`;
          responseText += `   Example:\n`;
          const exampleLines = JSON.stringify(toolCall.params, null, 2).split('\n');
          exampleLines.forEach((line: string) => {
            responseText += `   ${line}\n`;
          });
          responseText += `\n`;
        });

        responseText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        responseText += `NOTE: These are MINIMUMS. Exceed them for production quality.\n`;

        if (guidance.tips && guidance.tips.length > 0) {
          responseText += `\nTIPS:\n`;
          guidance.tips.forEach((tip: string) => {
            responseText += `• ${tip}\n`;
          });
        }
      }

      return { content: [createTextContent(responseText), createJsonContent({ guidance })] };
    }

    case 'get': {
      const { task_id, include_notes = true, include_children = true, include_dependencies = false } = request as TasksGetRequest & { include_dependencies?: boolean };
      if (!task_id) throw new Error('Task ID is required for get action');
      const task = await projectInfo.codeIndexer.getTask(task_id);
      if (!task) throw new Error(`Task not found: ${task_id}`);

      const enhancedTask: any = { ...task };
      if (include_notes) {
        const notes = await projectInfo.codeIndexer.listNotes({ entity_type: 'task' as any, entity_id: task_id });
        if (notes.length > 0) enhancedTask.attached_notes = notes;
      }
      if (include_children) {
        const children = await projectInfo.codeIndexer.listTasks({ parent_id: task_id });
        if (children.length > 0) enhancedTask.child_tasks = children;
      }
      if (include_dependencies) {
        const dependencies = await projectInfo.codeIndexer.getTaskDependencies(task_id, 'both');
        if (dependencies) enhancedTask.dependencies = dependencies;
      }
      return { content: [createJsonContent(enhancedTask)] };
    }

    case 'update': {
      const { task_id, skip_validation, checklist_updates, dependency_updates, ...updateFields } = request as TasksUpdateRequest & Record<string, unknown>;
      if (!task_id) throw new Error('Task ID is required for update action');

      let hasUpdates = false;

      // Process dependency updates if provided
      if (dependency_updates && Array.isArray(dependency_updates)) {
        for (const update of dependency_updates) {
          const { operation, dependency_task_id, type, required } = update;

          if (operation === 'add') {
            if (!dependency_task_id) throw new Error('dependency_task_id is required for add operation');
            await projectInfo.codeIndexer.addTaskDependency({
              dependent_task_id: task_id,
              dependency_task_id,
              dependency_type: type || 'blocks',
              required: required !== false
            });
            hasUpdates = true;
          } else if (operation === 'remove') {
            if (!dependency_task_id) throw new Error('dependency_task_id is required for remove operation');
            // Remove using task IDs for intuitive usage
            await projectInfo.codeIndexer.removeTaskDependencyByTasks(task_id, dependency_task_id, type);
            hasUpdates = true;
          }
        }
      }

      // Process checklist updates if provided
      if (checklist_updates && Array.isArray(checklist_updates)) {
        const task = await projectInfo.codeIndexer.getTask(task_id);
        if (!task) throw new Error(`Task not found: ${task_id}`);

        const checklists = (task as any).checklists || [];

        for (const update of checklist_updates) {
          const { checklist: checklistName, operation, index, text, position, from, to } = update;
          const checklistIndex = checklists.findIndex((c: any) => c.name === checklistName);

          switch (operation) {
            case 'delete': {
              if (checklistIndex === -1) throw new Error(`Checklist "${checklistName}" not found`);
              checklists.splice(checklistIndex, 1);
              break;
            }
            case 'toggle': {
              if (checklistIndex === -1) throw new Error(`Checklist "${checklistName}" not found`);
              if (index === undefined || index < 0 || index >= checklists[checklistIndex].items.length) {
                throw new Error(`Invalid item index: ${index}`);
              }
              const item = checklists[checklistIndex].items[index];
              item.checked = !item.checked;
              item.completed_at = item.checked ? new Date().toISOString() : undefined;
              checklists[checklistIndex].updated_at = new Date().toISOString();
              break;
            }
            case 'add': {
              if (checklistIndex === -1) throw new Error(`Checklist "${checklistName}" not found`);
              if (!text) throw new Error('text is required for add operation');
              const newItem = {
                text,
                checked: false,
                created_at: new Date().toISOString()
              };
              const insertPos = position !== undefined && position >= 0 && position <= checklists[checklistIndex].items.length
                ? position
                : checklists[checklistIndex].items.length;
              checklists[checklistIndex].items.splice(insertPos, 0, newItem);
              checklists[checklistIndex].updated_at = new Date().toISOString();
              break;
            }
            case 'remove': {
              if (checklistIndex === -1) throw new Error(`Checklist "${checklistName}" not found`);
              if (index === undefined || index < 0 || index >= checklists[checklistIndex].items.length) {
                throw new Error(`Invalid item index: ${index}`);
              }
              checklists[checklistIndex].items.splice(index, 1);
              checklists[checklistIndex].updated_at = new Date().toISOString();
              break;
            }
            case 'move': {
              if (checklistIndex === -1) throw new Error(`Checklist "${checklistName}" not found`);
              if (from === undefined || to === undefined) throw new Error('from and to are required for move operation');
              const items = checklists[checklistIndex].items;
              if (from < 0 || from >= items.length || to < 0 || to >= items.length) {
                throw new Error(`Invalid move indices: from=${from}, to=${to}`);
              }
              const [movedItem] = items.splice(from, 1);
              items.splice(to, 0, movedItem);
              checklists[checklistIndex].updated_at = new Date().toISOString();
              break;
            }
            case 'update': {
              if (checklistIndex === -1) throw new Error(`Checklist "${checklistName}" not found`);
              if (index === undefined || index < 0 || index >= checklists[checklistIndex].items.length) {
                throw new Error(`Invalid item index: ${index}`);
              }
              if (!text) throw new Error('text is required for update operation');
              checklists[checklistIndex].items[index].text = text;
              checklists[checklistIndex].updated_at = new Date().toISOString();
              break;
            }
          }
        }

        // Apply the checklist changes
        await projectInfo.codeIndexer.updateTask(task_id, { checklists } as any);
        hasUpdates = true;
      }

      const updates: any = {};
      ['title','description','task_status','task_priority','task_type','assigned_to','estimated_effort','actual_effort','due_date','stable_tags','entity_links','parent_id','sort_order','transition_gate_token','transition_gate_response'].forEach(k => {
        if (updateFields[k] !== undefined) updates[k] = updateFields[k];
      });
      ['workflow','spec_state','spec_waivers','last_validated_at','validated_by','checklists'].forEach(k => {
        if (updateFields[k] !== undefined) updates[k] = updateFields[k];
      });

      // Apply other field updates if any exist
      let updatedTask: any = null;
      if (Object.keys(updates).length > 0) {
        hasUpdates = true;
      }

      // If no updates at all, error out
      if (!hasUpdates) {
        throw new Error('No updates provided');
      }

      try {
        if (Object.keys(updates).length > 0) {
          updatedTask = await projectInfo.codeIndexer.updateTask(task_id, updates);
        }
        let responseText = `Task ${task_id} updated successfully`;

        if (!skip_validation) {
          const fullTask = await projectInfo.codeIndexer.getTask(task_id);
          if (fullTask) {
            let taskWorkflow = (fullTask as any).workflow;
            if (!taskWorkflow) {
              try {
                const ds = (projectInfo as any).codeIndexer?.dbManager?.getMetadataDataSource?.();
                const { WorkflowConfigManager } = await import('../../storage/WorkflowConfigManager.js');
                const mgr = new WorkflowConfigManager(ds);
                await mgr.initialize();
                taskWorkflow = await mgr.getWorkflowForTaskType(fullTask.task_type) || await mgr.getDefaultWorkflow();
              } catch {
                taskWorkflow = DEFAULT_WORKFLOW_CONFIG.default_workflow;
              }
            }
            const { GuidanceService } = await import('../../features/workflows/services/GuidanceService.js');
            const db: any = (projectInfo.codeIndexer as any).dbManager;
            const guideSvc = new GuidanceService(db);
            const guidance = await guideSvc.build({ ...(fullTask as any), workflow: taskWorkflow } as any);

            // Format guidance if requirements remain
            if (!guidance.progress.is_minimum_met) {
              responseText += `\n\n━━━ REMAINING REQUIREMENTS (${guidance.requirements.minimum.length}) ━━━\n`;
              responseText += `Progress: ${guidance.progress.completion_percentage.toFixed(0)}% complete\n\n`;
              guidance.instructions.next_steps.forEach((step: string, i: number) => {
                responseText += `${i + 1}. ${step}\n`;
              });
              responseText += `\nSee guidance JSON for tool examples.`;
            } else {
              responseText += `\n\n✅ All minimum requirements met (${guidance.progress.completion_percentage.toFixed(0)}%)`;
            }

            return {
              content: [
                createTextContent(responseText),
                createJsonContent({ task: updatedTask, guidance })
              ]
            };
          }
        }
        const extraContent = [];
        if ((updatedTask as any).transition_prompt || (updatedTask as any).transition_bundle_results) {
          extraContent.push(createJsonContent({ task: updatedTask }));
          if ((updatedTask as any).transition_prompt) {
            responseText += `\n\n${(updatedTask as any).transition_prompt}`;
          }
        }
        return { content: [createTextContent(responseText), ...extraContent] };
      } catch (error) {
        if (error instanceof TransitionGateError) {
          const details = error.details;
          const prompt = details.prompt ? `\n\n${details.prompt}` : '';
          return {
            content: [
              createTextContent(`${error.message}${prompt}`.trim()),
              createJsonContent({ gate: details })
            ]
          };
        }
        throw error;
      }
    }

    case 'delete': {
      const { task_id } = request as TasksDeleteRequest;
      if (!task_id) throw new Error('Task ID is required for delete action');
      await projectInfo.codeIndexer.deleteTask(task_id);
      return { content: [createTextContent(`Task ${task_id} deleted successfully`)] };
    }

    case 'suggest_next': {
      const { limit: suggestLimit } = request as TasksSuggestNextRequest;
      const suggestions = await projectInfo.codeIndexer.getSuggestedTasks(suggestLimit || 10);
      return { content: [createJsonContent(suggestions)] };
    }

    default:
      throw new Error(`Unknown tasks action: ${(request as { action: string }).action}`);
  }
}
