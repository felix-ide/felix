/**
 * Notes Plugin
 * 
 * Provides note-taking and documentation functionality as a plugin
 */

import { FileText } from 'lucide-react';
import { SectionPlugin } from '../lib/plugin-system/types';
import { NotesSection } from '../features/notes/components/NotesSection';
import { useNotesStore } from '../features/notes/state/notesStore';

export const notesPlugin: SectionPlugin = {
  id: 'notes',
  name: 'Notes',
  description: 'Documentation and note management',
  version: '1.0.0',
  type: 'section',
  
  section: {
    icon: FileText,
    path: '/notes',
    component: NotesSection,
    layout: {
      showHeader: true,
      showSidebar: true,
      fullWidth: false
    }
  },
  
  store: useNotesStore as any,
  
  navigation: [
    {
      id: 'notes-all',
      label: 'All Notes',
      path: '/notes'
    },
    {
      id: 'notes-recent',
      label: 'Recent',
      path: '/notes?sort=recent'
    },
    {
      id: 'notes-archived',
      label: 'Archived',
      path: '/notes?archived=true'
    }
  ],
  
  initialize: async () => {
    console.log('Notes plugin initialized');
  },
  
  cleanup: async () => {
    console.log('Notes plugin cleanup');
  }
};
