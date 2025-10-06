/**
 * Search Plugin
 * 
 * Provides code search and exploration functionality as a plugin
 */

import { Search } from 'lucide-react';
import { SectionPlugin } from '../lib/plugin-system/types';
import { ExploreSection } from '../features/search/components/ExploreSection';

export const searchPlugin: SectionPlugin = {
  id: 'search',
  name: 'Search & Explore',
  description: 'Semantic code search and exploration',
  version: '1.0.0',
  type: 'section',
  
  section: {
    icon: Search,
    path: '/explore',
    component: ExploreSection,
    layout: {
      showHeader: true,
      showSidebar: false, // Full width for search
      fullWidth: true
    }
  },
  
  navigation: [
    {
      id: 'search-code',
      label: 'Search Code',
      path: '/explore'
    }
  ],
  
  initialize: async () => {
    console.log('Search plugin initialized');
  },
  
  cleanup: async () => {
    console.log('Search plugin cleanup');
  }
};
