/**
 * Tasks Plugin
 * 
 * Provides task management functionality as a plugin
 */

import { CheckSquare } from 'lucide-react';
import { SectionPlugin } from '../lib/plugin-system/types';
import { TasksSection } from '../features/tasks/components/TasksSection';
import { useTasksStore } from '../features/tasks/state/tasksStore';

export const tasksPlugin: SectionPlugin = {
  id: 'tasks',
  name: 'Tasks',
  description: 'Task management and tracking',
  version: '1.0.0',
  type: 'section',
  
  section: {
    icon: CheckSquare,
    path: '/tasks',
    component: TasksSection,
    layout: {
      showHeader: true,
      showSidebar: true,
      fullWidth: false
    }
  },
  
  store: useTasksStore as any,
  
  navigation: [
    {
      id: 'tasks-all',
      label: 'All Tasks',
      path: '/tasks'
    },
    {
      id: 'tasks-active',
      label: 'Active',
      path: '/tasks?status=active'
    },
    {
      id: 'tasks-completed',
      label: 'Completed',
      path: '/tasks?status=completed'
    }
  ],
  
  initialize: async () => {
    console.log('Tasks plugin initialized');
    // Load initial data if needed
  },
  
  cleanup: async () => {
    console.log('Tasks plugin cleanup');
    // Clean up any resources
  }
};