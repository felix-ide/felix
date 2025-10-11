import { projectManager } from '../project-manager.js';
import path from 'path';
import fs from 'fs/promises';
import { DEFAULT_WORKFLOW_CONFIG } from '../../validation/WorkflowDefinitions.js';
import type { CreateTaskParams } from '../../types/WorkflowTypes.js';
import { handleTasksList } from './tasks.list.js';
import { createJsonContent, createTextContent, type TasksAddDependencyRequest, type TasksAddRequest, type TasksDeleteRequest, type TasksGetDependenciesRequest, type TasksGetRequest, type TasksGetTreeRequest, type TasksListRequest, type TasksSuggestNextRequest, type TasksToolRequest, type TasksUpdateRequest } from '../types/contracts.js';
import { TransitionGateError } from '../../features/workflows/errors/TransitionGateError.js';

export async function handleTasksTools(request: TasksToolRequest) {
  const projectInfo = await projectManager.getProject(request.project);
  if (!projectInfo) {
    throw new Error(`Project not found: ${request.project}`);
  }

  // Delegated compact list
  if (request.action === 'list') {
    return await handleTasksList(request as TasksListRequest);
  }

  switch (request.action) {
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
    case 'add': {
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

      const taskParams = {
        title,
        description,
        parent_id,
        task_type: task_type || 'task',
        task_status: task_status || 'todo',
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

      if (!skip_validation) {
        const { WorkflowService } = await import('../../features/workflows/services/WorkflowService.js');
        const db: any = (projectInfo.codeIndexer as any).dbManager;
        const wfSvc = new WorkflowService(db);
        const validationStatus = await wfSvc.validate(newTask as any, (newTask as any).workflow);
        if (!validationStatus.is_valid) {
          responseText += `\n\n⚠️ WORKFLOW WARNING: Task violates user guidelines for task management.\n`;
          responseText += `Missing required components:\n`;
          validationStatus.missing_requirements.forEach((req: any) => { responseText += `- ${req.action_needed}\n`; });
          responseText += `\nAdd these immediately to comply with user expectations.`;
        }
      }

      const { GuidanceService } = await import('../../features/workflows/services/GuidanceService.js');
      const gsvc = new GuidanceService((projectInfo.codeIndexer as any).dbManager);
      const guidance = await gsvc.build(newTask as any);

      return { content: [createTextContent(responseText), createJsonContent({ guidance })] };
    }

    case 'get': {
      const { task_id, include_notes = true, include_children = true } = request as TasksGetRequest;
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
      return { content: [createJsonContent(enhancedTask)] };
    }

    case 'update': {
      const { task_id, skip_validation, ...updateFields } = request as TasksUpdateRequest & Record<string, unknown>;
      if (!task_id) throw new Error('Task ID is required for update action');

      const updates: any = {};
      ['title','description','task_status','task_priority','task_type','assigned_to','estimated_effort','actual_effort','due_date','stable_tags','entity_links','parent_id','sort_order','transition_gate_token','transition_gate_response'].forEach(k => {
        if (updateFields[k] !== undefined) updates[k] = updateFields[k];
      });
      ['workflow','spec_state','spec_waivers','last_validated_at','validated_by','checklists'].forEach(k => {
        if (updateFields[k] !== undefined) updates[k] = updateFields[k];
      });

      try {
        const updatedTask = await projectInfo.codeIndexer.updateTask(task_id, updates);
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
            const { WorkflowService } = await import('../../features/workflows/services/WorkflowService.js');
            const { GuidanceService } = await import('../../features/workflows/services/GuidanceService.js');
            const db: any = (projectInfo.codeIndexer as any).dbManager;
            const wfSvc = new WorkflowService(db);
            const guideSvc = new GuidanceService(db);
            const validationStatus = await wfSvc.validate(fullTask as any, taskWorkflow);
            const guidance = await guideSvc.build({ ...(fullTask as any), workflow: taskWorkflow } as any);
            if (!validationStatus.is_valid) responseText += `\n\n⚠️ WORKFLOW WARNING: Missing items remain. See guidance JSON for exact actions.`;
            return {
              content: [
                createTextContent(responseText),
                createJsonContent({ task: updatedTask, validation: validationStatus, guidance })
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

    case 'get_tree': {
      const { root_task_id, include_completed } = request as TasksGetTreeRequest;
      const taskTree = await projectInfo.codeIndexer.getTaskTreeSummary(root_task_id, include_completed !== false);
      return { content: [createJsonContent(taskTree)] };
    }

    case 'get_dependencies': {
      const { task_id, direction } = request as TasksGetDependenciesRequest;
      if (!task_id) throw new Error('Task ID is required for get_dependencies action');
      const dependencies = await projectInfo.codeIndexer.getTaskDependencies(task_id, direction || 'both');
      return { content: [createJsonContent(dependencies)] };
    }

    case 'add_dependency': {
      const { dependent_task_id, dependency_task_id, dependency_type, required } = request as TasksAddDependencyRequest;
      if (!dependent_task_id || !dependency_task_id) throw new Error('Both dependent_task_id and dependency_task_id are required');
      const created = await projectInfo.codeIndexer.addTaskDependency({
        dependent_task_id,
        dependency_task_id,
        dependency_type: dependency_type || 'blocks',
        required: required !== false
      });
      return { content: [createJsonContent({ message: 'Task dependency added', dependency: created })] };
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
