/**
 * MCP Handlers for Checklist Management
 */

import { projectManager } from './project-manager.js';

export interface ChecklistItem {
  text: string;
  checked: boolean;
  created_at: string;
  completed_at?: string;
}

export interface Checklist {
  name: string;
  items: ChecklistItem[];
  created_at: string;
  updated_at: string;
}

/**
 * Handle checklist operations
 */
export async function handleChecklistTools(args: any) {
  const { project, action, ...params } = args;
  
  const projectInfo = await projectManager.getProject(project);
  if (!projectInfo) {
    throw new Error(`Project not found: ${project}`);
  }

  switch (action) {
    case 'add': {
      const { task_id, name, items = [] } = params;
      if (!task_id || !name) {
        throw new Error('task_id and name are required for add action');
      }

      // Get the task
      const task = await projectInfo.codeIndexer.getTask(task_id);
      if (!task) {
        throw new Error(`Task not found: ${task_id}`);
      }

      // Create the checklist
      const checklist: Checklist = {
        name,
        items: items.map((text: string) => ({
          text,
          checked: false,
          created_at: new Date().toISOString()
        })),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Add to task's checklists
      const existingChecklists = (task as any).checklists || [];
      const updatedChecklists = [...existingChecklists, checklist];
      
      await projectInfo.codeIndexer.updateTask(task_id, {
        checklists: updatedChecklists
      } as any);

      return {
        content: [
          {
            type: 'text',
            text: `Checklist "${name}" added to task ${task_id}`
          }
        ]
      };
    }

    case 'update': {
      const { task_id, checklist_name, new_name, items } = params;
      if (!task_id || !checklist_name) {
        throw new Error('task_id and checklist_name are required for update action');
      }

      const task = await projectInfo.codeIndexer.getTask(task_id);
      if (!task) {
        throw new Error(`Task not found: ${task_id}`);
      }

      const checklists = (task as any).checklists || [];
      const checklistIndex = checklists.findIndex((c: Checklist) => 
        c.name === checklist_name
      );

      if (checklistIndex === -1) {
        throw new Error(`Checklist "${checklist_name}" not found in task ${task_id}`);
      }

      // Update the checklist
      const updatedChecklist = { ...checklists[checklistIndex] };
      if (new_name) {
        updatedChecklist.name = new_name;
      }
      if (items) {
        updatedChecklist.items = items.map((text: string) => ({
          text,
          checked: false,
          created_at: new Date().toISOString()
        }));
      }
      updatedChecklist.updated_at = new Date().toISOString();

      checklists[checklistIndex] = updatedChecklist;
      
      await projectInfo.codeIndexer.updateTask(task_id, {
        checklists
      } as any);

      return {
        content: [
          {
            type: 'text',
            text: `Checklist updated successfully`
          }
        ]
      };
    }

    case 'toggle_item': {
      const { task_id, checklist_name, item_index, item_text } = params;
      if (!task_id || !checklist_name || (item_index === undefined && !item_text)) {
        throw new Error('task_id, checklist_name, and either item_index or item_text are required');
      }

      const task = await projectInfo.codeIndexer.getTask(task_id);
      if (!task) {
        throw new Error(`Task not found: ${task_id}`);
      }

      const checklists = (task as any).checklists || [];
      const checklistIndex = checklists.findIndex((c: Checklist) => 
        c.name === checklist_name
      );

      if (checklistIndex === -1) {
        throw new Error(`Checklist "${checklist_name}" not found in task ${task_id}`);
      }

      const checklist = checklists[checklistIndex];
      let itemIndex = item_index;
      
      // Find by text if index not provided
      if (itemIndex === undefined && item_text) {
        itemIndex = checklist.items.findIndex((item: ChecklistItem) => 
          item.text.toLowerCase() === item_text.toLowerCase()
        );
        if (itemIndex === -1) {
          throw new Error(`Item "${item_text}" not found in checklist`);
        }
      }

      if (itemIndex < 0 || itemIndex >= checklist.items.length) {
        throw new Error(`Invalid item index: ${itemIndex}`);
      }

      // Toggle the item
      const item = checklist.items[itemIndex];
      item.checked = !item.checked;
      item.completed_at = item.checked ? new Date().toISOString() : undefined;
      checklist.updated_at = new Date().toISOString();
      
      await projectInfo.codeIndexer.updateTask(task_id, {
        checklists
      } as any);

      return {
        content: [
          {
            type: 'text',
            text: `Item "${item.text}" ${item.checked ? 'checked' : 'unchecked'}`
          }
        ]
      };
    }

    case 'add_item': {
      const { task_id, checklist_name, text, position } = params;
      if (!task_id || !checklist_name || !text) {
        throw new Error('task_id, checklist_name, and text are required');
      }

      const task = await projectInfo.codeIndexer.getTask(task_id);
      if (!task) {
        throw new Error(`Task not found: ${task_id}`);
      }

      const checklists = (task as any).checklists || [];
      const checklistIndex = checklists.findIndex((c: Checklist) => 
        c.name === checklist_name
      );

      if (checklistIndex === -1) {
        throw new Error(`Checklist "${checklist_name}" not found in task ${task_id}`);
      }

      const checklist = checklists[checklistIndex];
      const newItem: ChecklistItem = {
        text,
        checked: false,
        created_at: new Date().toISOString()
      };

      if (position !== undefined && position >= 0 && position <= checklist.items.length) {
        checklist.items.splice(position, 0, newItem);
      } else {
        checklist.items.push(newItem);
      }

      checklist.updated_at = new Date().toISOString();
      
      await projectInfo.codeIndexer.updateTask(task_id, {
        checklists
      } as any);

      return {
        content: [
          {
            type: 'text',
            text: `Item "${text}" added to checklist "${checklist_name}"`
          }
        ]
      };
    }

    case 'remove_item': {
      const { task_id, checklist_name, item_index, item_text } = params;
      if (!task_id || !checklist_name || (item_index === undefined && !item_text)) {
        throw new Error('task_id, checklist_name, and either item_index or item_text are required');
      }

      const task = await projectInfo.codeIndexer.getTask(task_id);
      if (!task) {
        throw new Error(`Task not found: ${task_id}`);
      }

      const checklists = (task as any).checklists || [];
      const checklistIndex = checklists.findIndex((c: Checklist) => 
        c.name === checklist_name
      );

      if (checklistIndex === -1) {
        throw new Error(`Checklist "${checklist_name}" not found in task ${task_id}`);
      }

      const checklist = checklists[checklistIndex];
      let itemIndex = item_index;
      
      // Find by text if index not provided
      if (itemIndex === undefined && item_text) {
        itemIndex = checklist.items.findIndex((item: ChecklistItem) => 
          item.text.toLowerCase() === item_text.toLowerCase()
        );
        if (itemIndex === -1) {
          throw new Error(`Item "${item_text}" not found in checklist`);
        }
      }

      if (itemIndex < 0 || itemIndex >= checklist.items.length) {
        throw new Error(`Invalid item index: ${itemIndex}`);
      }

      const removedItem = checklist.items.splice(itemIndex, 1)[0];

      checklist.updated_at = new Date().toISOString();
      
      await projectInfo.codeIndexer.updateTask(task_id, {
        checklists
      } as any);

      return {
        content: [
          {
            type: 'text',
            text: `Item "${removedItem.text}" removed from checklist`
          }
        ]
      };
    }

    case 'delete': {
      const { task_id, checklist_name } = params;
      if (!task_id || !checklist_name) {
        throw new Error('task_id and checklist_name are required');
      }

      const task = await projectInfo.codeIndexer.getTask(task_id);
      if (!task) {
        throw new Error(`Task not found: ${task_id}`);
      }

      const checklists = (task as any).checklists || [];
      const filteredChecklists = checklists.filter((c: Checklist) => 
        c.name !== checklist_name
      );

      if (filteredChecklists.length === checklists.length) {
        throw new Error(`Checklist "${checklist_name}" not found in task ${task_id}`);
      }
      
      await projectInfo.codeIndexer.updateTask(task_id, {
        checklists: filteredChecklists
      } as any);

      return {
        content: [
          {
            type: 'text',
            text: `Checklist "${checklist_name}" deleted from task ${task_id}`
          }
        ]
      };
    }

    case 'get_progress': {
      const { task_id, checklist_name } = params;
      if (!task_id) {
        throw new Error('task_id is required');
      }

      const task = await projectInfo.codeIndexer.getTask(task_id);
      if (!task) {
        throw new Error(`Task not found: ${task_id}`);
      }

      const checklists = (task as any).checklists || [];
      
      if (checklist_name) {
        // Get progress for specific checklist
        const checklist = checklists.find((c: Checklist) => 
          c.name === checklist_name
        );
        
        if (!checklist) {
          throw new Error(`Checklist "${checklist_name}" not found in task ${task_id}`);
        }

        const total = checklist.items.length;
        const completed = checklist.items.filter((item: ChecklistItem) => item.checked).length;
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                checklist: checklist_name,
                total_items: total,
                completed_items: completed,
                completion_percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
                items: checklist.items
              })
            }
          ]
        };
      } else {
        // Get progress for all checklists
        const progress = checklists.map((checklist: Checklist) => {
          const total = checklist.items.length;
          const completed = checklist.items.filter((item: ChecklistItem) => item.checked).length;
          
          return {
            name: checklist.name,
            total_items: total,
            completed_items: completed,
            completion_percentage: total > 0 ? Math.round((completed / total) * 100) : 0
          };
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                task_id,
                checklists: progress,
                overall_completion: progress.length > 0 
                  ? Math.round(
                      progress.reduce((sum: number, c: any) => sum + c.completion_percentage, 0) / progress.length
                    )
                  : 0
              })
            }
          ]
        };
      }
    }

    default:
      throw new Error(`Unknown checklist action: ${action}`);
  }
}